export function getStripeSecretKey(): string | undefined {
  return process.env.STRIPE_SECRET_KEY?.trim();
}

export function getStripeWebhookSecret(): string | undefined {
  return process.env.STRIPE_WEBHOOK_SECRET?.trim();
}

export function getStripePublishableKey(): string | undefined {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
}

/**
 * Base URL for Stripe success/cancel redirects and webhook construction.
 * Prefer explicit NEXT_PUBLIC_SITE_URL; fall back to Vercel preview URL.
 */
export function getSiteUrl(): string | undefined {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }
  return undefined;
}

export function isStripeConfigured(): boolean {
  return Boolean(getStripeSecretKey());
}

export function isStripeWebhookConfigured(): boolean {
  return Boolean(getStripeSecretKey() && getStripeWebhookSecret());
}

/** True when secret key is a Stripe test key (`sk_test_…`). */
export function isStripeTestMode(): boolean {
  const k = getStripeSecretKey();
  return typeof k === "string" && k.startsWith("sk_test_");
}
