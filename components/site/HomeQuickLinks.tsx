"use client";

import Link from "next/link";
import { useState } from "react";

import { COMMUNITIES } from "@/lib/accounts/account-number";

/**
 * The home page's quick-links box. The maintenance tile expands in place into
 * a compact request form (posting to /api/contact with the maintenance topic);
 * the other tiles stay plain links. The expansion animates with the
 * grid-rows 0fr→1fr trick, so height stays intrinsic — no measured pixels.
 */

const FIELD =
  "w-full rounded-[10px] border border-outline-strong bg-surface-container-low px-3.5 py-3 text-base text-on-surface placeholder:text-outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
const LABEL = "mb-2 block text-sm text-on-surface-variant";

const TILE =
  "grid w-full grid-cols-[minmax(0,1fr)_auto] items-baseline gap-4 bg-surface-container-lowest px-[22px] py-5 text-left text-on-surface transition-colors hover:bg-surface-container-high";

const STATIC_LINKS = [
  {
    href: "/governance",
    title: "Bylaws, CC&Rs and rules",
    detail: "Every governing document, current and downloadable.",
  },
  {
    href: "/services",
    title: "What Unity Grid handles",
    detail: "Finances, grounds, rules and records for your association.",
  },
] as const;

export function HomeQuickLinks() {
  const [open, setOpen] = useState(false);
  const [community, setCommunity] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!community) return setError("Pick your community.");
    if (!name.trim()) return setError("Add your name.");
    if (!email.trim()) return setError("Add an email — the office replies there.");
    if (!message.trim()) return setError("Tell us what needs attention.");
    setError(null);
    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          community,
          name: name.trim(),
          email: email.trim(),
          topic: "maintenance",
          phone: phone.trim(),
          message: message.trim(),
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "The request could not be sent — please call the office.");
        return;
      }
      setSent(true);
    } catch {
      setError("The request could not be sent — please call the office.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-px overflow-hidden rounded-[14px] border border-outline-variant bg-outline-variant">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={TILE}
      >
        <span>
          <strong className="text-base font-semibold">
            File a maintenance request
          </strong>
          <span className="mt-[3px] block text-sm text-on-surface-variant">
            Common areas, gates, lighting and amenities.
          </span>
        </span>
        <span
          aria-hidden
          className="font-label text-xs text-secondary-muted transition-transform duration-200"
          style={{ transform: open ? "rotate(90deg)" : "none" }}
        >
          →
        </span>
      </button>

      <div
        className="grid bg-surface-container-lowest transition-[grid-template-rows] duration-300 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          {sent ? (
            <div className="px-[22px] py-6">
              <p className="font-label text-[11px] uppercase tracking-[0.12em] text-outline">
                Request sent
              </p>
              <p className="mt-2.5 max-w-[52ch] text-[15px] leading-relaxed text-on-surface-variant">
                Thanks — the office replies within one business day. Anything
                urgent should go to 713-208-3539.
              </p>
            </div>
          ) : (
            <form onSubmit={submit} className="grid gap-4 px-[22px] pt-2 pb-6">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
                <label className="block w-full">
                  <span className={LABEL}>Community</span>
                  <select
                    className={`${FIELD} cursor-pointer appearance-none`}
                    value={community}
                    onChange={(e) => setCommunity(e.target.value)}
                  >
                    <option value="">Select…</option>
                    {COMMUNITIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block w-full">
                  <span className={LABEL}>Your name</span>
                  <input
                    className={FIELD}
                    placeholder="First and last"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </label>
                <label className="block w-full">
                  <span className={LABEL}>Email</span>
                  <input
                    className={FIELD}
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                <label className="block w-full">
                  <span className={LABEL}>Phone</span>
                  <input
                    className={FIELD}
                    type="tel"
                    placeholder="(713) 555-0100"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </label>
              </div>
              <label className="block">
                <span className={LABEL}>What needs attention?</span>
                <textarea
                  className={FIELD}
                  rows={3}
                  placeholder="Where is it, and what's wrong?"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </label>
              {error ? (
                <p className="text-sm text-status-critical" role="alert">
                  {error}
                </p>
              ) : null}
              <button
                type="submit"
                disabled={sending}
                className="w-full rounded-[10px] bg-secondary py-[13px] text-base font-medium text-on-secondary hover:bg-secondary-hover disabled:cursor-default disabled:opacity-60"
              >
                {sending ? "Sending…" : "Send request"}
              </button>
            </form>
          )}
        </div>
      </div>

      {STATIC_LINKS.map((item) => (
        <Link key={item.title} href={item.href} className={TILE}>
          <span>
            <strong className="text-base font-semibold">{item.title}</strong>
            <span className="mt-[3px] block text-sm text-on-surface-variant">
              {item.detail}
            </span>
          </span>
          <span aria-hidden className="font-label text-xs text-secondary-muted">
            →
          </span>
        </Link>
      ))}
    </div>
  );
}
