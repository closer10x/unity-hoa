#!/usr/bin/env node
/**
 * Verifies Stripe keys, webhook secret, site URL, and Supabase resident_payments schema.
 * Run: npm run verify:payments
 *
 * Does not charge a card; use Stripe test mode + a real checkout in the app for an end-to-end test.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import Stripe from "stripe";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");
const migrationsDir = resolve(root, "supabase/migrations");

function parseEnvFile(content) {
  const out = {};
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function fail(msg) {
  console.error(`\x1b[31m✖\x1b[0m ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}

function warn(msg) {
  console.log(`\x1b[33m!\x1b[0m ${msg}`);
}

if (!existsSync(envPath)) {
  fail(`Missing .env.local (copy from .env.example): ${envPath}`);
}

const env = parseEnvFile(readFileSync(envPath, "utf8"));
const stripeSecret = env.STRIPE_SECRET_KEY?.trim();
const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim();
const publishable = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
const siteUrl = env.NEXT_PUBLIC_SITE_URL?.trim();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!stripeSecret) fail("STRIPE_SECRET_KEY is missing");
if (!webhookSecret) fail("STRIPE_WEBHOOK_SECRET is missing (webhook updates will not work)");
if (!webhookSecret.startsWith("whsec_")) {
  warn("STRIPE_WEBHOOK_SECRET does not start with whsec_ — double-check Dashboard or `stripe listen` output");
}
if (!publishable) fail("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing");
if (!siteUrl) {
  warn("NEXT_PUBLIC_SITE_URL is missing — set it for local dev (e.g. http://localhost:3000)");
} else {
  ok(`NEXT_PUBLIC_SITE_URL is set`);
}

try {
  const stripe = new Stripe(stripeSecret);
  const bal = await stripe.balance.retrieve();
  ok(
    `Stripe API OK (${stripeSecret.startsWith("sk_test_") ? "test" : "live"} mode; ${Object.keys(bal ?? {}).length ? "balance retrieved" : "ok"})`,
  );
} catch (e) {
  fail(`Stripe API error: ${e?.message ?? e}`);
}

if (!supabaseUrl || !serviceKey) {
  warn("Skipping resident_payments REST probe (Supabase URL or service role missing)");
} else {
  let base;
  try {
    base = new URL(supabaseUrl).origin;
  } catch {
    fail("NEXT_PUBLIC_SUPABASE_URL is not a valid URL");
  }
  const payUrl = `${base}/rest/v1/resident_payments?select=id,unit_lot,status&limit=1`;
  const payRes = await fetch(payUrl, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: "application/json",
    },
  });
  if (payRes.status === 200) {
    ok("resident_payments table reachable (service role REST)");
  } else {
    const body = await payRes.text().catch(() => "");
    fail(
      `resident_payments probe HTTP ${payRes.status}: ${body.slice(0, 400)}. Apply SQL in supabase/migrations/20260331120000_resident_payments_stripe.sql (and payer/paid_at migrations) in Supabase SQL Editor.`,
    );
  }
}

if (existsSync(migrationsDir)) {
  const files = readdirSync(migrationsDir).filter((f) => f.includes("resident_payments"));
  ok(`Repo migrations mentioning resident_payments: ${files.length ? files.join(", ") : "(none found)"}`);
}

console.log(
  "\nConfigure Stripe Dashboard → Webhooks → endpoint URL: <your-origin>/api/stripe/webhook (same signing secret as STRIPE_WEBHOOK_SECRET).",
);
console.log("End-to-end: sign in, submit /payment checkout in test mode, confirm row reaches paid in admin Finances.\n");
