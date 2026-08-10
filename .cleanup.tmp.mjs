/* Clears the test data out of Owners and Accounting, as chosen:
   - all four [test]-tagged ledger rows
   - both invoices raised while testing, and their lines
   - the three household-member rows
   - the Riley Testerman test profile

   Deliberately untouched: the 390 lots, the fee schedule, and every auth
   account — two of the household rows point at the owner's own address and
   at a real person, so removing the row must not remove the sign-in. */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ACTOR = { name: "Jon Garcia", id: "2a7a74eb-479a-4d61-a60f-6049f3954cfe" };
const die = (label, error) => { if (error) throw new Error(`${label}: ${error.message}`); };

// ── Accounting ────────────────────────────────────────────────────────────
const { data: invs, error: invReadErr } = await db.from("invoices").select("id, invoice_number");
die("read invoices", invReadErr);
const invIds = invs.map((i) => i.id);

if (invIds.length) {
  die("invoice_lines", (await db.from("invoice_lines").delete().in("invoice_id", invIds)).error);
  die("invoices", (await db.from("invoices").delete().in("id", invIds)).error);
}

const { data: testTx, error: txReadErr } = await db
  .from("finance_transactions")
  .select("id, description")
  .ilike("description", "%[test]%");
die("read finance_transactions", txReadErr);
if (testTx.length) {
  die("finance_transactions", (await db.from("finance_transactions").delete().in("id", testTx.map((t) => t.id))).error);
}

// ── Owners ────────────────────────────────────────────────────────────────
const { data: hh, error: hhReadErr } = await db.from("household_members").select("id, name, email");
die("read household_members", hhReadErr);
if (hh.length) {
  die("household_members", (await db.from("household_members").delete().in("id", hh.map((h) => h.id))).error);
}

const RILEY = "89121e4a-c08d-4895-b78c-4f30904a206e";
const { data: rileyAuth } = await db.auth.admin.getUserById(RILEY);
die("profiles", (await db.from("profiles").delete().eq("id", RILEY)).error);
if (rileyAuth?.user) {
  const { error: delErr } = await db.auth.admin.deleteUser(RILEY);
  if (delErr) console.log(`  (auth user for Riley Testerman kept — ${delErr.message})`);
}

// ── Audit trail ───────────────────────────────────────────────────────────
die("audit", (await db.from("admin_audit_log").insert({
  action:
    `Cleared test data: ${invs.length} test invoice(s) and their lines, ` +
    `${testTx.length} [test] ledger entries, ${hh.length} household-member records ` +
    `and the Riley Testerman test profile. The 390 lots and the fee schedule were not touched.`,
  actor_name: ACTOR.name,
  actor_user_id: ACTOR.id,
})).error);

// ── What is left ──────────────────────────────────────────────────────────
const count = async (t) => (await db.from(t).select("*", { count: "exact", head: true })).count;
console.log("DELETED:");
console.log(`  invoices          ${invs.length}  ${invs.map((i) => i.invoice_number).join(", ")}`);
console.log(`  finance_txns      ${testTx.length}  ([test] tagged)`);
console.log(`  household_members ${hh.length}  ${hh.map((h) => h.name).join(", ")}`);
console.log(`  profiles          1  Riley Testerman${rileyAuth?.user ? " (+ auth user)" : ""}`);
console.log("\nREMAINING:");
for (const t of ["lots", "profiles", "household_members", "invoices", "invoice_lines", "finance_transactions", "fee_schedule"]) {
  console.log(`  ${t}: ${await count(t)}`);
}
