/**
 * Import the Sofi Lakes master lot inventory into public.lots.
 *
 * Source: "Sofi Lakes_ Lots Closed color Mail box compl.xlsx" (Sheet1,
 * header row 3). Rules from the office:
 *   - Builder "N/A" rows are reserves/easements (REST RES) — excluded.
 *   - Blank-builder rows are real platted lots (no builder assigned) — kept.
 *   - Rows without a numeric street number are unaddressed parcels — excluded.
 * That yields exactly 390 lots. Re-runnable: wipes and reloads, but refuses
 * to wipe if any lot has an owner assigned.
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const XLSX = "/Users/jongarciaa/Library/Mobile Documents/com~apple~CloudDocs/Downloads/Sofi Lakes_ Lots Closed color Mail box compl.xlsx";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n")
    .filter(l => l.includes("=") && !l.trim().startsWith("#"))
    .map(l => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const py = `
import openpyxl, json, re
wb = openpyxl.load_workbook(${JSON.stringify(XLSX)}, data_only=True)
ws = wb["Sheet1"]
SUFFIX = {"LN":"Lane","DR":"Drive","ST":"Street","CT":"Court","RD":"Road","TRL":"Trail","CIR":"Circle","PL":"Place","WAY":"Way","BLVD":"Boulevard"}
def street(name):
    words = str(name).strip().split()
    out = []
    for i, w in enumerate(words):
        if i == len(words) - 1 and w.upper() in SUFFIX: out.append(SUFFIX[w.upper()])
        else: out.append(w.capitalize())
    return " ".join(out)
out = []
for r in ws.iter_rows(min_row=4, values_only=True):
    if not any(c not in (None, "") for c in r): continue
    sub, blk, lot, size, lake, builder, sno, sname = r[0], r[1], r[2], r[3], r[4], r[5], r[6], r[7]
    b = str(builder).strip() if builder else ""
    if b == "N/A": continue                      # reserves / easements
    if not (sno and re.fullmatch(r"\\d+", str(sno).strip()) and sname): continue
    sec = re.sub(r"[^0-9]", "", str(sub)) or "1"
    out.append({
        "lot_number": re.sub(r"[^0-9A-Za-z]", "", str(lot).replace("LOT", "")).strip() or str(lot),
        "block": re.sub(r"[^0-9A-Za-z]", "", str(blk).replace("BLK", "")).strip() or str(blk),
        "section": sec,
        "street_number": str(sno).strip(),
        "street_name": street(sname),
        "lot_size": float(size) if size not in (None, "") else None,
        "builder": b or None,
    })
print(json.dumps(out))
`;
const rows = JSON.parse(execSync("python3", { input: py }).toString());
console.log("parsed", rows.length, "lots from the master sheet");

// Dedupe on the DB's unique keys, reporting anything skipped.
const byAddr = new Map(), byLot = new Map(), clean = [], skipped = [];
for (const r of rows) {
  const a = `${r.street_number} ${r.street_name}`;
  const k = `${r.lot_number}/${r.block}/${r.section}`;
  if (byAddr.has(a)) { skipped.push({ reason: `duplicate address ${a}`, row: r, first: byAddr.get(a) }); continue; }
  if (byLot.has(k)) { skipped.push({ reason: `duplicate lot ${k}`, row: r, first: byLot.get(k) }); continue; }
  byAddr.set(a, r); byLot.set(k, r);
  clean.push(r);
}
for (const s of skipped) {
  console.log(`SKIPPED (${s.reason}): Lot ${s.row.lot_number} Blk ${s.row.block} Sec ${s.row.section} · ${s.row.builder ?? "no builder"}`
    + ` — conflicts with Lot ${s.first.lot_number} Blk ${s.first.block} Sec ${s.first.section} · ${s.first.builder ?? "no builder"}`);
}

const { count: assigned } = await db.from("lots").select("*", { count: "exact", head: true }).not("owner_profile_id", "is", null);
if (assigned > 0) throw new Error(`${assigned} lots have owners assigned — refusing to wipe. Migrate assignments first.`);

const { error: delErr } = await db.from("lots").delete().gte("created_at", "1970-01-01");
if (delErr) throw delErr;

for (let i = 0; i < clean.length; i += 100) {
  const { error } = await db.from("lots").insert(clean.slice(i, i + 100));
  if (error) throw error;
}
const { count } = await db.from("lots").select("*", { count: "exact", head: true });
const { count: withBuilder } = await db.from("lots").select("*", { count: "exact", head: true }).not("builder", "is", null);
console.log(`lots table now has ${count} rows (${withBuilder} with a builder, ${count - withBuilder} unassigned-builder)`);
