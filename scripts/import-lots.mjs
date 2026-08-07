/**
 * One-shot import of the Sofi Lakes lot inventory into public.lots.
 * Reads the office spreadsheet, keeps full address + size (+ lot/block/section
 * identity), skips rows already present. Run: node scripts/import-lots.mjs
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const XLSX = "/Users/jongarciaa/Library/Mobile Documents/com~apple~CloudDocs/Downloads/Pipsy-ARC Lots.xlsx";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split("\n")
    .filter(l => l.includes("=") && !l.trim().startsWith("#"))
    .map(l => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Parse the sheet with python/openpyxl (already installed) to keep deps zero.
const py = `
import openpyxl, json, re
wb = openpyxl.load_workbook(${JSON.stringify(XLSX)}, data_only=True)
ws = wb["data"]
out = []
for r in ws.iter_rows(min_row=2, values_only=True):
    addr = str(r[10]).strip() if r[10] else ""
    m = re.match(r"^(\\d+)\\s+(.+)$", addr)
    if not m: continue
    out.append({
        "lot_number": str(r[2]).strip(),
        "block": str(r[3]).strip(),
        "section": str(r[5]).strip(),
        "street_number": m.group(1),
        "street_name": m.group(2),
        "sq_ft": int(r[9]) if r[9] else None,
    })
print(json.dumps(out))
`;
const rows = JSON.parse(execSync("python3", { input: py }).toString());
console.log("parsed", rows.length, "lots from the sheet");

const { data: existing, error: exErr } = await db.from("lots").select("street_number, street_name");
if (exErr) throw exErr;
const have = new Set(existing.map(l => `${l.street_number} ${l.street_name}`));
const fresh = rows.filter(r => !have.has(`${r.street_number} ${r.street_name}`));
console.log(existing.length, "already in db;", fresh.length, "to insert");

if (fresh.length) {
  const { error } = await db.from("lots").insert(fresh);
  if (error) throw error;
}
const { count } = await db.from("lots").select("*", { count: "exact", head: true });
console.log("lots table now has", count, "rows");
