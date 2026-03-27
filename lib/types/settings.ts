export type ProfileRole = "admin" | "basic";

export type CommunitySettingsRow = {
  id: number;
  association_name: string | null;
  support_email: string | null;
  timezone: string | null;
  mailing_address: string | null;
  allow_resident_directory: boolean;
  updated_at: string;
};

export type NotificationPreferencesRow = {
  user_id: string;
  announcements: boolean;
  maintenance_updates: boolean;
  billing_reminders: boolean;
  events: boolean;
  email_announcements: boolean;
  email_maintenance_updates: boolean;
  email_events: boolean;
  email_billing_reminders: boolean;
  updated_at: string;
};
