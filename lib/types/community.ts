export type AnnouncementStatus = "draft" | "published" | "archived";

export type AnnouncementRow = {
  id: string;
  title: string;
  body: string | null;
  image_url: string | null;
  status: AnnouncementStatus;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EventCategory = "social" | "official" | "wellness" | "other";

export type CommunityEventRow = {
  id: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  category: EventCategory;
  image_url: string | null;
  rsvp_count: number;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type FinanceKind = "income" | "expense" | "transfer";

export type FinanceTransactionRow = {
  id: string;
  occurred_on: string;
  kind: FinanceKind;
  category: string;
  description: string;
  amount_cents: number;
  created_at: string;
  entered_by_user_id: string | null;
  entered_by_name: string | null;
  unit_no: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
};

export type DuesFrequency = "monthly" | "quarterly" | "annual" | "custom";

export type HoaDashboardMetricsRow = {
  id: number;
  total_residents: number;
  resident_growth_pct: number | null;
  outstanding_dues_cents: number;
  overdue_accounts: number;
  fiscal_period_label: string | null;
  reserve_fund_cents: number;
  satisfaction_pct: number;
  pulse_note: string | null;
  updated_at: string;
  total_units: number | null;
  hoa_fee_amount_cents: number | null;
  hoa_due_day_of_month: number | null;
  dues_frequency: DuesFrequency | null;
  dues_schedule_note: string | null;
  payment_methods_note: string | null;
  late_fee_policy_note: string | null;
};

/** Billing fields safe to show on the public payment page (no internal dashboard-only numbers). */
export type PublicDuesDisplay = {
  hoa_fee_amount_cents: number | null;
  hoa_due_day_of_month: number | null;
  dues_frequency: DuesFrequency | null;
  dues_schedule_note: string | null;
  payment_methods_note: string | null;
  late_fee_policy_note: string | null;
};

export const EVENT_CATEGORY_LABELS: Record<EventCategory, string> = {
  social: "Social",
  official: "Official",
  wellness: "Wellness",
  other: "Other",
};

export const ANNOUNCEMENT_STATUS_LABELS: Record<AnnouncementStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};
