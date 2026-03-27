type Props = {
  error?: string | null;
  notice?: string | null;
};

const ERROR_COPY: Record<string, string> = {
  config:
    "Supabase sign-in is not configured. Add NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
  credentials: "Invalid email or password.",
  forbidden: "This account is not authorized for the admin portal.",
  db_setup: [
    "App tables are not on this Supabase project yet.",
    "",
    "1. Supabase → SQL → run each file in supabase/migrations/ in filename order (or locally: supabase link, then supabase db push).",
    "2. Authentication → Users → copy your user UUID, then in SQL Editor:",
    "   update public.profiles set role = 'admin' where id = 'YOUR_UUID';",
  ].join("\n"),
  profile_error:
    "We could not load your profile from the database. Check Supabase status and try again.",
  missing: "Enter your email and password.",
  missing_email: "Enter the email address for password reset.",
  auth: "Sign-in link expired or is invalid. Try again.",
};

const NOTICE_COPY: Record<string, string> = {
  reset_sent: "If an account exists for that email, you will receive a reset link shortly.",
};

export function AdminLoginMessages({ error, notice }: Props) {
  const errorText = error ? (ERROR_COPY[error] ?? error) : null;
  const noticeText = notice ? (NOTICE_COPY[notice] ?? notice) : null;

  return (
    <>
      {errorText ? (
        <p
          className="mb-6 rounded-lg bg-error-container/30 text-error text-sm px-4 py-3 whitespace-pre-line"
          role="alert"
        >
          {errorText}
        </p>
      ) : null}
      {noticeText ? (
        <p className="mb-6 rounded-lg bg-secondary-container/30 text-on-surface text-sm px-4 py-3">
          {noticeText}
        </p>
      ) : null}
    </>
  );
}
