import { NextResponse } from "next/server";

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
const STOPWORDS = new Set([
  "the","a","an","and","or","of","to","in","on","for","is","are","what","how",
  "can","i","my","our","we","do","does","about","with","at","it","me","you",
]);

function score(question: string, haystack: string): number {
  const words = question.toLowerCase().split(/[^a-z0-9&]+/).filter((w) => w.length > 2 && !STOPWORDS.has(w));
  const hay = haystack.toLowerCase();
  return words.reduce((s, w) => s + (hay.includes(w) ? 1 : 0), 0);
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
    .select("id, title, file_path, file_size_bytes, tags, access_level, document_categories(name)")
    .eq("is_archived", false);
  if (!isStaff) {
    docsQuery = docsQuery.in("access_level", ["public", "resident"]);
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
    document_categories: { name?: string } | null;
  };
  const docs = (docsRes.data ?? []) as unknown as DocRow[];

  // Pick the documents most relevant to the question, within the size budget.
  const ranked = docs
    .map((d) => ({
      doc: d,
      s: score(question, `${d.title} ${d.document_categories?.name ?? ""} ${(d.tags ?? []).join(" ")}`),
    }))
    .filter((r) => r.s > 0)
    .sort((a, b) => b.s - a.s);
  const attached: DocRow[] = [];
  let budget = MAX_DOC_BYTES;
  for (const r of ranked) {
    if (attached.length >= 2) break;
    if (r.doc.file_size_bytes <= budget) {
      attached.push(r.doc);
      budget -= r.doc.file_size_bytes;
    }
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
  const catalog = docs
    .map((d) => `- ${d.title} (${d.document_categories?.name ?? "General"})`)
    .join("\n");

  const shared = `Cite the document you drew from by title. If the answer isn't in the documents or data, say so plainly and suggest contacting the management office — never guess at rules, deadlines, or dollar amounts.

Fee schedule (authoritative amounts):
${fees || "- No fees recorded yet."}

Documents in the library (the most relevant are attached as PDFs to this conversation):
${catalog || "- None yet."}

Keep answers focused, brief, and concise. Lead with the answer; add the citation after.`;

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

  const system = isStaff
    ? `You are the Unity Grid assistant for the Sofi Lakes residential association in Katy, Texas, embedded in the community's management portal and speaking with a staff member. Answer using the attached governing documents and the live data below.

${shared}`
    : `You are the Unity Grid assistant for the Sofi Lakes residential association in Katy, Texas, embedded in the resident portal and speaking with the homeowner ${profile?.display_name?.trim() || "on file"}. Answer using the attached governing documents, the community data, and this homeowner's own records below. You know nothing about any other resident or the management company's internal records, and if asked, say that isn't available here.

This homeowner's records:
${personal}

${shared}`;

  type ORMsg = { role: "system" | "user" | "assistant"; content: string | ContentPart[] };
  const messages: ORMsg[] = [
    { role: "system", content: system },
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
