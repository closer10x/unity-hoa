"use client";

import { useState } from "react";

import { COMMUNITIES } from "@/lib/accounts/account-number";

const FIELD =
  "w-full rounded-[10px] border border-outline-strong bg-surface-container-low px-3.5 py-3 text-base text-on-surface placeholder:text-outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
const LABEL = "mb-2 block text-sm text-on-surface-variant";

const TOPICS = [
  { value: "dues", label: "Dues or billing" },
  { value: "arc", label: "Architectural application" },
  { value: "violation", label: "A violation notice" },
  { value: "board", label: "Message for the board" },
  { value: "committee", label: "Joining a committee" },
  { value: "other", label: "Something else" },
] as const;

/**
 * Contact form from the design. FRONTEND ONLY — nothing is sent; the app has a
 * maintenance-request endpoint but no general contact route yet.
 */
export function ContactForm() {
  const [community, setCommunity] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [topic, setTopic] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!community) return setError("Pick your community.");
    if (!name.trim()) return setError("Add your name.");
    if (!email.trim()) return setError("Add an email — the office replies there.");
    if (!body.trim()) return setError("Tell us what you need.");
    setError(null);
    setSent(true);
  }

  if (sent) {
    return (
      <div className="rounded-[18px] border border-outline-variant bg-surface-container-lowest p-6 sm:p-[30px]">
        <p className="font-label text-[11px] uppercase tracking-[0.12em] text-outline">
          Message sent
        </p>
        <p className="mt-3 mb-6 text-[17px] leading-relaxed text-on-surface-variant text-pretty">
          Thanks — the office replies within one business day. Anything urgent
          should go to the phone line below.
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setName("");
            setEmail("");
            setTopic("");
            setBody("");
          }}
          className="rounded-[10px] border border-outline-strong px-5 py-3 text-base text-on-surface hover:border-outline"
        >
          Write another message
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="grid gap-4 rounded-[18px] border border-outline-variant bg-surface-container-lowest p-6 sm:p-[30px]"
    >
      <label className="block">
        <span className={LABEL}>Community</span>
        <select
          className={`${FIELD} cursor-pointer appearance-none`}
          value={community}
          onChange={(e) => setCommunity(e.target.value)}
        >
          <option value="">Select your community…</option>
          {COMMUNITIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] justify-items-start gap-4">
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
      </div>

      <label className="block">
        <span className={LABEL}>What&apos;s this about?</span>
        <select
          className={`${FIELD} cursor-pointer appearance-none`}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        >
          <option value="">Select a topic…</option>
          {TOPICS.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={LABEL}>Message</span>
        <textarea
          className={FIELD}
          rows={5}
          placeholder="Tell us what you need."
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>

      {error ? (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        className="w-full rounded-[10px] bg-secondary py-[15px] text-base font-medium text-on-secondary hover:bg-secondary-hover"
      >
        Send message
      </button>
    </form>
  );
}
