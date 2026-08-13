"use client";

import React from "react";

import { SMS_CONSENT_TEXT } from "@/lib/signup/consent";

import { searchHomes, submitResidentSignup, type HomeOption } from "./actions";

/**
 * The public sign-up form.
 *
 * Written for somebody standing in their kitchen with a letter in one hand,
 * so: five fields, plain words, and the address picked from the roster
 * rather than typed. Picking is what makes the office's side a one-click
 * approval instead of a matching exercise — and it is the product rule about
 * structured addresses applied to a stranger's keyboard.
 *
 * Nothing here creates an account. The form says so, because a household
 * that thinks it has signed in will try to sign in.
 */

const inputCls =
  /* 16px so iOS does not zoom the page on focus; h-12 clears 44px. */
  "h-12 w-full rounded-lg border border-[#D8D4C6] bg-white px-3.5 text-[16px] text-ink";

function Label({
  children,
  hint,
  htmlFor,
}: {
  children: React.ReactNode;
  hint?: string;
  htmlFor: string;
}) {
  return (
    <span className="mb-[7px] block">
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-body">
        {children}
      </label>
      {hint ? <span className="mt-0.5 block text-[13px] text-faint">{hint}</span> : null}
    </span>
  );
}

/** US formatting as they type — "(832) 302-5722". */
function formatUsPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  if (!d) return "";
  if (d.length < 4) return `(${d}`;
  if (d.length < 7) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

function HomePicker({
  chosen,
  onChoose,
}: {
  chosen: HomeOption | null;
  onChoose: (home: HomeOption | null) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [options, setOptions] = React.useState<HomeOption[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  /* Debounced: a search runs on the server, and one per keystroke would be
     both wasteful and out of order by the time the answers came back. */
  React.useEffect(() => {
    const q = query.trim();
    if (chosen || q.length < 2) {
      setOptions([]);
      return;
    }
    let live = true;
    setSearching(true);
    const t = window.setTimeout(async () => {
      const found = await searchHomes(q);
      if (!live) return;
      setOptions(found);
      setSearching(false);
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [query, chosen]);

  if (chosen) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line bg-tint px-4 py-3">
        <span className="font-label text-[14px] text-ink">{chosen.label}</span>
        <button
          type="button"
          className="min-h-11 text-sm font-semibold text-moss underline-offset-4 hover:underline"
          onClick={() => {
            onChoose(null);
            setQuery("");
            setTouched(false);
          }}
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div>
      <input
        id="home"
        className={inputCls}
        value={query}
        autoComplete="off"
        placeholder="Start typing your street or lot number"
        onChange={(e) => {
          setQuery(e.target.value);
          setTouched(true);
        }}
      />
      {options.length > 0 ? (
        <ul className="mt-2 grid gap-1 rounded-lg border border-line bg-white p-1.5">
          {options.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className="w-full rounded-md px-3 py-3 text-left font-label text-[14px] text-ink hover:bg-tint"
                onClick={() => onChoose(o)}
              >
                {o.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {touched && !searching && query.trim().length >= 2 && options.length === 0 ? (
        <p className="mt-2 text-[13px] leading-[1.6] text-muted">
          No home matches that. Try just the street name, or the lot number on
          your statement. If it still isn&rsquo;t there, call the office and
          we&rsquo;ll add you.
        </p>
      ) : null}
    </div>
  );
}

export function JoinForm() {
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [smsOptIn, setSmsOptIn] = React.useState(false);
  const [home, setHome] = React.useState<HomeOption | null>(null);
  const [note, setNote] = React.useState("");
  const [website, setWebsite] = React.useState("");

  const [error, setError] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [done, setDone] = React.useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    setError("");
    const res = await submitResidentSignup({
      firstName, lastName, email, phone, smsOptIn, note, website,
      lotId: home?.id ?? "",
    });
    setSending(false);
    if (!res.ok) return setError(res.error);
    setDone(res.home);
  }

  if (done !== null) {
    return (
      <div className="rounded-2xl border border-line bg-white p-8">
        <h2 className="font-display text-2xl font-semibold tracking-[-0.02em]">
          Thank you — that&rsquo;s with the office
        </h2>
        <p className="mt-3 text-[15px] leading-[1.6] text-body">
          We have your request{done ? ` for ${done}` : ""}. Someone will check it
          against the ownership record, and once it is approved you&rsquo;ll get
          an email with a link to choose your password. That usually happens the
          same business day.
        </p>
        <p className="mt-4 text-[13px] leading-[1.6] text-muted">
          Nothing to do until then — and there is no account to sign in to yet.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid gap-5 rounded-2xl border border-line bg-white p-8">
      {/* Two boxes, not one: a full name typed into a single field has to be
          split again by whoever writes to them, and "Garcia Alvarez" splits
          wrong. */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-5">
        <div>
          <Label htmlFor="firstName">First name</Label>
          <input id="firstName" className={inputCls} value={firstName} autoComplete="given-name"
            onChange={(e) => setFirstName(e.target.value)} placeholder="Jon" />
        </div>
        <div>
          <Label htmlFor="lastName">Last name</Label>
          <input id="lastName" className={inputCls} value={lastName} autoComplete="family-name"
            onChange={(e) => setLastName(e.target.value)} placeholder="Garcia" />
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(210px,1fr))] gap-5">
        <div>
          <Label htmlFor="email" hint="Where we send your sign-in link">Email</Label>
          <input id="email" type="email" className={inputCls} value={email} autoComplete="email"
            onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
        </div>
        <div>
          <Label htmlFor="phone" hint="Optional, unless you want texts">Mobile number</Label>
          <input id="phone" type="tel" className={inputCls} value={phone} autoComplete="tel"
            onChange={(e) => setPhone(formatUsPhone(e.target.value))} placeholder="(713) 555-0100" />
        </div>
      </div>

      <div>
        <Label htmlFor="home" hint="Pick it from the list so we can match your account">
          Your home
        </Label>
        <HomePicker chosen={home} onChoose={setHome} />
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-paper p-4">
        <input
          type="checkbox"
          checked={smsOptIn}
          onChange={(e) => setSmsOptIn(e.target.checked)}
          className="mt-0.5 h-5 w-5 flex-none accent-[#5A6B3C]"
        />
        <span className="text-[14px] leading-[1.55] text-body">{SMS_CONSENT_TEXT}</span>
      </label>

      <div>
        <Label htmlFor="note" hint="Optional">Anything we should know</Label>
        <textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)}
          className="w-full rounded-lg border border-[#D8D4C6] bg-white px-3.5 py-3 text-[16px] text-ink"
          placeholder="A second owner on the deed, a management company, a new closing date…" />
      </div>

      {/* Honeypot. Hidden from people, irresistible to form bots. */}
      <input
        type="text" tabIndex={-1} autoComplete="off" aria-hidden value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute h-px w-px overflow-hidden opacity-0"
        style={{ clip: "rect(0 0 0 0)" }}
      />

      {error ? (
        <p className="rounded-lg bg-[#F3E2E0] px-4 py-3 text-[14px] leading-[1.5] text-[#8C4A40]">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={sending}
        className="inline-flex min-h-12 items-center justify-center justify-self-start rounded-lg bg-ink px-6 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-moss disabled:opacity-60"
      >
        {sending ? "Sending…" : "Request access"}
      </button>

      <p className="text-[13px] leading-[1.6] text-muted">
        This does not create an account. The office checks every request against
        the ownership record first — you&rsquo;ll hear from us by email.
      </p>
    </form>
  );
}
