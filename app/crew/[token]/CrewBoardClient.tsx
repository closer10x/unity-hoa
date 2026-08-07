"use client";

import { useState, useTransition } from "react";

import type { CrewBoard, CrewJob } from "@/lib/crew/links";

import { addFieldNote, markJobComplete, uploadFieldPhoto } from "./actions";

/**
 * The field board a tech opens from their texted link.
 *
 * Designed for one thumb at a property: large targets, one job per card, and
 * every action reachable without scrolling past the job it belongs to.
 * Uses the site's semantic tokens so it matches the portal without importing
 * the portal's shell.
 */

const PRIORITY_TONE: Record<string, string> = {
  urgent: "text-status-critical",
  high: "text-status-attention",
};

function dayLabel(iso: string | null): string {
  if (!iso) return "No date set";
  const d = new Date(iso);
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  const label = d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return same ? `Today · ${label}` : label;
}

function JobCard({ job, token }: { job: CrewJob; token: string }) {
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, start] = useTransition();

  const say = (r: { ok: true } | { error: string }, good: string) => {
    if ("error" in r) { setErr(r.error); setMsg(null); }
    else { setMsg(good); setErr(null); }
  };

  return (
    <article className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-label text-xs text-secondary-muted">{job.ref}</span>
        <span className={`font-label text-xs ${PRIORITY_TONE[job.priority.toLowerCase()] ?? "text-status-neutral"}`}>
          {job.priority}
        </span>
      </div>

      <h2 className="mt-2 text-xl leading-snug font-semibold">{job.title}</h2>
      {job.location ? (
        <p className="mt-1 text-base text-on-surface-variant">{job.location}</p>
      ) : null}
      {job.description ? (
        <p className="mt-3 text-[15px] leading-relaxed text-on-surface-variant">
          {job.description}
        </p>
      ) : null}

      <dl className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 border-t border-hairline-soft pt-4">
        <div>
          <dt className="font-label text-[11px] uppercase tracking-[0.12em] text-outline">Due</dt>
          <dd className="mt-1 text-[15px]">{dayLabel(job.dueAt)}</dd>
        </div>
        <div>
          <dt className="font-label text-[11px] uppercase tracking-[0.12em] text-outline">Photos</dt>
          <dd className="mt-1 text-[15px]">{job.photoCount}</dd>
        </div>
      </dl>

      {job.notes.length > 0 ? (
        <div className="mt-4 grid gap-2 border-t border-hairline-soft pt-4">
          {job.notes.slice(0, 4).map((n) => (
            <p key={n.id} className="text-[15px] leading-relaxed">
              {n.body}
              <span className="mt-0.5 block font-label text-xs text-outline">
                {n.author} · {n.at}
              </span>
            </p>
          ))}
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 border-t border-hairline-soft pt-4">
        <label className="block">
          <span className="mb-2 block text-sm text-on-surface-variant">Add a note</span>
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What you found, what you did."
            className="w-full rounded-[10px] border border-outline-strong bg-surface-container-low px-3.5 py-3 text-base"
          />
        </label>

        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              start(async () => {
                say(await addFieldNote(token, job.id, note), "Note saved.");
                setNote("");
              })
            }
            className="min-h-11 rounded-[10px] border border-outline-strong px-4 text-base text-on-surface disabled:opacity-60"
          >
            Save note
          </button>

          {/* capture opens the rear camera on a phone; desktop falls back to a picker. */}
          <label className="min-h-11 cursor-pointer rounded-[10px] border border-outline-strong px-4 py-2.5 text-base text-on-surface">
            Take a photo
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const fd = new FormData();
                fd.append("photo", f);
                start(async () => say(await uploadFieldPhoto(token, job.id, fd), "Photo uploaded."));
              }}
            />
          </label>

          {!confirming ? (
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(true)}
              className="min-h-11 rounded-[10px] bg-secondary px-4 text-base font-medium text-on-secondary disabled:opacity-60"
            >
              Mark complete
            </button>
          ) : null}
        </div>

        {confirming ? (
          <div className="rounded-xl border border-accent-tint-border bg-confirm-bar p-4">
            <p className="text-[15px] leading-relaxed text-on-secondary-container">
              Are you sure this job is finished? The office is notified and the
              work order closes. Add your photos and notes first.
            </p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  start(async () => {
                    say(await markJobComplete(token, job.id), "Job closed.");
                    setConfirming(false);
                  })
                }
                className="min-h-11 rounded-[10px] bg-secondary px-4 text-base font-medium text-on-secondary"
              >
                Yes, it&apos;s complete
              </button>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="min-h-11 rounded-[10px] border border-outline-strong px-4 text-base"
              >
                Not yet
              </button>
            </div>
          </div>
        ) : null}

        {msg ? <p className="text-[15px] text-status-positive">{msg}</p> : null}
        {err ? <p className="text-[15px] text-status-critical" role="alert">{err}</p> : null}
      </div>
    </article>
  );
}

export function CrewBoardClient({ board, token }: { board: CrewBoard; token: string }) {
  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-6 sm:px-6">
      <header className="mb-6">
        <p className="font-label text-[11px] uppercase tracking-[0.12em] text-outline">
          Unity Grid · Field
        </p>
        <h1 className="mt-2 text-[clamp(24px,5vw,32px)] font-semibold tracking-[-0.024em]">
          {board.employee.name}
        </h1>
        <p className="mt-1 text-base text-on-surface-variant">
          {board.jobs.length === 0
            ? "Nothing assigned right now."
            : `${board.jobs.length} open ${board.jobs.length === 1 ? "job" : "jobs"}${board.employee.role ? ` · ${board.employee.role}` : ""}`}
        </p>
      </header>

      <div className="grid gap-4">
        {board.jobs.map((j) => (
          <JobCard key={j.id} job={j} token={token} />
        ))}
      </div>

      <p className="mt-8 text-sm leading-relaxed text-on-surface-variant">
        This link is personal to you. Anything you save here is stamped with
        your name and goes straight to the office.
      </p>
    </main>
  );
}
