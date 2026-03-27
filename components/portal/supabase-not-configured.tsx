export function SupabaseNotConfigured() {
  return (
    <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-6 max-w-2xl">
      <h2 className="font-headline text-lg font-bold text-on-surface mb-2">
        Supabase is not configured
      </h2>
      <p className="text-sm text-on-surface-variant mb-4">
        Add <code className="text-xs bg-surface-container-highest px-1 rounded">NEXT_PUBLIC_SUPABASE_URL</code>,{" "}
        <code className="text-xs bg-surface-container-highest px-1 rounded">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
        (admin sign-in), and{" "}
        <code className="text-xs bg-surface-container-highest px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
        to <code className="text-xs bg-surface-container-highest px-1 rounded">.env.local</code>, then run the SQL
        migrations under <code className="text-xs bg-surface-container-highest px-1 rounded">supabase/migrations/</code>{" "}
        in the Supabase SQL editor (maintenance first, then profiles/settings).
      </p>
      <p className="text-xs text-on-surface-variant">
        The migration creates tables and the private <code className="bg-surface-container-highest px-1 rounded">work-order-images</code>{" "}
        storage bucket.
      </p>
    </div>
  );
}
