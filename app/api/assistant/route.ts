import { NextResponse } from "next/server";

import { loadPortalData } from "@/lib/admin-portal/server-data";
import { loadResidentData } from "@/lib/resident-portal/server-data";
import { DOCUMENTS_BUCKET } from "@/lib/supabase/documents";
import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { requireServiceSupabase } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

/**
 * The Unity Grid assistant: a floating Q&A grounded in the association's
 * real records, served through OpenRouter (the office's chosen provider).
 * The recorded documents are scans, so the relevant PDFs are attached to
 * the request and parsed with OpenRouter's native engine — the model reads
 * them directly. Signed-in users only; answers cite their documents.
 *
 * Scope boundary (non-negotiable): a resident's assistant sees only that
 * resident's own records and resident-visible documents. Management's
 * internal data — manager/board documents, other residents, staff records,
 * the database at large — is never in a resident's context. Staff accounts
 * get the full library.
 */

export const maxDuration = 120;

type ChatMsg = { role: "user" | "assistant"; content: string };

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-opus-4.5";

const MAX_DOC_BYTES = 6_000_000; // combined PDF budget per question
const MAX_ATTACHED_PDFS = 2;

/**
 * Characters of document text put in front of the model per question.
 * The library runs to roughly 690,000 characters (~170k tokens) — sending all
 * of it every time would crowd out the staff portal context and overrun the
 * window. This budget is about 95k tokens, which fits alongside everything
 * else and still admits the governing instruments plus a dozen policies.
 */
const DOC_TEXT_BUDGET = 380_000;

/** Below this, a PDF's "text layer" is a stamp and a header — a scan. Those
 *  are useless as text and have to go to the model as pages instead. */
const THIN_TEXT = 300;

const STOPWORDS = new Set([
  "the","a","an","and","or","of","to","in","on","for","is","are","what","how",
  "can","i","my","our","we","do","does","about","with","at","it","me","you",
]);

const terms = (q: string) =>
  [...new Set(q.toLowerCase().split(/[^a-z0-9&]+/))].filter(
    (w) => w.length > 2 && !STOPWORDS.has(w),
  );

/** Occurrences of `needle` in `hay`, without allocating a split array over a
 *  200,000-character instrument. */
function count(hay: string, needle: string): number {
  let n = 0;
  for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + needle.length)) n++;
  return n;
}

/**
 * How well a document answers this question.
 *
 * The point of interest is the body. Ranking on titles and tags alone — which
 * is what this did — scored every document zero for "how tall can my fence
 * be", because no document is *called* fence, and the assistant then answered
 * about the CC&Rs having never opened them. A title hit is still worth more
 * than a body hit, since a document named for the subject is usually the one
 * that governs it; repeated body hits saturate so a long document cannot win
 * on length alone.
 */
function score(words: string[], doc: { label: string; body: string }): number {
  let s = 0;
  for (const w of words) {
    if (doc.label.includes(w)) s += 5;
    const hits = count(doc.body, w);
    if (hits) s += Math.min(4, 1 + Math.log2(hits));
  }
  return s;
}

export async function POST(req: Request) {
  if (!isSupabaseAuthConfigured()) {
    return NextResponse.json({ error: "Not configured." }, { status: 503 });
  }
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to use the assistant." }, { status: 401 });
  }

  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "The assistant isn't configured yet — add OPENROUTER_API_KEY to the environment and restart.",
      },
      { status: 503 },
    );
  }

  let body: { messages?: ChatMsg[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const history = (body.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12);
  const question = [...history].reverse().find((m) => m.role === "user")?.content ?? "";
  if (!question.trim()) {
    return NextResponse.json({ error: "Ask a question first." }, { status: 400 });
  }

  // Role decides the boundary: staff see the whole library, residents see
  // only resident-visible documents plus their own records.
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", user.id)
    .maybeSingle();
  const isStaff = profile?.role === "admin";

  const service = requireServiceSupabase();
  let docsQuery = service
    .from("documents")
    .select(
      "id, title, file_path, file_size_bytes, tags, access_level, assistant_only, extracted_text, text_is_partial, document_categories(name)",
    )
    .eq("is_archived", false);
  if (!isStaff) {
    /* Grounding documents cross the resident boundary deliberately: they are
       the instruments a homeowner lives under (the CC&Rs, the bylaws), held
       back from the library only because the office does not want that
       particular copy browsed. They carry no other resident's data. Anything
       genuinely internal is manager_only *and* not assistant_only, so it stays
       out of this query. */
    docsQuery = docsQuery.or("assistant_only.eq.true,access_level.in.(public,resident)");
  }
  const [docsRes, feesRes] = await Promise.all([
    docsQuery,
    service.from("fee_schedule").select("name, amount_cents, category, active").order("sort"),
  ]);

  // The homeowner's own records — the only account data a resident's
  // assistant may discuss. Loaded with the same per-resident scoping as
  // the portal itself.
  const mine = isStaff
    ? null
    : await loadResidentData({
        id: user.id,
        email: user.email,
        displayName: profile?.display_name ?? null,
      });

  type DocRow = {
    id: string;
    title: string;
    file_path: string;
    file_size_bytes: number;
    tags: string[] | null;
    assistant_only: boolean;
    extracted_text: string | null;
    text_is_partial: boolean;
    document_categories: { name?: string } | null;
  };
  const all = (docsRes.data ?? []) as unknown as DocRow[];
  /* Grounding documents are not library rows: they never appear in the
     catalogue and carry no download link, because the download route refuses
     them. Everything else is on the shelf and can be linked. */
  const grounding = all.filter((d) => d.assistant_only);
  const docs = all.filter((d) => !d.assistant_only);

  const words = terms(question);
  /* Fit to ground on: enough text to be the document, and all of the document.
     A fragment is excluded even though it would rank well — answering from a
     declaration that stops two-thirds through is how the assistant ends up
     saying the CC&Rs are silent on a covenant they spend a page on. Such a
     document falls to the PDF tier, where the model reads the pages instead. */
  const readable = (d: DocRow) =>
    (d.extracted_text ?? "").length >= THIN_TEXT && !d.text_is_partial;

  /* Tier 1 — the instruments, in full, on every question regardless of what
     was asked. These are what the office wants answers to be right about, and
     a keyword miss on the CC&Rs is precisely the failure worth engineering
     away. */
  const included: DocRow[] = grounding.filter(readable);
  let textBudget = DOC_TEXT_BUDGET - included.reduce((t, d) => t + (d.extracted_text?.length ?? 0), 0);

  /* Tier 2 — the rest of the library ranked on its contents, most relevant
     first, until the budget is spent. A document is included whole: half a
     policy is how you get an answer that cites a rule and misses its
     exception. */
  const ranked = docs
    .filter(readable)
    .map((d) => ({
      doc: d,
      s: score(words, {
        label: `${d.title} ${d.document_categories?.name ?? ""} ${(d.tags ?? []).join(" ")}`.toLowerCase(),
        body: (d.extracted_text ?? "").toLowerCase(),
      }),
    }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s);
  for (const r of ranked) {
    const len = r.doc.extracted_text?.length ?? 0;
    if (len > textBudget) continue;
    included.push(r.doc);
    textBudget -= len;
  }

  /* Tier 3 — scans. A PDF whose text layer is a header and a stamp is a page
     image; no amount of ranking makes it readable as text, so the ones that
     matched go to the model as pages and its own PDF engine reads them. */
  const attached: DocRow[] = [];
  let byteBudget = MAX_DOC_BYTES;
  for (const d of docs) {
    if (attached.length >= MAX_ATTACHED_PDFS) break;
    if (readable(d)) continue;
    const label = `${d.title} ${d.document_categories?.name ?? ""} ${(d.tags ?? []).join(" ")}`.toLowerCase();
    if (!words.some((w) => label.includes(w))) continue;
    if (d.file_size_bytes > byteBudget) continue;
    attached.push(d);
    byteBudget -= d.file_size_bytes;
  }

  type ContentPart =
    | { type: "text"; text: string }
    | { type: "file"; file: { filename: string; file_data: string } };
  const docParts: ContentPart[] = [];
  for (const d of attached) {
    const { data: blob } = await service.storage.from(DOCUMENTS_BUCKET).download(d.file_path);
    if (!blob) continue;
    const b64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
    docParts.push({
      type: "file",
      file: {
        filename: `${d.title.replace(/[^\w &().,-]/g, "")}.pdf`,
        file_data: `data:application/pdf;base64,${b64}`,
      },
    });
  }

  /* The documents themselves, which is the thing that was missing. A
     grounding copy is named but not linked; a library copy is linked so the
     reader can open what the answer is quoting. */
  const render = (d: DocRow) => {
    const cite = d.assistant_only
      ? `"${d.title}" (authoritative copy, no download — cite it by name and the [page N] markers in its text)`
      : `"${d.title}" — link as [${d.title}](/api/documents/${d.id}/download)`;
    return `<document title="${d.title}" cite=${JSON.stringify(cite)}>\n${d.extracted_text}\n</document>`;
  };

  /* Split by what varies. The grounding instruments go in on every question
     regardless of what was asked, so they are byte-identical between requests
     and can be cached by the provider; the question-ranked documents cannot.
     Keeping them in separate blocks is what makes the cache hit — the whole
     corpus in one string would re-bill the instruments every time, which at
     ~55k tokens is most of the cost of a question. */
  const groundingBlock = included.filter((d) => d.assistant_only).map(render).join("\n\n");
  const library = included.filter((d) => !d.assistant_only).map(render).join("\n\n");

  const fees = ((feesRes.data ?? []) as {
    name: string;
    amount_cents: number;
    category: string;
    active: boolean;
  }[])
    .map(
      (f) =>
        `- ${f.name}: ${(f.amount_cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}${f.active ? "" : " (retired)"}`,
    )
    .join("\n");
  /* Only the ones NOT reproduced above — a document listed here is one the
     model has not read, and it is told to say so. Listing a document in both
     places invites it to hedge on text it is holding. */
  const reproduced = new Set([...included, ...attached].map((d) => d.id));
  const catalog = docs
    .filter((d) => !reproduced.has(d.id))
    .map(
      (d) =>
        `- [${d.title}](/api/documents/${d.id}/download) (${d.document_categories?.name ?? "General"})`,
    )
    .join("\n");
  const attachedList = attached
    .map((d) => `- "${d.title}" — link template: /api/documents/${d.id}/download#page=N`)
    .join("\n");

  const shared = `The association's documents are reproduced in full, inside <document> tags — the governing instruments first, then the documents most relevant to this question. Read them and answer from what they actually say — quote the governing language rather than paraphrasing a rule from memory. Each document's tag carries a "cite" attribute telling you exactly how to reference it; follow it literally.

Further documents whose text is reproduced here:
${library || "- None beyond the governing instruments above."}

Attached to this conversation as PDF pages (cite these with a page-anchored link — e.g. [Design Guidelines, p. 12](/api/documents/<id>/download#page=12)):
${attachedList || "- None attached for this question."}

Fee schedule (authoritative amounts):
${fees || "- No fees recorded yet."}

Other documents in the library, not reproduced here (link the title, no page, and say you have not read it):
${catalog || "- None yet."}

If the answer isn't in the documents or data above, say so plainly and suggest contacting the management office — never guess at rules, deadlines, or dollar amounts. Keep answers focused, brief, and concise. Lead with the answer; add the citation after.`;

  const personal = mine
    ? [
        `- Property: ${mine.property.address} in ${mine.property.name}`,
        mine.property.balance
          ? `- HOA fee: ${mine.property.balance}${mine.property.cadence ? ` ${mine.property.cadence.toLowerCase()}` : ""}${mine.property.due ? `, ${mine.property.overdue ? "PAST DUE since" : "due"} ${mine.property.due}` : ""}`
          : "- HOA fee: no billing on file yet",
        mine.requests.length
          ? `- Maintenance requests: ${mine.requests.slice(0, 5).map((r) => `${r.ref} ${r.title} (${r.status})`).join("; ")}`
          : "- Maintenance requests: none on file",
        mine.arcApps.length
          ? `- Architectural applications: ${mine.arcApps.slice(0, 4).map((a) => `${a.ref} ${a.title} (${a.status})`).join("; ")}`
          : "- Architectural applications: none",
        mine.notices.length
          ? `- Compliance notices: ${mine.notices.slice(0, 4).map((n) => `${n.title} (${n.status})`).join("; ")}`
          : "- Compliance notices: none — the property is in good standing",
        mine.reservations.length
          ? `- Amenity reservations: ${mine.reservations.slice(0, 4).map((r) => `${r.label} (${r.status})`).join("; ")}`
          : "- Amenity reservations: none",
        mine.ledger.length
          ? `- Recent ledger: ${mine.ledger.slice(0, 6).map((l) => `${l.date} ${l.label} ${l.amount}`).join("; ")}`
          : "- Ledger: no activity yet",
      ].join("\n")
    : "";

  // Staff get the whole portal: every collection the admin dashboard loads,
  // serialized compactly so questions about any owner, order, case or entry
  // can be answered from live data.
  let portalContext = "";
  if (isStaff) {
    const p = await loadPortalData();
    const cap = <T,>(arr: T[], n: number, fmt: (x: T) => string) =>
      arr.length
        ? arr.slice(0, n).map(fmt).join("\n") +
          (arr.length > n ? `\n… and ${arr.length - n} more` : "")
        : "- none";
    portalContext = [
      `Owners roster (${p.owners.length} homes):`,
      cap(p.owners, 400, (o) => `- ${o.name} · ${o.address} · ${o.account} · ${o.status}`),
      `\nWork orders (${p.work.length}):`,
      cap(p.work, 40, (w) => `- ${w.ref} ${w.title} — ${w.status}, ${w.assignee}`),
      `\nLedger (most recent of ${p.ledger.length}):`,
      cap(p.ledger, 25, (l) => `- ${l.dateLabel} ${l.kind} ${l.amount} ${l.category} — ${l.description}${l.ownerName ? ` (${l.ownerName})` : ""}`),
      `\nBank accounts:`,
      cap(p.bankAccounts, 10, (b) => `- ${b.institution || b.name} ····${b.mask} — ${b.balance}, ${b.status}`),
      `\nViolations (${p.violations.length}):`,
      cap(p.violations, 25, (v) => `- ${v.title} — ${v.status} (${v.date})`),
      `\nArchitectural applications (${p.arcApps.length}):`,
      cap(p.arcApps, 25, (a) => `- ${a.ref} ${a.title} — ${a.status}, owner ${a.owner}`),
      `\nBookings (${p.bookings.length}):`,
      cap(p.bookings, 20, (b) => `- ${b.date} ${b.amenity} — ${b.status}`),
      `\nLegal cases (${p.legalCases.length}):`,
      cap(p.legalCases, 15, (c) => `- ${c.owner} · ${c.address} — ${c.stage}, ${c.balance}`),
      `\nMeetings (${p.meetings.length}):`,
      cap(p.meetings, 15, (mt) => `- ${mt.date} ${mt.title} — ${mt.status}`),
      `\nVendors (${p.vendors.length}):`,
      cap(p.vendors, 20, (v) => `- ${v.name} (${v.trade}) — insurance ${v.insurance}`),
      `\nStaff (${p.staff.length}):`,
      cap(p.staff, 20, (st) => `- ${st.name} — ${st.role}${st.active ? "" : " (disabled)"}`),
      `\nRecent audit trail:`,
      cap(p.audit, 20, (a) => `- ${a.time} ${a.who}: ${a.text}`),
    ].join("\n");
  }

  const system = isStaff
    ? `You are the Unity Grid assistant for the Sofi Lakes residential association in Katy, Texas, embedded in the community's management portal and speaking with a staff member. Answer using the attached governing documents and the live portal data below — owners, work orders, finances, cases, everything the office tracks.

Live portal data:
${portalContext}

${shared}`
    : `You are the Unity Grid assistant for the Sofi Lakes residential association in Katy, Texas, embedded in the resident portal and speaking with the homeowner ${profile?.display_name?.trim() || "on file"}. Answer using the attached governing documents, the community data, and this homeowner's own records below. You know nothing about any other resident or the management company's internal records, and if asked, say that isn't available here.

This homeowner's records:
${personal}

${shared}`;

  type SystemPart = { type: "text"; text: string; cache_control?: { type: "ephemeral" } };
  type ORMsg = {
    role: "system" | "user" | "assistant";
    content: string | ContentPart[] | SystemPart[];
  };

  /* The governing instruments lead, marked for the provider's prompt cache.
     They are the same bytes on every question, so after the first one they
     are billed at a fraction — measured at ~90k prompt tokens a question, of
     which the instruments are ~55k. The question-specific half follows in its
     own uncached part; a cache breakpoint only covers the prefix before it. */
  const systemParts: SystemPart[] = groundingBlock
    ? [
        {
          type: "text",
          text: `The association's governing instruments, in full:\n\n${groundingBlock}`,
          cache_control: { type: "ephemeral" },
        },
        { type: "text", text: system },
      ]
    : [{ type: "text", text: system }];

  const messages: ORMsg[] = [
    { role: "system", content: systemParts },
    ...history.map((m, i): ORMsg => {
      if (m.role === "user" && i === history.length - 1 && docParts.length) {
        return { role: "user", content: [...docParts, { type: "text", text: m.content }] };
      }
      return { role: m.role, content: m.content };
    }),
  ];

  try {
    const res = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3001",
        "X-Title": "Unity Grid Assistant",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL,
        max_tokens: 2048,
        messages,
        // Native engine: the provider's own PDF understanding reads the
        // scanned documents; no lossy text pre-extraction.
        plugins: docParts.length
          ? [{ id: "file-parser", pdf: { engine: "native" } }]
          : undefined,
      }),
    });

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
      error?: { message?: string };
    };
    if (!res.ok || data.error) {
      return NextResponse.json(
        {
          error: `The assistant hit a provider error${data.error?.message ? `: ${data.error.message}` : ` (${res.status})`}. Try again in a moment.`,
        },
        { status: 502 },
      );
    }

    const answer = (data.choices?.[0]?.message?.content ?? "").trim();
    return NextResponse.json({
      answer: answer || "I couldn't put together an answer — try rephrasing the question.",
      sources: attached.map((d) => d.title),
    });
  } catch {
    return NextResponse.json(
      { error: "The assistant couldn't be reached. Try again in a moment." },
      { status: 502 },
    );
  }
}
