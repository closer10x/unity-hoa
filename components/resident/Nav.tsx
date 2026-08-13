"use client";

import React from "react";

import { NAV, NAV_GROUPS } from "@/lib/resident-portal/nav";
import { useResident } from "@/lib/resident-portal/store";

/**
 * The resident's rail.
 *
 * Dark ink against the paper page, the way the redesign has it: the portal's
 * one heavy surface, so the eye starts at the lot it belongs to rather than
 * at a list of links. The lot card sits above the nav for the same reason —
 * a resident who owns in two communities should never have to wonder which
 * one they are looking at.
 *
 * No icons, per the house rule. The current item is a solid white chip, which
 * reads from across a room without one.
 */

/** Initials for the account chip, so a photo is never required. */
function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? "")
      .join("") || "—"
  );
}

function Badge({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <span
      className={
        "rounded-full px-2 py-0.5 text-[11px] font-bold " +
        (dark ? "bg-white/15 text-white" : "bg-tint text-moss")
      }
    >
      {children}
    </span>
  );
}

/** Live badge counts — open maintenance requests and unread messages. */
function useBadges(): Record<string, number> {
  const s = useResident();
  return { maintenance: s.openRequestCount, messages: s.unreadCount };
}

/** The lot this portal is scoped to. */
function LotCard() {
  const s = useResident();
  return (
    <div className="rounded-xl border border-white/15 bg-white/[0.07] px-[18px] py-4">
      <div className="mb-2 text-[11px] font-bold tracking-[0.08em] text-sage uppercase">
        Your home
      </div>
      <div className="font-display text-[18px] leading-[1.25] font-semibold tracking-[-0.02em]">
        {s.property.address}
      </div>
      <div className="mt-1 text-[13px] text-white/60">
        {[s.property.name, s.property.account && `Acct ${s.property.account}`]
          .filter(Boolean)
          .join(" · ") || "No account number yet"}
      </div>
    </div>
  );
}

function AccountChip() {
  const s = useResident();
  return (
    <div className="flex items-center gap-[11px] border-t border-white/15 px-3 pt-3.5">
      <span className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-sage text-[13px] font-bold text-ink">
        {initials(s.residentName)}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold">{s.residentName}</span>
        <span className="block text-xs text-white/55">Owner</span>
      </span>
    </div>
  );
}

/** Desktop rail. */
export function Sidebar() {
  const s = useResident();
  const badges = useBadges();

  return (
    <aside
      className="sticky flex flex-[0_1_268px] flex-col gap-7 self-start overflow-y-auto rounded-2xl bg-ink px-5 py-[26px] text-white"
      /* The sticky offset includes the shell's own top padding, or the rail
         jumps by that much the first time the page scrolls. */
      style={{ top: 24, maxHeight: "calc(100dvh - 48px)", minWidth: 232 }}
    >
      <LotCard />

      <nav className="grid gap-4">
        {NAV_GROUPS.map((group) => (
          <div key={group} className="grid gap-1">
            <span className="px-3.5 pb-1 text-[10px] font-bold tracking-[0.14em] text-white/40 uppercase">
              {group}
            </span>
            {NAV.filter((n) => n.group === group).map((n) => {
              const on = n.id === s.view;
              const badge = badges[n.id] || 0;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => s.setView(n.id)}
                  aria-current={on ? "page" : undefined}
                  className={
                    "flex min-h-11 w-full items-center justify-between gap-3 rounded-[10px] px-3.5 py-3 text-left text-[15px] transition-colors " +
                    (on
                      ? "bg-white font-semibold text-ink"
                      : "font-medium text-white/[0.78] hover:bg-white/10")
                  }
                >
                  <span className="min-w-0 truncate">{n.label}</span>
                  {badge ? <Badge dark={!on}>{badge}</Badge> : null}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mt-auto grid gap-3">
        <button
          type="button"
          onClick={() => s.setView("messages")}
          className="min-h-11 px-3 text-left text-sm text-white/70 transition-colors hover:text-white"
        >
          Message the office →
        </button>
        <AccountChip />
      </div>
    </aside>
  );
}

/** Mobile: the section on a toggle, the grouped sheet beneath it. */
export function MobileNav() {
  const s = useResident();
  const badges = useBadges();
  const current = NAV.find((n) => n.id === s.view) ?? NAV[0];
  const openTotal = Object.values(badges).reduce((t, n) => t + n, 0);

  return (
    <div className="grid flex-[1_1_100%] gap-2.5">
      <button
        type="button"
        onClick={() => s.setNavOpen(!s.navOpen)}
        aria-expanded={s.navOpen}
        className="flex w-full items-center justify-between gap-3 rounded-xl bg-ink px-4 py-3.5 text-left text-white"
      >
        <span className="grid min-w-0 gap-0.5">
          <span className="text-[10px] font-bold tracking-[0.12em] text-sage uppercase">
            {current.group}
          </span>
          <span className="truncate font-display text-[17px] font-semibold tracking-[-0.02em]">
            {current.label}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-2.5">
          {openTotal ? <Badge dark>{openTotal} open</Badge> : null}
          <span className="text-[13px] font-semibold text-white/80">
            {s.navOpen ? "Close" : "Menu"}
          </span>
        </span>
      </button>

      {s.navOpen ? (
        <div className="max-h-[66vh] overflow-y-auto rounded-2xl border border-line bg-white p-1.5 shadow-[0_12px_32px_rgba(51,61,38,0.10)]">
          {NAV_GROUPS.map((group) => (
            <div key={group} className="grid gap-0.5 px-1.5 pt-2 pb-2.5">
              <span className="px-2 pb-1.5 text-[10px] font-bold tracking-[0.14em] text-faint uppercase">
                {group}
              </span>
              {NAV.filter((n) => n.group === group).map((n) => {
                const on = n.id === s.view;
                const badge = badges[n.id] || 0;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => s.setView(n.id)}
                    aria-current={on ? "page" : undefined}
                    className={
                      "flex min-h-11 w-full items-center justify-between gap-3 rounded-[10px] px-3.5 py-3 text-left text-[16px] transition-colors " +
                      (on ? "bg-tint font-semibold text-ink" : "text-body hover:bg-paper")
                    }
                  >
                    <span className="min-w-0 truncate">{n.label}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      {badge ? <Badge>{badge}</Badge> : null}
                      {on ? (
                        <span className="text-[11px] font-bold tracking-[0.06em] text-moss uppercase">
                          Viewing
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
