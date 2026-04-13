export type ResidentPaymentStatus =
  | "pending"
  | "processing"
  | "paid"
  | "failed"
  | "expired"
  | "canceled";

export type ResidentPaymentAdminRow = {
  id: string;
  user_id: string;
  amount_cents: number;
  currency: string;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  status: ResidentPaymentStatus;
  unit_lot: string | null;
  payer_first_name: string | null;
  payer_last_name: string | null;
  payer_phone: string | null;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
};

export type StripeWebhookEventRow = {
  id: string;
  type: string;
  received_at: string;
};

export type ProfileUnitDirectoryRow = {
  id: string;
  display_name: string | null;
  phone: string | null;
  unit_lot: string | null;
  role: string;
};
