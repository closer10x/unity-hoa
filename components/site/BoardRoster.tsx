"use client";

import { useState } from "react";

import type { BoardMember } from "@/lib/site/board";

/**
 * The board, behind the community's name.
 *
 * Unity Grid manages more than one association, so the roster is presented as
 * the community it belongs to rather than as a bare list of strangers —
 * "Sofi Lakes" opens and the neighbours who vote are inside. It also keeps the
 * page from opening with four names a visitor did not ask for.
 *
 * A plain disclosure: the names are in the markup either way, so they are
 * found by search and by a screen reader without anyone pressing anything.
 */
export function BoardRoster({
  community,
  members,
}: {
  community: string;
  members: BoardMember[];
}) {
  const [open, setOpen] = useState(false);

  if (members.length === 0) {
    return (
      <p className="max-w-[70ch] text-[15px] leading-relaxed text-on-surface-variant text-pretty">
        The current roster isn&rsquo;t available right now. Ask the office and we&rsquo;ll tell
        you who is seated.
      </p>
    );
  }

  return (
    <div className="mb-8">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="board-roster"
        className="flex w-full max-w-[520px] items-center justify-between gap-4 rounded-xl border border-outline-variant bg-surface px-5 py-4 text-left transition-colors hover:border-outline"
      >
        <span>
          <span className="block text-base font-medium">{community}</span>
          <span className="mt-0.5 block font-label text-[11px] uppercase tracking-[0.12em] text-outline">
            {members.length} {members.length === 1 ? "director" : "directors"} seated
          </span>
        </span>
        <span className="font-label text-xs text-secondary">
          {open ? "Hide" : "See the board"}
        </span>
      </button>

      <div
        id="board-roster"
        hidden={!open}
        className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] justify-items-start gap-8"
      >
        {members.map((m) => (
          <div key={`${m.name}-${m.role}`}>
            <p className="text-base font-medium">{m.name}</p>
            <p className="font-label text-xs text-secondary-muted">{m.role}</p>
            <p className="mt-1.5 text-sm text-on-surface-variant">
              Volunteer homeowner, elected by the membership
              {m.termThrough ? ` · term through ${m.termThrough}` : ""}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
