import { NextResponse } from "next/server";

import {
  parseCheckoutPayer,
  stripePayerMetadata,
} from "@/lib/payments/checkout-payer";
import { parseAmountToCents } from "@/lib/payments/parse-amount";
import { isSupabaseConfigured } from "@/lib/supabase/server";
import { requireServiceSupabase } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";
import { getSiteUrl, isStripeConfigured } from "@/lib/stripe/keys";
import { getStripe } from "@/lib/stripe/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 503 },
    );
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Database is not configured" },
      { status: 503 },
    );
  }

  const siteUrl = getSiteUrl();
  if (!siteUrl) {
    return NextResponse.json(
      {
        error:
          "Set NEXT_PUBLIC_SITE_URL (or deploy on Vercel) for payment redirects",
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const amountRaw =
    body && typeof body === "object" && "amount" in body
      ? (body as { amount: unknown }).amount
      : undefined;

  const parsed = parseAmountToCents(amountRaw);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const payerResult = parseCheckoutPayer(body);
  if (!payerResult.ok) {
    return NextResponse.json({ error: payerResult.error }, { status: 400 });
  }
  const payer = payerResult.value;

  const supabaseUser = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = requireServiceSupabase();

  const { data: paymentRow, error: insertError } = await service
    .from("resident_payments")
    .insert({
      user_id: user.id,
      amount_cents: parsed.cents,
      currency: "usd",
      status: "pending",
      unit_lot: payer.unitNumber,
      payer_first_name: payer.firstName,
      payer_last_name: payer.lastName,
      payer_phone: payer.phone,
    })
    .select("id")
    .single();

  if (insertError || !paymentRow) {
    console.error("resident_payments insert:", insertError);

    const residentPaymentsSchemaMissing =
      insertError &&
      typeof insertError.message === "string" &&
      insertError.message.includes("resident_payments") &&
      (insertError.code === "PGRST205" || insertError.code === "PGRST204");

    if (residentPaymentsSchemaMissing) {
      return NextResponse.json(
        {
          error:
            "Payment database tables or columns are missing. In Supabase → SQL, run supabase/migrations/20260331120000_resident_payments_stripe.sql and 20260331130000_resident_payments_payer_fields.sql (or the updated supabase/manual_apply_all_migrations.sql), then retry.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      { error: "Could not start payment" },
      { status: 500 },
    );
  }

  const paymentId = paymentRow.id as string;

  const stripeMeta = stripePayerMetadata(paymentId, user.id, payer);
  const customerEmail =
    typeof user.email === "string" && user.email.trim().length > 0
      ? user.email.trim()
      : undefined;

  try {
    const stripe = getStripe();
    // Stripe: client_reference_id max 200 chars (UUID is fine).
    // https://docs.stripe.com/api/checkout/sessions/create
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card", "us_bank_account"],
      payment_method_options: {
        us_bank_account: {
          financial_connections: {
            permissions: ["payment_method"],
          },
        },
      },
      client_reference_id: paymentId,
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: parsed.cents,
            product_data: {
              name: "Association dues",
              description: "Unity HOA Management — resident payment",
            },
          },
        },
      ],
      success_url: `${siteUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/payment?canceled=1`,
      metadata: stripeMeta,
      // Session metadata does not automatically populate the PaymentIntent; set both.
      payment_intent_data: {
        metadata: { ...stripeMeta },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Checkout session missing URL" },
        { status: 500 },
      );
    }

    const { error: updateError } = await service
      .from("resident_payments")
      .update({
        stripe_checkout_session_id: session.id,
        status: "processing",
      })
      .eq("id", paymentId);

    if (updateError) {
      console.error("resident_payments session update:", updateError);
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    console.error("Stripe checkout.sessions.create:", e);
    await service
      .from("resident_payments")
      .update({ status: "failed" })
      .eq("id", paymentId);
    return NextResponse.json(
      { error: "Could not create checkout session" },
      { status: 500 },
    );
  }
}
