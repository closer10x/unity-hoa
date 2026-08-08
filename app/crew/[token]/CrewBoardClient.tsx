"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";

import type { CrewBoard, CrewJob } from "@/lib/crew/links";

import { PENDING_REASONS } from "@/lib/crew/pending-reasons";

import {
  addFieldNote,
  markJobComplete,
  markJobPending,
  resumeJob,
  uploadFieldPhoto,
} from "./actions";

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

/**
 * The office picks Routine / Soon / Urgent; the database stores
 * normal / high / urgent. A tech should read back the words the office
 * chose, never the column value — "normal" told them nothing.
 */
const PRIORITY_LABEL: Record<string, string> = {
  urgent: "Urgent",
  high: "Soon",
  normal: "Routine",
  low: "Low priority",
};

const PRIORITY_FULL: Record<string, string> = {
  urgent: "Urgent — same day",
  high: "Soon — within a week",
  normal: "Routine — next visit",
  low: "Low priority — when you're nearby",
};

const PRIORITY_TONE: Record<string, string> = {
  urgent: "text-status-critical",
  high: "text-status-attention",
};

const priorityKey = (p: string) => p.trim().toLowerCase();
const priorityLabel = (p: string) => PRIORITY_LABEL[priorityKey(p)] ?? p;
const priorityFull = (p: string) => PRIORITY_FULL[priorityKey(p)] ?? p;

/** The office's own status words, not the stored value. */
const STATUS_LABEL: Record<string, string> = {
  open: "Not started",
  assigned: "Scheduled",
  in_progress: "In progress",
  pending: "On hold",
  completed: "Done",
  cancelled: "Cancelled",
};

/** Initials for the avatar when no photo is on file. */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

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
              : job.status === "pending"
                ? "text-status-attention"
                : PRIORITY_TONE[priorityKey(job.priority)] ?? "text-status-neutral"
          }`}
        >
          {job.done ? "Done" : job.status === "pending" ? "On hold" : priorityLabel(job.priority)}
        </span>
      </div>

      <h2 className="mt-1.5 text-lg leading-snug font-semibold">{job.title}</h2>
      {job.location ? (
        <p className="mt-0.5 text-[15px] text-on-surface-variant">{job.location}</p>
      ) : null}

      {/* The short view: when it landed, when it closed, what's attached. */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-label text-xs text-outline">
        <span>{job.done ? `Closed ${stamp(job.completedAt)}` : `Assigned ${stamp(job.assignedAt)}`}</span>
        {job.pendingReason ? (
          <span className="text-status-attention">{job.pendingReason}</span>
        ) : null}
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
  const [holding, setHolding] = useState(false);
  const [reason, setReason] = useState<string>(PENDING_REASONS[0]);
  const [reasonDetail, setReasonDetail] = useState("");
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
                : job.status === "pending"
                  ? "text-status-attention"
                  : PRIORITY_TONE[priorityKey(job.priority)] ?? "text-status-neutral"
            }`}
          >
            {job.done ? "Done" : job.status === "pending" ? "On hold" : priorityLabel(job.priority)}
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

        {/* 130px floor, not the roster's 170: inside a card on a phone that
            is the difference between one long column and two, and auto-fit
            can never overflow sideways. */}
        <dl className="mt-4 grid grid-cols-[repeat(auto-fit,minmax(130px,1fr))] gap-x-3 gap-y-3.5 border-t border-hairline-soft pt-4">
          <div>
            <dt className="font-label text-[11px] uppercase tracking-[0.12em] text-outline">Priority</dt>
            <dd className={`mt-1 text-[15px] ${PRIORITY_TONE[priorityKey(job.priority)] ?? ""}`}>
              {priorityFull(job.priority)}
            </dd>
          </div>
          <div>
            <dt className="font-label text-[11px] uppercase tracking-[0.12em] text-outline">Status</dt>
            <dd className="mt-1 text-[15px]">{STATUS_LABEL[job.status] ?? job.status}</dd>
          </div>
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
          {job.photos.length === 0 ? (
            <div>
              <dt className="font-label text-[11px] uppercase tracking-[0.12em] text-outline">Photos</dt>
              <dd className="mt-1 text-[15px] text-on-surface-variant">None yet</dd>
            </div>
          ) : null}
        </dl>

        {job.photos.length > 0 ? (
          <div className="mt-4 border-t border-hairline-soft pt-4">
            <p className="font-label text-[11px] uppercase tracking-[0.12em] text-outline">
              Photos on this job
            </p>
            {/* Horizontal strip: many photos must not push the actions off
                the screen, so this one region scrolls sideways on purpose. */}
            <ul className="mt-2 -mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1">
              {job.photos.map((photo) => (
                <li key={photo.id} className="shrink-0 snap-start">
                  <a href={photo.url} target="_blank" rel="noreferrer" title={photo.at}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={`Photo added ${photo.at}`}
                      loading="lazy"
                      className="size-20 rounded-xl border border-outline-variant object-cover"
                    />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

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
            {job.pendingReason ? (
              <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
                <p className="font-label text-[11px] uppercase tracking-[0.12em] text-outline">
                  On hold
                </p>
                <p className="mt-1 text-[15px] text-status-attention">{job.pendingReason}</p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => start(async () => say(await resumeJob(token, job.id), "Back on it."))}
                  className="mt-3 min-h-11 rounded-[10px] border border-outline-strong px-4 text-base disabled:opacity-60"
                >
                  Back on it
                </button>
              </div>
            ) : null}

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

              {!holding && !job.pendingReason ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => { setHolding(true); setConfirming(false); }}
                  className="min-h-11 rounded-[10px] border border-outline-strong px-4 text-base text-on-surface disabled:opacity-60"
                >
                  Put on hold
                </button>
              ) : null}

              {!confirming ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => { setConfirming(true); setHolding(false); }}
                  className="min-h-11 rounded-[10px] bg-secondary px-4 text-base font-medium text-on-secondary disabled:opacity-60"
                >
                  Mark complete
                </button>
              ) : null}
            </div>

            {holding ? (
              <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4">
                <p className="text-[15px] leading-relaxed">
                  What are you waiting on? The office sees this on the job, so
                  nobody has to chase you for an update.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {PENDING_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setReason(r)}
                      className={`min-h-11 rounded-full border px-4 text-[15px] ${
                        reason === r
                          ? "border-chip-on-border bg-chip-on text-chip-on-ink"
                          : "border-outline-strong text-on-surface"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <label className="mt-3 block">
                  <span className="mb-2 block text-sm text-on-surface-variant">
                    Anything else? (optional)
                  </span>
                  <textarea
                    rows={2}
                    value={reasonDetail}
                    onChange={(e) => setReasonDetail(e.target.value)}
                    placeholder="Which part, which vendor, who you need."
                    className="w-full rounded-[10px] border border-outline-strong bg-surface-container-low px-3.5 py-3 text-base"
                  />
                </label>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      start(async () => {
                        say(await markJobPending(token, job.id, reason, reasonDetail), "Job put on hold.");
                        setHolding(false);
                        setReasonDetail("");
                      })
                    }
                    className="min-h-11 rounded-[10px] bg-secondary px-4 text-base font-medium text-on-secondary disabled:opacity-60"
                  >
                    Put it on hold
                  </button>
                  <button
                    type="button"
                    onClick={() => setHolding(false)}
                    className="min-h-11 rounded-[10px] border border-outline-strong px-4 text-base"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

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

/**
 * Keeps the board current without the tech thinking about it.
 *
 * Polling, not a Supabase realtime channel: this page has no Supabase
 * session — the URL token is the credential — and crew tables are
 * service-role only, so a browser subscription would be blocked by RLS.
 * A server refresh re-runs the same guarded loader the page was built
 * from, which is the only path allowed to read this data.
 */
function useLiveBoard() {
  const router = useRouter();

  useEffect(() => {
    // A tech reaching for their phone is the moment the list matters most.
    const onFocus = () => router.refresh();
    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisible);

    // And a steady tick for a phone propped on the dash while they work.
    const tick = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 30_000);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(tick);
    };
  }, [router]);
}

export function CrewBoardClient({ board, token }: { board: CrewBoard; token: string }) {
  useLiveBoard();
  const [openId, setOpenId] = useState<string | null>(null);
  const job = board.jobs.find((j) => j.id === openId) ?? null;
  const openCount = board.jobs.filter((j) => !j.done).length;
  const doneCount = board.jobs.length - openCount;

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
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="font-label text-[11px] uppercase tracking-[0.12em] text-outline">
                  Unity Grid · Field
                </p>
                <h1 className="mt-2 text-[clamp(24px,5vw,32px)] font-semibold tracking-[-0.024em]">
                  {board.employee.name}
                </h1>
                {board.employee.role ? (
                  <p className="mt-1 text-base text-on-surface-variant">{board.employee.role}</p>
                ) : null}
              </div>

              {/* Their own face, so a shared phone can't leave a tech looking
                  at someone else's list without noticing. Initials when no
                  photo is on file. */}
              {board.employee.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={board.employee.photoUrl}
                  alt=""
                  className="size-12 shrink-0 rounded-full border border-outline-variant object-cover"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="grid size-12 shrink-0 place-items-center rounded-full border border-chip-on-border bg-chip-on font-label text-sm text-chip-on-ink"
                >
                  {initials(board.employee.name)}
                </span>
              )}
            </div>

            {/* The two numbers they came here for, as tiles rather than a
                run-on sentence: same auto-fit rule as the portal's summary
                tiles, so one tile fills the width and two share it. */}
            {board.jobs.length === 0 ? (
              <p className="mt-5 text-lg text-on-surface-variant">
                Nothing assigned right now.
              </p>
            ) : (
              <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
                <div className="rounded-2xl border border-accent-tint-border bg-confirm-bar p-4">
                  <p className="font-label text-[11px] uppercase tracking-[0.12em] text-secondary-muted">
                    Open
                  </p>
                  <p className="mt-1.5 text-[38px] font-semibold leading-none tracking-[-0.03em] text-secondary">
                    {openCount}
                  </p>
                  <p className="mt-1.5 text-sm text-on-surface-variant">
                    {openCount === 1 ? "job on your list" : "jobs on your list"}
                  </p>
                </div>

                {doneCount > 0 ? (
                  <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-4">
                    <p className="font-label text-[11px] uppercase tracking-[0.12em] text-outline">
                      Closed
                    </p>
                    <p className="mt-1.5 text-[38px] font-semibold leading-none tracking-[-0.03em] text-status-positive">
                      {doneCount}
                    </p>
                    <p className="mt-1.5 text-sm text-on-surface-variant">
                      in the last 14 days
                    </p>
                  </div>
                ) : null}
              </div>
            )}
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
