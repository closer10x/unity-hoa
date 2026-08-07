/**
 * DEV AUDIT. Probes every table the two portals read or write, using the same
 * column lists the loaders select — a missing table or renamed column fails
 * loudly here before a user sees a blank section.
 *
 * Run from the repo root: node scripts/audit-db-wiring.mjs
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let pass = 0, fail = 0;

/** Probe a table with the columns a loader actually selects. */
async function probe(section, table, columns) {
  const { count, error } = await db
    .from(table)
    .select(columns, { count: "exact", head: true });
  if (error) {
    fail++;
    console.log(`✗ ${section} → ${table}: ${error.code ?? ""} ${error.message}`);
  } else {
    pass++;
    console.log(`✓ ${section} → ${table} (${count} rows)`);
  }
}

console.log("═══ Admin portal reads ═══");
await probe("Owners", "lots", "id, community, lot_number, block, street_number, street_name, city, state, zip, owner_profile_id");
await probe("Owners", "profiles", "id, display_name, phone, role, staff_role, section_access, communities, unit_lot, avatar_path");
await probe("Work orders", "work_orders", "id, work_order_number, title, description, location, category, priority, status, reported_by_name, reported_by_email, assigned_to, due_at, created_at");
await probe("Work orders", "employees", "id, name, role, email, phone, active, communities");
await probe("Work orders", "work_order_notes", "id, work_order_id, body, created_at");
await probe("Work orders", "crew_links", "id, token");
await probe("Documents", "documents", "id, title, category_id, file_path, file_name, file_size_bytes, file_type, access_level, is_archived, uploaded_at");
await probe("Documents", "document_categories", "id, name, sort_order");
await probe("Calendar", "community_events", "id, title, description, starts_at, ends_at, location, category, published");
await probe("Accounting", "finance_transactions", "id, occurred_on, kind, category, description, amount_cents, lot_id, unit_no, customer_first_name, customer_last_name");
await probe("Accounting", "resident_payments", "id, user_id, amount_cents, status, unit_lot, created_at");
await probe("Accounting", "bank_accounts", "id");
await probe("Accounting", "plaid_items", "id");
await probe("Accounting", "fee_schedule", "id, community, name, amount_cents, category, note, active, sort");
await probe("Dashboard", "hoa_dashboard_metrics", "id, total_units, hoa_fee_amount_cents, hoa_due_day_of_month, dues_frequency");
await probe("Violations", "violations", "id, reference, community, address, violation_type, source, inspector, cure_days, opened_on, status, notes");
await probe("Violations", "violation_mailings", "id, violation_id, kind, method, sent_on, tracking, delivery_status");
await probe("Violations", "violation_notes", "id, violation_id, body, author_name");
await probe("Violations", "violation_photos", "id, violation_id, storage_path");
await probe("Architectural", "arc_applications", "id, reference, title, owner_name, address, project_type, contractor, submitted_on, due_on, status, decision_note");
await probe("Architectural", "arc_messages", "id, application_id, body, author_name, audience, attachment_path");
await probe("Bookings", "bookings", "id, resident_name, amenity, starts_at, ends_at, guest_count, event_type, deposit_status, alcohol, insurance_on_file, status, office_notes");
await probe("Legal", "legal_cases", "id, owner_name");
await probe("Board", "directors", "id");
await probe("Board", "meetings", "id");
await probe("Board", "meeting_minutes", "meeting_id, attendance, body, motions, published");
await probe("Vendors", "vendors", "id, name, trade, contact_name, contract_start, contract_end, insurance_expires_on, ytd_spend_cents, active");
await probe("Communities", "portfolios", "id, name");
await probe("Communities", "portfolio_communities", "portfolio_id, community_id");
await probe("Team", "admin_audit_log", "id, action, actor_name, actor_user_id, created_at");
await probe("Team", "auth_events", "id, event, email, user_id, succeeded, failure_reason, ip, user_agent, created_at");

console.log("\n═══ Resident portal reads ═══");
await probe("Property", "lots", "id, community, lot_number, street_number, street_name, owner_profile_id");
await probe("Billing", "hoa_dashboard_metrics", "hoa_fee_amount_cents, hoa_due_day_of_month, dues_frequency");
await probe("Ledger", "finance_transactions", "id, occurred_on, kind, description, amount_cents, lot_id");
await probe("Payments", "resident_payments", "id, amount_cents, status, created_at, user_id");
await probe("Maintenance", "work_orders", "id, work_order_number, title, location, status, created_at, reported_by_email");
await probe("Architectural", "arc_applications", "id, reference, title, submitted_on, due_on, status, decision_note, owner_name, address");
await probe("Compliance", "violations", "id, violation_type, opened_on, status, cure_days, notes, address");
await probe("Amenities", "bookings", "id, amenity, starts_at, ends_at, event_type, deposit_status, status, resident_name");
await probe("Documents", "documents", "id, title, file_type, file_size_bytes, version, effective_date, access_level, is_archived");
await probe("Community", "community_events", "id, title, description, starts_at, location, published");
await probe("Community", "announcements", "id, title, body, published_at, status");
await probe("Account", "notification_preferences", "user_id, announcements, maintenance_updates, billing_reminders");

console.log("\n═══ Not yet in the database (client-only domains) ═══");
for (const t of ["message_threads", "guest_passes", "resident_vehicles", "pets", "household_members", "leases"]) {
  const { error } = await db.from(t).select("*", { count: "exact", head: true });
  console.log(error ? `· ${t}: no table yet (expected — persistence task in flight)` : `✓ ${t}: table exists now`);
}

console.log("\n═══ Per-account scoping ═══");
for (const email of ["resident.test@unitygrid.dev", "test@example.com"]) {
  let page = 1, user = null;
  for (;;) {
    const { data } = await db.auth.admin.listUsers({ page, perPage: 200 });
    user = data.users.find((u) => u.email === email);
    if (user || data.users.length < 200) break;
    page++;
  }
  if (!user) { console.log(`✗ ${email}: no auth user`); fail++; continue; }
  const { data: prof } = await db.from("profiles").select("display_name, role, phone").eq("id", user.id).maybeSingle();
  const { data: lot } = await db.from("lots").select("street_number, street_name, lot_number").eq("owner_profile_id", user.id).maybeSingle();
  const name = prof?.display_name ?? "?";
  const counts = {};
  if (lot) {
    const addr = `${lot.street_number} ${lot.street_name}`;
    const c = async (t, q) => (await q).count ?? 0;
    counts.ledger = await c("ft", db.from("finance_transactions").select("id", { count: "exact", head: true }).ilike("description", "%[test]%").eq("kind", "income"));
    counts.workOrders = (await db.from("work_orders").select("id", { count: "exact", head: true }).ilike("reported_by_email", email)).count ?? 0;
    counts.arc = (await db.from("arc_applications").select("id", { count: "exact", head: true }).ilike("owner_name", `%${name}%`)).count ?? 0;
    counts.violations = (await db.from("violations").select("id", { count: "exact", head: true }).ilike("address", `%${addr}%`)).count ?? 0;
    counts.bookings = (await db.from("bookings").select("id", { count: "exact", head: true }).ilike("resident_name", `%${name}%`)).count ?? 0;
  }
  console.log(`✓ ${email} — "${name}" (${prof?.role}) · lot ${lot ? `${lot.street_number} ${lot.street_name} #${lot.lot_number}` : "NONE"} · phone ${prof?.phone ?? "—"}`);
  if (lot) console.log(`   scoped rows: WO ${counts.workOrders}, ARC ${counts.arc}, violations ${counts.violations}, bookings ${counts.bookings}`);
}

console.log("\n═══ Write-path spot checks (latest rows) ═══");
const { data: audits } = await db.from("admin_audit_log").select("action, actor_name, created_at").order("created_at", { ascending: false }).limit(3);
for (const a of audits ?? []) console.log(`✓ audit: [${a.created_at.slice(0, 16)}] ${a.action.slice(0, 90)} — by ${a.actor_name}`);
const { data: signins } = await db.from("auth_events").select("event, email, succeeded, created_at").order("created_at", { ascending: false }).limit(3);
for (const e of signins ?? []) console.log(`✓ auth event: [${e.created_at.slice(0, 16)}] ${e.event} ${e.email} ${e.succeeded ? "ok" : "FAILED"}`);

console.log(`\n${fail === 0 ? "ALL CLEAR" : "FAILURES PRESENT"} — ${pass} probes passed, ${fail} failed`);
