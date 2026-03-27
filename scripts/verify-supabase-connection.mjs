#!/usr/bin/env node
/**
 * Verifies .env.local Supabase settings match each other and the project responds.
 * Run: npm run verify:supabase
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const envPath = resolve(root, ".env.local");

function parseEnvFile(content) {
  const out = {};
  for (const line of content.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

function jwtPayload(jwt) {
  const parts = jwt.split(".");
  if (parts.length < 2) return null;
  const json = Buffer.from(parts[1], "base64url").toString("utf8");
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function fail(msg) {
  console.error(`\x1b[31m✖\x1b[0m ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`\x1b[32m✓\x1b[0m ${msg}`);
}

function warn(msg) {
  console.log(`\x1b[33m!\x1b[0m ${msg}`);
}

if (!existsSync(envPath)) {
  fail(`Missing .env.local (copy from .env.example): ${envPath}`);
}

const env = parseEnvFile(readFileSync(envPath, "utf8"));
const urlRaw = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anon = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const service = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!urlRaw) fail("NEXT_PUBLIC_SUPABASE_URL is missing");
if (!anon) fail("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing (required for admin login / SSR auth)");
if (!service) fail("SUPABASE_SERVICE_ROLE_KEY is missing");

let base;
try {
  base = new URL(urlRaw).origin;
} catch {
  fail("NEXT_PUBLIC_SUPABASE_URL is not a valid URL");
}

const hostRef = new URL(urlRaw).hostname.replace(/\.supabase\.co$/i, "");
if (!hostRef || hostRef.includes(".")) {
  fail("Expected NEXT_PUBLIC_SUPABASE_URL host like <ref>.supabase.co");
}

for (const [name, jwt] of [
  ["anon", anon],
  ["service_role", service],
]) {
  const p = jwtPayload(jwt);
  if (!p?.ref) fail(`${name} key is not a valid Supabase JWT`);
  if (p.ref !== hostRef) {
    fail(
      `JWT ref "${p.ref}" does not match URL project ref "${hostRef}" (${name} key)`,
    );
  }
  const role = p.role;
  if (name === "anon" && role !== "anon") {
    fail(`NEXT_PUBLIC_SUPABASE_ANON_KEY has role "${role}", expected "anon"`);
  }
  if (name === "service_role" && role !== "service_role") {
    fail(`SUPABASE_SERVICE_ROLE_KEY has role "${role}", expected "service_role"`);
  }
}

ok(`Env keys align with project ref ${hostRef}`);

const healthUrl = `${base}/auth/v1/health`;
let res;
try {
  res = await fetch(healthUrl, {
    method: "GET",
    headers: {
      apikey: anon,
      Authorization: `Bearer ${anon}`,
    },
  });
} catch (e) {
  fail(`Network error reaching ${healthUrl}: ${e?.message ?? e}`);
}

if (!res.ok) {
  fail(`Auth health check returned ${res.status} ${res.statusText} (${healthUrl})`);
}
ok(`Reachable: ${healthUrl}`);

const restUrl = `${base}/rest/v1/profiles?select=id&limit=1`;
const restRes = await fetch(restUrl, {
  headers: {
    apikey: anon,
    Authorization: `Bearer ${anon}`,
    Accept: "application/json",
  },
});

if (restRes.status === 200) {
  ok("REST API accepts anon key (profiles table exists)");
} else if (restRes.status === 404) {
  warn(
    "REST /profiles returned 404 — table may be missing. Apply repo migrations: `supabase link` then `supabase db push` (or run SQL from supabase/migrations/ in the dashboard).",
  );
} else if (restRes.status === 401 || restRes.status === 403) {
  warn(
    `REST returned ${restRes.status} for profiles — RLS may block unauthenticated reads; auth is still OK`,
  );
} else {
  warn(`REST profiles probe: HTTP ${restRes.status} (URL is up)`);
}

const financeUrl = `${base}/rest/v1/finance_transactions?select=id,amount_cents&limit=1`;
const financeRes = await fetch(financeUrl, {
  headers: {
    apikey: service,
    Authorization: `Bearer ${service}`,
    Accept: "application/json",
  },
});

if (financeRes.status === 200) {
  ok("finance_transactions exposes amount_cents (service role REST probe)");
} else {
  let bodyText = "";
  try {
    bodyText = await financeRes.text();
  } catch {
    bodyText = "";
  }
  const mentionsAmount =
    /amount_cents|PGRST204|42703/i.test(bodyText) || financeRes.status === 400;
  if (mentionsAmount || financeRes.status === 400) {
    fail(
      `finance_transactions schema mismatch (HTTP ${financeRes.status}). ` +
        `Run SQL from supabase/migrations/20260329000000_finance_transactions_amount_cents_repair.sql ` +
        `and supabase/migrations/20260330120000_finance_transactions_ledger_columns_repair.sql ` +
        `in the Supabase SQL Editor for project ref ${hostRef}. ` +
        `Cursor Supabase MCP only works if that project appears in MCP list_projects (same Supabase login).`,
    );
  }
  warn(`finance_transactions probe: HTTP ${financeRes.status}`);
}

const probeDesc = "__verify_supabase_finance_probe__";
const insertUrl = `${base}/rest/v1/finance_transactions`;
const insertRes = await fetch(insertUrl, {
  method: "POST",
  headers: {
    apikey: service,
    Authorization: `Bearer ${service}`,
    Accept: "application/json",
    "Content-Type": "application/json",
    Prefer: "return=representation",
  },
  body: JSON.stringify({
    occurred_on: new Date().toISOString().slice(0, 10),
    kind: "expense",
    category: "other",
    description: probeDesc,
    amount_cents: 1,
  }),
});

if (!insertRes.ok) {
  let insertBody = "";
  try {
    insertBody = await insertRes.text();
  } catch {
    insertBody = "";
  }
  fail(
    `finance_transactions insert probe failed HTTP ${insertRes.status}: ${insertBody.slice(0, 500)}. ` +
      `Apply supabase/migrations/20260330120000_finance_transactions_ledger_columns_repair.sql ` +
      `(and amount_cents repair if needed) in SQL Editor for ref ${hostRef}.`,
  );
}

let inserted;
try {
  inserted = await insertRes.json();
} catch {
  fail("finance_transactions insert probe: invalid JSON response");
}
const row = Array.isArray(inserted) ? inserted[0] : inserted;
const newId = row?.id;
if (!newId) {
  fail("finance_transactions insert probe: no id in response");
}

const delUrl = `${base}/rest/v1/finance_transactions?id=eq.${encodeURIComponent(newId)}`;
const delRes = await fetch(delUrl, {
  method: "DELETE",
  headers: {
    apikey: service,
    Authorization: `Bearer ${service}`,
  },
});
if (!delRes.ok) {
  warn(
    `Inserted probe row id=${newId} but delete returned HTTP ${delRes.status} — remove description="${probeDesc}" manually`,
  );
} else {
  ok("finance_transactions service-role insert + delete round-trip OK");
}

console.log("\nFrontend/backend wiring looks good for this Supabase project.");
console.log(
  "Note: Cursor Supabase MCP must use the same Supabase account that owns this project to manage it via MCP.\n",
);
