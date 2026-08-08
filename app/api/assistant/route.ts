import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

import { DOCUMENTS_BUCKET } from "@/lib/supabase/documents";
import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { requireServiceSupabase } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

/**
 * The Unity Grid assistant: a floating Q&A grounded in the association's
 * real records — the document library (CC&Rs, bylaws, policies — attached
 * to Claude as PDFs, since the recorded copies are scans), the fee
 * schedule, and community facts. Signed-in users only; answers cite the
 * documents they came from.
 */

export const maxDuration = 120;

type ChatMsg = { role: "user" | "assistant"; content: string };

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

  if (!process.env.ANTHROPIC_API_KEY?.trim()) {
    return NextResponse.json(
      {
        error:
          "The assistant isn't configured yet — add ANTHROPIC_API_KEY to the environment and restart.",
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

  const service = requireServiceSupabase();
  const [docsRes, feesRes, lotsCount] = await Promise.all([
    service
      .from("documents")
      .select("id, title, file_path, file_size_bytes, tags, document_categories(name)")
      .eq("is_archived", false),
    service.from("fee_schedule").select("name, amount_cents, category, active").order("sort"),
    service.from("lots").select("id", { count: "exact", head: true }),
  ]);

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

  const docBlocks: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const d of attached) {
    const { data: blob } = await service.storage.from(DOCUMENTS_BUCKET).download(d.file_path);
    if (!blob) continue;
    const b64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
    docBlocks.push({
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: b64 },
      title: d.title,
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

  const system = `You are the Unity Grid assistant for the Sofi Lakes residential association in Katy, Texas, embedded in the community's management portal. Answer questions from residents and staff using the attached governing documents and the live data below. Cite the document you drew from by title. If the answer isn't in the documents or data, say so plainly and suggest contacting the management office — never guess at rules, deadlines, or dollar amounts.

Community facts:
- ${lotsCount.count ?? "—"} lots on the roster in Sofi Lakes (Katy, Texas 77493).

Fee schedule (authoritative amounts):
${fees || "- No fees recorded yet."}

Documents in the library (the most relevant are attached as PDFs to this conversation):
${catalog || "- None yet."}

Keep answers focused, brief, and concise. Lead with the answer; add the citation after.`;

  const client = new Anthropic();
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((m, i) => {
    if (m.role === "user" && i === history.length - 1 && docBlocks.length) {
      return {
        role: "user" as const,
        content: [...docBlocks, { type: "text" as const, text: m.content }],
      };
    }
    return { role: m.role, content: m.content };
  });

  try {
    // Server-side fallback: if Opus 5's safety classifiers decline a benign
    // question, the API retries it on the recommended fallback model.
    const response = await client.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 2048,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system,
      messages,
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({
        answer:
          "I can't help with that question. For anything about the association, try rephrasing — or contact the management office directly.",
        sources: [] as string[],
      });
    }

    const answer = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return NextResponse.json({
      answer: answer || "I couldn't put together an answer — try rephrasing the question.",
      sources: attached.map((d) => d.title),
    });
  } catch (e) {
    const message =
      e instanceof Anthropic.APIError
        ? `The assistant hit an API error (${e.status ?? "network"}). Try again in a moment.`
        : "The assistant couldn't answer just now. Try again in a moment.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
