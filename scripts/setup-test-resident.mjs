/**
 * Creates (or resets) the resident-portal test account, links it to a lot,
 * and prints a wiring report for every table the portal reads.
 *
 * Run from the repo root: node <this file>
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Missing Supabase keys in .env.local");

const db = createClient(url, key, { auth: { persistSession: false } });

const EMAIL = "resident.test@unitygrid.dev";
const PASSWORD = "SofiLakes-Resident-2026!";
const NAME = "Riley Testerman";

// ── 1. Create or reset the auth user ─────────────────────────────────
let userId = null;
{
  const { data: created, error } = await db.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: NAME },
  });
  if (error && !/already/i.test(error.message)) throw error;
  if (created?.user) {
    userId = created.user.id;
    console.log("created auth user", userId);
  } else {
    // Exists — find and reset the password so the printed credentials work.
    let page = 1;
    while (!userId) {
      const { data, error: listErr } = await db.auth.admin.listUsers({ page, perPage: 200 });
      if (listErr) throw listErr;
      const hit = data.users.find((u) => u.email === EMAIL);
      if (hit) userId = hit.id;
      else if (data.users.length < 200) break;
      else page++;
    }
    if (!userId) throw new Error("user exists but not found");
    const { error: updErr } = await db.auth.admin.updateUserById(userId, {
      password: PASSWORD,
      email_confirm: true,
    });
    if (updErr) throw updErr;
    console.log("reset existing auth user", userId);
  }
}

// ── 2. Profile: resident role + display name ─────────────────────────
{
  const { error } = await db.from("profiles").upsert(
    { id: userId, role: "basic", display_name: NAME },
    { onConflict: "id" },
  );
  if (error) throw error;
  console.log("profile upserted (role=basic)");
}

// ── 3. Link a lot (prefer one already linked to this user, else a free one) ──
let lot = null;
{
  const { data: mine } = await db
    .from("lots").select("*").eq("owner_profile_id", userId).limit(1).maybeSingle();
  if (mine) {
    lot = mine;
  } else {
    const { data: free, error } = await db
      .from("lots").select("*").is("owner_profile_id", null).order("lot_number").limit(1).maybeSingle();
    if (error) throw error;
    if (!free) throw new Error("no unassigned lot available");
    const { error: linkErr } = await db
      .from("lots")
      .update({ owner_profile_id: userId, assigned_at: new Date().toISOString() })
      .eq("id", free.id);
    if (linkErr) throw linkErr;
    lot = { ...free, owner_profile_id: userId };
  }
  console.log("lot linked:", `${lot.street_number} ${lot.street_name} · Lot ${lot.lot_number} (${lot.community})`);
}

// ── 4. Wiring report: row counts for every table the portal reads ────
const CHECKS = [
  ["lots (this resident)", (q) => q.from("lots").select("id", { count: "exact", head: true }).eq("owner_profile_id", userId)],
  ["hoa_dashboard_metrics (billing row)", (q) => q.from("hoa_dashboard_metrics").select("id", { count: "exact", head: true }).eq("id", 1)],
  ["finance_transactions (this lot)", (q) => q.from("finance_transactions").select("id", { count: "exact", head: true }).eq("lot_id", lot.id)],
  ["resident_payments (this user)", (q) => q.from("resident_payments").select("id", { count: "exact", head: true }).eq("user_id", userId)],
  ["work_orders (this email)", (q) => q.from("work_orders").select("id", { count: "exact", head: true }).ilike("reported_by_email", EMAIL)],
  ["arc_applications (this owner)", (q) => q.from("arc_applications").select("id", { count: "exact", head: true }).ilike("owner_name", `%${NAME}%`)],
  ["violations (this address)", (q) => q.from("violations").select("id", { count: "exact", head: true }).ilike("address", `%${lot.street_number} ${lot.street_name}%`)],
  ["bookings (this resident)", (q) => q.from("bookings").select("id", { count: "exact", head: true }).ilike("resident_name", `%${NAME}%`)],
  ["documents (resident-visible)", (q) => q.from("documents").select("id", { count: "exact", head: true }).eq("is_archived", false).in("access_level", ["public", "resident"])],
  ["community_events (published)", (q) => q.from("community_events").select("id", { count: "exact", head: true }).eq("published", true)],
  ["announcements (published)", (q) => q.from("announcements").select("id", { count: "exact", head: true }).eq("status", "published")],
  ["notification_preferences (this user)", (q) => q.from("notification_preferences").select("user_id", { count: "exact", head: true }).eq("user_id", userId)],
  ["auth_events (portal logins)", (q) => q.from("auth_events").select("id", { count: "exact", head: true })],
];

console.log("\n─ wiring report ─");
for (const [label, run] of CHECKS) {
  const { count, error } = await run(db);
  console.log(
    error
      ? `✗ ${label}: ${error.code ?? ""} ${error.message}`
      : `✓ ${label}: ${count} row(s)`,
  );
}

console.log("\ncredentials:");
console.log("  email:   ", EMAIL);
console.log("  password:", PASSWORD);
