import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripeWebhookSecret, isStripeWebhookConfigured } from "@/lib/stripe/keys";
import { getStripe } from "@/lib/stripe/server";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireServiceSupabase } from "@/lib/supabase/service";

export const runtime = "nodejs";

function paymentIntentId(
  session: Stripe.Checkout.Session,
): string | null {
  const pi = session.payment_intent;
  if (typeof pi === "string") {
    return pi;
  }
  if (pi && typeof pi === "object" && "id" in pi) {
    return (pi as Stripe.PaymentIntent).id;
  }
  return null;
}

export async function POST(request: Request) {
  if (!isStripeWebhookConfigured()) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 503 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured" },
      { status: 503 },
    );
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const webhookSecret = getStripeWebhookSecret()!;
  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (err) {
    console.error("Stripe webhook signature:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const service = requireServiceSupabase();

  try {
    const { data: existing } = await service
      .from("stripe_webhook_events")
      .select("id")
      .eq("id", event.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const intentId = paymentIntentId(session);
        const nextStatus =
          session.payment_status === "paid" ? "paid" : "processing";
        const { error } = await service
          .from("resident_payments")
          .update({
            status: nextStatus,
            stripe_payment_intent_id: intentId,
          })
          .eq("stripe_checkout_session_id", session.id);
        if (error) {
          console.error("checkout.session.completed update:", error);
        }
        break;
      }
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const intentId = paymentIntentId(session);
        const { error } = await service
          .from("resident_payments")
          .update({
            status: "paid",
            stripe_payment_intent_id: intentId,
          })
          .eq("stripe_checkout_session_id", session.id);
        if (error) {
          console.error("checkout.session.async_payment_succeeded update:", error);
        }
        break;
      }
      case "checkout.session.async_payment_failed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { error } = await service
          .from("resident_payments")
          .update({ status: "failed" })
          .eq("stripe_checkout_session_id", session.id);
        if (error) {
          console.error("checkout.session.async_payment_failed update:", error);
        }
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { error } = await service
          .from("resident_payments")
          .update({ status: "expired" })
          .eq("stripe_checkout_session_id", session.id);
        if (error) {
          console.error("checkout.session.expired update:", error);
        }
        break;
      }
      case "payment_intent.succeeded": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const paymentId = intent.metadata?.payment_id;
        if (paymentId) {
          const { error } = await service
            .from("resident_payments")
            .update({
              status: "paid",
              stripe_payment_intent_id: intent.id,
            })
            .eq("id", paymentId);
          if (error) {
            console.error("payment_intent.succeeded update:", error);
          }
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const paymentId = intent.metadata?.payment_id;
        if (paymentId) {
          const { error } = await service
            .from("resident_payments")
            .update({ status: "failed" })
            .eq("id", paymentId);
          if (error) {
            console.error("payment_intent.payment_failed update:", error);
          }
        }
        break;
      }
      default:
        break;
    }

    const { error: recordError } = await service
      .from("stripe_webhook_events")
      .insert({ id: event.id, type: event.type });
    if (recordError?.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    if (recordError) {
      console.error("stripe_webhook_events insert:", recordError);
      return NextResponse.json(
        { error: "Could not record webhook event" },
        { status: 500 },
      );
    }
  } catch (e) {
    console.error("Stripe webhook handler:", e);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
