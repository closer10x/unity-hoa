import Stripe from "stripe";

import { getStripeSecretKey } from "@/lib/stripe/keys";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  if (stripeSingleton) {
    return stripeSingleton;
  }
  const secret = getStripeSecretKey();
  if (!secret) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }
  stripeSingleton = new Stripe(secret, {
    apiVersion: "2025-08-27.basil",
    typescript: true,
  });
  return stripeSingleton;
}
