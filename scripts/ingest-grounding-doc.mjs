/**
 * One-off ingest for a grounding-only document.
 *
 * A grounding document is read by the assistant and browsed by nobody: it is
 * stored with `assistant_only = true`, which keeps it out of every library
 * listing and refuses it at the download route. Use this for the authoritative
 * copy of an instrument the office wants answers to be correct about, when the
 * copy on the shelf is a scan and this one is not.
 *
 * The text is extracted here rather than in the app because it happens once
 * and nobody is waiting: `pdftotext -layout` keeps the column structure of a
 * recorded instrument, which matters for exhibits and signature blocks.
 *
 * Page markers are written into the stored text ("[page 12]") so the assistant
 * can name the page it read. It is the only page reference available for a
 * document with no download link to anchor.
 *
 *   node scripts/ingest-grounding-doc.mjs "<pdf path>" "<title>" "<category>"
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename } from "node:path";

import { createClient } from "@supabase/supabase-js";

const [, , pdfPath, title, categoryName = "Governing Documents"] = process.argv;
if (!pdfPath || !title) {
  console.error('usage: node scripts/ingest-grounding-doc.mjs "<pdf>" "<title>" [category]');
  process.exit(1);
}

/* .env.local is the office's local configuration; this script is run by hand
   from the repo, so read it directly rather than requiring a loader. */
for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

/* pdftotext separates pages with a form feed. Turning each one into a named
   marker is what lets an answer say which page a clause came from. */
const raw = execFileSync("pdftotext", ["-layout", pdfPath, "-"], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
const text = raw
  .split("\f")
  .map((page, i) => `\n[page ${i + 1}]\n${page.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim()}`)
  .join("\n")
  .trim();

if (text.length < 1000) {
  console.error(
    `Only ${text.length} characters came out — this PDF is a scan with no text layer, ` +
      "and storing it would ground the assistant in nothing. OCR it first.",
  );
  process.exit(1);
}

const { data: category, error: catErr } = await db
  .from("document_categories")
  .select("id")
  .eq("name", categoryName)
  .maybeSingle();
if (catErr || !category) {
  console.error(`No category named "${categoryName}".`);
  process.exit(1);
}

const file = readFileSync(pdfPath);
const fileName = basename(pdfPath);
const safeName = fileName.replaceAll(/[^\w.\-]+/g, "_").slice(-100);
const filePath = `grounding/${crypto.randomUUID()}-${safeName}`;

const { error: upErr } = await db.storage
  .from("documents")
  .upload(filePath, file, { contentType: "application/pdf", upsert: false });
if (upErr) {
  console.error(`Upload failed: ${upErr.message}`);
  process.exit(1);
}

const { data: row, error: insErr } = await db
  .from("documents")
  .insert({
    title,
    category_id: category.id,
    file_path: filePath,
    file_name: fileName,
    file_size_bytes: file.length,
    file_type: "application/pdf",
    /* Belt and braces. `assistant_only` is what hides it, but a document that
       leaked into a listing through some path that forgot the filter would
       still not be readable by a resident. */
    access_level: "manager_only",
    assistant_only: true,
    extracted_text: text,
    extracted_at: new Date().toISOString(),
  })
  .select("id, title")
  .single();

if (insErr) {
  await db.storage.from("documents").remove([filePath]);
  console.error(`Insert failed: ${insErr.message}`);
  process.exit(1);
}

console.log(`Stored "${row.title}" (${row.id})`);
console.log(`  ${text.length.toLocaleString()} characters across ${raw.split("\f").length} pages`);
console.log("  Hidden from the library; read by the assistant.");
