/**
 * DEV ONLY. Seeds test records for the resident-portal test accounts so every
 * portal section demonstrates its data path. Idempotent: each record is keyed
 * by a recognizable marker and skipped when already present.
 *
 * Run from the repo root: node scripts/seed-portal-test-data.mjs
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

const ACCOUNTS = ["resident.test@unitygrid.dev", "test@example.com"];

async function findUser(email) {
  let page = 1;
  for (;;) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find((u) => u.email === email);
    if (hit) return hit;
    if (data.users.length < 200) return null;
    page++;
  }
}

async function ensureLot(userId) {
  const { data: mine } = await db.from("lots").select("*").eq("owner_profile_id", userId).limit(1).maybeSingle();
  if (mine) return mine;
  const { data: free, error } = await db
    .from("lots").select("*").is("owner_profile_id", null).order("lot_number").limit(1).maybeSingle();
  if (error) throw error;
  if (!free) throw new Error("no unassigned lot left");
  await db.from("lots").update({ owner_profile_id: userId, assigned_at: new Date().toISOString() }).eq("id", free.id);
  return free;
}

/** Insert unless a row matching `match` exists. */
async function seed(table, match, row) {
  // Count on the first match key — not every table has an `id` column.
  const countCol = Object.keys(match)[0];
  let q = db.from(table).select(countCol, { count: "exact", head: true });
  for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
  const { count, error } = await q;
  if (error) return console.log(`✗ ${table}: ${error.message}`);
  if (count > 0) return console.log(`· ${table}: already seeded`);
  const { error: insErr } = await db.from(table).insert(row);
  console.log(insErr ? `✗ ${table}: ${insErr.message}` : `✓ ${table}: seeded`);
}

const iso = (daysFromNow, h = 18) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(h, 30, 0, 0);
  return d.toISOString();
};
const day = (daysAgo) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};

// ── Billing config (singleton) — only fills fields that are null ─────
{
  const { data } = await db
    .from("hoa_dashboard_metrics")
    .select("id, hoa_fee_amount_cents, hoa_due_day_of_month, dues_frequency")
    .eq("id", 1)
    .maybeSingle();
  if (data && data.hoa_fee_amount_cents == null) {
    const { error } = await db
      .from("hoa_dashboard_metrics")
      .update({ hoa_fee_amount_cents: 135000, hoa_due_day_of_month: 1, dues_frequency: "quarterly" })
      .eq("id", 1);
    console.log(error ? `✗ billing: ${error.message}` : "✓ billing: fee $1,350 quarterly, due the 1st");
  } else {
    console.log("· billing: already configured");
  }
}

for (const email of ACCOUNTS) {
  const user = await findUser(email);
  if (!user) { console.log(`✗ ${email}: no auth user`); continue; }
  const { data: profile } = await db.from("profiles").select("display_name").eq("id", user.id).maybeSingle();
  const name = profile?.display_name?.trim() || email;
  const lot = await ensureLot(user.id);
  const address = `${lot.street_number} ${lot.street_name}`;
  console.log(`\n─ ${email} (${name}) · ${address} · Lot ${lot.lot_number} ─`);

  await seed("finance_transactions",
    { lot_id: lot.id, description: "Q3 2026 HOA fee posted [test]" },
    { lot_id: lot.id, kind: "expense", category: "HOA fees", description: "Q3 2026 HOA fee posted [test]", amount_cents: 135000, occurred_on: day(37) });

  await seed("finance_transactions",
    { lot_id: lot.id, description: "Payment received — bank transfer [test]" },
    { lot_id: lot.id, kind: "income", category: "HOA fees", description: "Payment received — bank transfer [test]", amount_cents: 135000, occurred_on: day(30) });

  await seed("work_orders",
    { reported_by_email: email, title: "Irrigation head spraying the sidewalk [test]" },
    { work_order_number: `WO-TEST-${lot.lot_number}-${user.id.slice(0, 4)}`, title: "Irrigation head spraying the sidewalk [test]", description: "Head at the corner runs during the morning cycle and soaks the walk.", location: "Front yard or easement", category: "grounds", priority: "normal", status: "in_progress", reported_by_name: name, reported_by_email: email, reported_by_unit: `Lot ${lot.lot_number}` });

  await seed("arc_applications",
    { owner_name: name, title: "Backyard pergola, cedar [test]" },
    { reference: `ARC-T${lot.lot_number}`, title: "Backyard pergola, cedar [test]", owner_name: name, address, project_type: "Patio, pergola or deck", contractor: "Owner build", submitted_on: day(12), status: "Awaiting decision" });

  await seed("violations",
    { address, violation_type: "Trash bins visible from street [test]" },
    { reference: `V-T${lot.lot_number}`, community: lot.community, address, violation_type: "Trash bins visible from street [test]", source: "inspection", inspector: "Test Inspector", cure_days: 7, opened_on: day(21), status: "Resolved", notes: "Courtesy notice; resolved at re-inspection." });

  await seed("bookings",
    { resident_name: name, amenity: "Clubhouse Annex" },
    { resident_name: name, amenity: "Clubhouse Annex", starts_at: iso(9, 16), ends_at: iso(9, 21), guest_count: 24, event_type: "Birthday", deposit_status: "Deposit unpaid", status: "Requested" });

  await seed("notification_preferences",
    { user_id: user.id },
    { user_id: user.id, announcements: true, maintenance_updates: true, billing_reminders: true });
}

// ── Community-wide content (one of each) ─────────────────────────────
await seed("community_events",
  { title: "Board meeting [test]" },
  { title: "Board meeting [test]", description: "Open forum first", starts_at: iso(7), location: "Clubhouse Annex", category: "official", published: true });

await seed("announcements",
  { title: "2026 budget adopted [test]" },
  { title: "2026 budget adopted [test]", body: "HOA fees hold at $1,350 per quarter. The reserve contribution rises to fund the street overlay.", status: "published", published_at: new Date().toISOString() });

console.log("\ndone");
