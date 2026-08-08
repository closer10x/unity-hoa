"use client";

import React, { useEffect, useRef, useState } from "react";

import { color, font, radius } from "@/lib/admin-portal/tokens";

/**
 * The floating Unity Grid assistant — bottom right on every signed-in page.
 * A messenger-style panel over /api/assistant: answers are grounded in the
 * association's documents, fee schedule and live community data.
 */

type Msg = { role: "user" | "assistant"; content: string; sources?: string[] };

/**
 * Minimal markdown for answers: bold, italics and links (citations open the
 * cited document at its exact page). Everything is HTML-escaped first; only
 * same-origin and https links are allowed.
 */
function renderAnswer(text: string): string {
  const escaped = text
    .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
  return escaped
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label: string, url: string) => {
      if (!url.startsWith("/") && !url.startsWith("https://")) return m;
      return `<a href="${url}" target="_blank" rel="noopener" style="color: oklch(0.42 0.05 155); text-decoration: underline;">${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
}

/** AI sparkle, drawn in white for the launcher button. */
function Mark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="oklch(0.99 0.004 130)" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden focusable={false}>
      <path d="M11 4l1.7 4.6a2 2 0 0 0 1.2 1.2L18.5 11.5l-4.6 1.7a2 2 0 0 0-1.2 1.2L11 19l-1.7-4.6a2 2 0 0 0-1.2-1.2L3.5 11.5l4.6-1.7a2 2 0 0 0 1.2-1.2z" />
      <path d="M18.5 3.5v4M16.5 5.5h4" opacity={0.8} />
    </svg>
  );
}

export default function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [error, setError] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setError("");
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = (await res.json()) as { answer?: string; sources?: string[]; error?: string };
      if (!res.ok || !data.answer) {
        setError(data.error ?? "The assistant couldn't answer just now.");
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.answer!, sources: data.sources },
        ]);
      }
    } catch {
      setError("The assistant couldn't be reached. Check the connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {open ? (
        <div
          style={{
            position: "fixed", bottom: 96, right: 24, zIndex: 60,
            width: "min(400px, calc(100vw - 32px))",
            height: "min(560px, calc(100dvh - 140px))",
            display: "flex", flexDirection: "column",
            background: color.surface,
            border: `1px solid ${color.hairline}`,
            borderRadius: radius.card,
            boxShadow: "0 24px 64px oklch(0.3 0.02 150 / 0.22)",
            overflow: "hidden",
          }}
        >
          <div style={{
            padding: "16px 20px", background: color.accent,
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Mark size={18} />
              <span style={{ color: "oklch(0.97 0.008 140)", fontSize: 15, fontWeight: 600 }}>
                Unity Grid Assistant
              </span>
            </span>
            <button type="button" onClick={() => setOpen(false)}
              aria-label="Close the assistant"
              style={{ background: "none", border: "none", color: "oklch(0.9 0.02 145)", font: "inherit", fontSize: 14, cursor: "pointer" }}>
              Close
            </button>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", padding: 18, display: "grid", gap: 12, alignContent: "start" }}>
            {messages.length === 0 ? (
              <div style={{ fontSize: 14, lineHeight: 1.6, color: color.inkTertiary }}>
                Ask about the association&rsquo;s rules and documents — fences, pools, solar panels,
                flags, fees, collections. Answers come from the recorded documents and the live
                fee schedule, with the source named.
              </div>
            ) : null}
            {messages.map((m, i) => (
              <div key={i} style={{ display: "grid", gap: 4, justifyItems: m.role === "user" ? "end" : "start" }}>
                m.role === "assistant" ? (
                  <div style={{
                    maxWidth: "88%",
                    background: color.surfaceSunken,
                    border: `1px solid ${color.hairlineSoft}`,
                    borderRadius: radius.xl, padding: "10px 14px",
                    fontSize: 14.5, lineHeight: 1.55, whiteSpace: "pre-wrap",
                  }}
                    dangerouslySetInnerHTML={{ __html: renderAnswer(m.content) }}
                  />
                ) : (
                  <div style={{
                    maxWidth: "88%",
                    background: color.accentTint,
                    border: `1px solid ${color.accentTintBorder}`,
                    borderRadius: radius.xl, padding: "10px 14px",
                    fontSize: 14.5, lineHeight: 1.55, whiteSpace: "pre-wrap",
                  }}>
                    {m.content}
                  </div>
                )
                {m.sources?.length ? (
                  <span style={{ fontFamily: font.mono, fontSize: 11, color: color.inkQuaternary }}>
                    Read: {m.sources.join(" · ")}
                  </span>
                ) : null}
              </div>
            ))}
            {busy ? (
              <span style={{ fontFamily: font.mono, fontSize: 12, color: color.inkQuaternary }}>
                Reading the documents…
              </span>
            ) : null}
            {error ? (
              <span style={{ fontSize: 13.5, color: color.critical }}>{error}</span>
            ) : null}
          </div>

          <div style={{ padding: 14, borderTop: `1px solid ${color.hairlineSoft}`, display: "flex", gap: 10 }}>
            <input
              type="text"
              value={input}
              placeholder="Ask about rules, fees, documents…"
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(); }}
              style={{
                flex: 1, font: "inherit", fontSize: 14.5, color: color.ink,
                background: color.surfaceSunken, border: `1px solid ${color.borderInput}`,
                borderRadius: radius.md, padding: "11px 14px",
              }}
            />
            <button type="button" onClick={send}
              style={{
                font: "inherit", fontSize: 14.5, fontWeight: 500, cursor: "pointer",
                background: busy ? color.neutral : color.accent, color: "oklch(0.97 0.008 140)",
                border: "none", borderRadius: radius.md, padding: "0 18px",
              }}>
              {busy ? "…" : "Ask"}
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close the Unity Grid assistant" : "Open the Unity Grid assistant"}
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 61,
          width: 56, height: 56, borderRadius: 999,
          background: color.accent, border: "none", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 10px 28px oklch(0.3 0.03 150 / 0.35)",
        }}
      >
        <Mark />
      </button>
    </>
  );
}
