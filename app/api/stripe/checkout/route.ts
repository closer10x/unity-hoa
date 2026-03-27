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

  const supabaseUser = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabaseUser.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabaseUser
    .from("profiles")
    .select("unit_lot")
    .eq("id", user.id)
    .maybeSingle();

  const service = requireServiceSupabase();

  // #region agent log
  fetch("http://127.0.0.1:7297/ingest/96803dcb-0174-4956-a879-376da8f573e0", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "8420c0",
    },
    body: JSON.stringify({
      sessionId: "8420c0",
      runId: "pre-fix",
      hypothesisId: "H3",
      location: "app/api/stripe/checkout/route.ts:before-insert",
      message: "checkout insert prerequisites",
      data: { amountCents: parsed.cents, hasUnitLot: profile?.unit_lot != null },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  const { data: paymentRow, error: insertError } = await service
    .from("resident_payments")
    .insert({
      user_id: user.id,
      amount_cents: parsed.cents,
      currency: "usd",
      status: "pending",
      unit_lot: profile?.unit_lot ?? null,
    })
    .select("id")
    .single();

  if (insertError || !paymentRow) {
    // #region agent log
    fetch("http://127.0.0.1:7297/ingest/96803dcb-0174-4956-a879-376da8f573e0", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Debug-Session-Id": "8420c0",
      },
      body: JSON.stringify({
        sessionId: "8420c0",
        runId: "pre-fix",
        hypothesisId: "H1-H2-H3",
        location: "app/api/stripe/checkout/route.ts:insert-failed",
        message: "resident_payments insert failed",
        data: {
          hasRow: Boolean(paymentRow),
          errCode: insertError?.code ?? null,
          errMessage: insertError?.message ?? null,
          errDetails: insertError?.details ?? null,
          errHint: insertError?.hint ?? null,
        },
        timestamp: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    console.error("resident_payments insert:", insertError);

    const missingPaymentsTable =
      insertError?.code === "PGRST205" &&
      typeof insertError?.message === "string" &&
      insertError.message.includes("resident_payments");

    if (missingPaymentsTable) {
      return NextResponse.json(
        {
          error:
            "Payment database tables are missing. In Supabase → SQL, run supabase/migrations/20260331120000_resident_payments_stripe.sql (or the updated supabase/manual_apply_all_migrations.sql), then retry.",
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

  // #region agent log
  fetch("http://127.0.0.1:7297/ingest/96803dcb-0174-4956-a879-376da8f573e0", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "8420c0",
    },
    body: JSON.stringify({
      sessionId: "8420c0",
      runId: "pre-fix",
      hypothesisId: "H4",
      location: "app/api/stripe/checkout/route.ts:insert-ok",
      message: "resident_payments row created",
      data: { paymentIdPrefix: String(paymentId).slice(0, 8) },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion

  try {
    const stripe = getStripe();
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
      metadata: {
        payment_id: paymentId,
        user_id: user.id,
      },
      payment_intent_data: {
        metadata: {
          payment_id: paymentId,
          user_id: user.id,
        },
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
