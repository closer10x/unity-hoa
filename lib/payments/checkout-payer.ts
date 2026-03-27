const MAX_NAME_LEN = 100;
const MAX_UNIT_LEN = 100;
const MAX_PHONE_LEN = 40;
/**
 * Stripe metadata limits (see https://docs.stripe.com/metadata ):
 * up to 50 keys, key max 40 chars, value max 500 chars; string values only.
 */
const MAX_STRIPE_META_VALUE = 500;

export type CheckoutPayerInput = {
  firstName: string;
  lastName: string;
  unitNumber: string;
  phone: string | null;
};

export type CheckoutPayerParseResult =
  | { ok: true; value: CheckoutPayerInput }
  | { ok: false; error: string };

function trimToMax(s: string, maxLen: number): string {
  const t = s.trim();
  return t.length <= maxLen ? t : t.slice(0, maxLen);
}

function clipStripeValue(s: string): string {
  if (s.length <= MAX_STRIPE_META_VALUE) return s;
  return s.slice(0, MAX_STRIPE_META_VALUE);
}

/**
 * Validates payer fields from the checkout POST body.
 */
export function parseCheckoutPayer(body: unknown): CheckoutPayerParseResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid request body" };
  }

  const o = body as Record<string, unknown>;

  const firstRaw = o.firstName;
  const lastRaw = o.lastName;
  const unitRaw = o.unitNumber;
  const phoneRaw = o.phone;

  if (typeof firstRaw !== "string" || typeof lastRaw !== "string") {
    return { ok: false, error: "First and last name are required" };
  }
  if (typeof unitRaw !== "string") {
    return { ok: false, error: "Unit or account number is required" };
  }

  const firstName = trimToMax(firstRaw, MAX_NAME_LEN);
  const lastName = trimToMax(lastRaw, MAX_NAME_LEN);
  const unitNumber = trimToMax(unitRaw, MAX_UNIT_LEN);

  if (!firstName) {
    return { ok: false, error: "First name is required" };
  }
  if (!lastName) {
    return { ok: false, error: "Last name is required" };
  }
  if (!unitNumber) {
    return { ok: false, error: "Unit or account number is required" };
  }

  let phone: string | null = null;
  if (phoneRaw !== undefined && phoneRaw !== null) {
    if (typeof phoneRaw !== "string") {
      return { ok: false, error: "Phone must be text" };
    }
    const p = trimToMax(phoneRaw, MAX_PHONE_LEN);
    phone = p.length > 0 ? p : null;
  }

  return {
    ok: true,
    value: { firstName, lastName, unitNumber, phone },
  };
}

/**
 * Metadata for Stripe Checkout Session and PaymentIntent (string values only).
 */
export function stripePayerMetadata(
  paymentId: string,
  userId: string,
  payer: CheckoutPayerInput,
): Record<string, string> {
  const meta: Record<string, string> = {
    payment_id: clipStripeValue(paymentId),
    user_id: clipStripeValue(userId),
    payer_first_name: clipStripeValue(payer.firstName),
    payer_last_name: clipStripeValue(payer.lastName),
    unit_lot: clipStripeValue(payer.unitNumber),
  };
  if (payer.phone) {
    meta.payer_phone = clipStripeValue(payer.phone);
  }
  return meta;
}
