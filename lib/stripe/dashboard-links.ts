import { isStripeTestMode } from "@/lib/stripe/keys";

/** Stripe Dashboard deep link for a PaymentIntent / charge. */
export function stripeDashboardPaymentUrl(paymentIntentId: string): string {
  const prefix = isStripeTestMode() ? "https://dashboard.stripe.com/test" : "https://dashboard.stripe.com";
  return `${prefix}/payments/${paymentIntentId}`;
}
