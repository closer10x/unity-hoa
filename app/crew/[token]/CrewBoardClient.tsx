"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import type { CrewBoard, CrewJob } from "@/lib/crew/links";

import { addFieldNote, markJobComplete, uploadFieldPhoto } from "./actions";

/**
 * The field board a tech opens from their texted link.
 *
 * Two screens, not one long scroll: a list of their jobs, and a detail view
 * that slides in from the right when they tap one. Standing at a property on
 * a phone, the list answers "what's left" at a glance, and the detail holds
 * everything for the job in hand without scrolling past three others.
 *
 * Back is wired to browser history, so the phone's own back gesture returns
 * to the list — a tech should never have to hunt for a way out of a job.
 *
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

/** "Aug 7, 4:12 PM" — the stamp format used across the portal. */
function stamp(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ─── List ─────────────────────────────────────────────────────────── */

function JobRow({ job, onOpen }: { job: CrewJob; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-2xl border border-outline-variant bg-surface-container-lowest p-4 text-left"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <span className="font-label text-xs text-secondary-muted">{job.ref}</span>
        <span
          className={`font-label text-xs ${
            job.done
              ? "text-status-positive"
              : PRIORITY_TONE[job.priority.toLowerCase()] ?? "text-status-neutral"
          }`}
        >
          {job.done ? "Done" : job.priority}
        </span>
      </div>

      <h2 className="mt-1.5 text-lg leading-snug font-semibold">{job.title}</h2>
      {job.location ? (
        <p className="mt-0.5 text-[15px] text-on-surface-variant">{job.location}</p>
      ) : null}

      {/* The short view: when it landed, when it closed, what's attached. */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-label text-xs text-outline">
        <span>{job.done ? `Closed ${stamp(job.completedAt)}` : `Assigned ${stamp(job.assignedAt)}`}</span>
        {!job.done && job.dueAt ? <span>Due {dayLabel(job.dueAt)}</span> : null}
        {job.photoCount > 0 ? (
          <span>{job.photoCount} {job.photoCount === 1 ? "photo" : "photos"}</span>
        ) : null}
        {job.notes.length > 0 ? (
          <span>{job.notes.length} {job.notes.length === 1 ? "note" : "notes"}</span>
        ) : null}
      </div>
    </button>
  );
}

/* ─── Detail ───────────────────────────────────────────────────────── */

function JobDetail({
  job,
  token,
  onBack,
}: {
  job: CrewJob;
  token: string;
  onBack: () => void;
}) {
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
    <section className="animate-slide-in-right motion-reduce:animate-none">
      <button
        type="button"
        onClick={onBack}
        className="min-h-11 font-label text-xs uppercase tracking-[0.12em] text-secondary-muted"
      >
        &larr; All jobs
      </button>

      <article className="mt-2 rounded-2xl border border-outline-variant bg-surface-container-lowest p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="font-label text-xs text-secondary-muted">{job.ref}</span>
          <span
            className={`font-label text-xs ${
              job.done
                ? "text-status-positive"
                : PRIORITY_TONE[job.priority.toLowerCase()] ?? "text-status-neutral"
            }`}
          >
            {job.done ? "Done" : job.priority}
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
            <dt className="font-label text-[11px] uppercase tracking-[0.12em] text-outline">Assigned</dt>
            <dd className="mt-1 font-label text-[13px]">{stamp(job.assignedAt)}</dd>
          </div>
          <div>
            <dt className="font-label text-[11px] uppercase tracking-[0.12em] text-outline">Due</dt>
            <dd className="mt-1 text-[15px]">{dayLabel(job.dueAt)}</dd>
          </div>
          {job.done ? (
            <div>
              <dt className="font-label text-[11px] uppercase tracking-[0.12em] text-outline">Completed</dt>
              <dd className="mt-1 font-label text-[13px] text-status-positive">{stamp(job.completedAt)}</dd>
            </div>
          ) : null}
          <div>
            <dt className="font-label text-[11px] uppercase tracking-[0.12em] text-outline">Photos</dt>
            <dd className="mt-1 text-[15px]">{job.photoCount}</dd>
          </div>
        </dl>

        {job.notes.length > 0 ? (
          <div className="mt-4 grid gap-2 border-t border-hairline-soft pt-4">
            {job.notes.map((n) => (
              <p key={n.id} className="text-[15px] leading-relaxed">
                {n.body}
                <span className="mt-0.5 block font-label text-xs text-outline">
                  {n.author} · {n.at}
                </span>
              </p>
            ))}
          </div>
        ) : null}

        {job.done ? (
          <p className="mt-4 border-t border-hairline-soft pt-4 text-[15px] text-on-surface-variant">
            This job is closed. Call the office if something needs reopening.
          </p>
        ) : (
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
        )}
      </article>
    </section>
  );
}

/* ─── Board ────────────────────────────────────────────────────────── */

export function CrewBoardClient({ board, token }: { board: CrewBoard; token: string }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const job = board.jobs.find((j) => j.id === openId) ?? null;
  const openCount = board.jobs.filter((j) => !j.done).length;

  // Opening a job pushes a history entry, so the phone's back gesture (and
  // the browser button) returns to the list instead of leaving the board.
  const open = useCallback((id: string) => {
    setOpenId(id);
    if (typeof window !== "undefined") {
      window.history.pushState({ crewJob: id }, "");
    }
  }, []);

  const back = useCallback(() => {
    if (typeof window !== "undefined" && window.history.state?.crewJob) {
      window.history.back();
      return;
    }
    setOpenId(null);
  }, []);

  useEffect(() => {
    const onPop = () => setOpenId(null);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Coming back to the list should land at the top of it, not wherever the
  // detail was scrolled to.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [openId]);

  return (
    <main className="mx-auto w-full max-w-[720px] px-4 py-6 sm:px-6">
      {job ? (
        <JobDetail job={job} token={token} onBack={back} />
      ) : (
        <>
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
                : `${openCount} open ${openCount === 1 ? "job" : "jobs"}${board.employee.role ? ` · ${board.employee.role}` : ""}`}
            </p>
          </header>

          <div className="grid gap-3">
            {board.jobs.map((j) => (
              <JobRow key={j.id} job={j} onOpen={() => open(j.id)} />
            ))}
          </div>

          <p className="mt-8 text-sm leading-relaxed text-on-surface-variant">
            This link is personal to you. Anything you save here is stamped with
            your name and goes straight to the office.
          </p>
        </>
      )}
    </main>
  );
}
