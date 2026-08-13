"use client";

import React from "react";
import { NAV, NAV_GROUPS } from "@/lib/admin-portal/fixtures";
import { useStore } from "@/lib/admin-portal/store";
import { color, font, pad, radius } from "@/lib/admin-portal/tokens";
import { NavIcon } from "@/components/admin/ui/NavIcon";

/**
 * Work waiting in a section, counted from what is actually loaded. Only
 * sections that have something pending appear — a badge reading zero is
 * noise, so it is simply absent.
 */
function useSectionCounts(): Record<string, number> {
  const s = useStore();
  return React.useMemo(() => ({
    accounting: s.invoices.filter(
      (i) => i.status === "draft" || i.status === "sent",
    ).length,
  }), [s.invoices]);
}

/** The count itself: Apple's red pill, so it reads as "needs you". */
function CountBadge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: "inline-grid", placeItems: "center",
      minWidth: 19, height: 19, padding: "0 6px",
      borderRadius: 999, background: "oklch(0.62 0.22 25)",
      color: "oklch(0.99 0.01 25)",
      fontFamily: font.mono, fontSize: 11, fontWeight: 600, lineHeight: 1,
      flex: "0 0 auto",
    }}>
      {children}
    </span>
  );
}

/* On ink, in the colour the chip actually reads in. `chipOn` became the dark
   ink when the palette moved to olive, and this kept the old dark-sage text —
   so the phone's nav toggle carried a solid dark pill with nothing legible
   inside it. */
function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: font.mono, fontSize: 11, background: color.chipOn, color: color.chipOnText, borderRadius: 999, padding: "2px 8px" }}>
      {children}
    </span>
  );
}

/** Two-letter initials, so a missing photo is never a blank circle. */
function initials(name: string): string {
  const clean = name.split("\u00B7")[0].trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * The scope switcher, on ink. A native select rather than the header's
 * popover: inside a dark rail a floating panel has to re-theme itself, and
 * the platform's own menu is better on a phone. Re-scoping changes what every
 * list in the portal means, so it belongs with navigation.
 */
function ScopeSelect() {
  const s = useStore();
  return (
    <select
      value={s.scope}
      onChange={(e) => s.setScope(e.target.value)}
      aria-label="Which communities to show"
      style={{
        /* 16px: the rail is on screen from 760px up, which is squarely iPad
           territory, and iOS zooms the page on any focusable control under
           it — here that would scroll the rail itself out of reach. */
        width: "100%", font: "inherit", fontSize: 16, minHeight: 44,
        appearance: "none", cursor: "pointer",
        background: "rgba(255,255,255,0.08)",
        border: "1px solid rgba(255,255,255,0.2)",
        borderRadius: radius.md, padding: "10px 12px", color: "#FFFFFF",
      }}
    >
      <option value="all" style={{ color: color.ink }}>All communities</option>
      {s.portfolios.map((p) => (
        <option key={p.id} value={p.id} style={{ color: color.ink }}>{p.name}</option>
      ))}
      {s.communities.map((c) => (
        <option key={c.id} value={c.id} style={{ color: color.ink }}>{c.name}</option>
      ))}
    </select>
  );
}

/** Who is signed in, at the foot of the rail. */
function AccountChip() {
  const s = useStore();
  const [namePart, rolePart] = s.currentUser.split("\u00B7").map((x) => x.trim());
  const photo =
    s.staff.find((p) => p.profileId && p.profileId === s.currentUserId)?.photoUrl ?? null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 11,
      borderTop: "1px solid rgba(255,255,255,0.15)",
      padding: "14px 10px 4px",
    }}>
      <span aria-hidden style={{
        display: "grid", placeItems: "center", flex: "0 0 auto",
        width: 34, height: 34, borderRadius: "50%", overflow: "hidden",
        background: "#AEBB90", color: color.ink, fontSize: 13, fontWeight: 700,
      }}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : initials(s.currentUser)}
      </span>
      <span style={{ minWidth: 0 }}>
        <span style={{
          display: "block", fontSize: 14, fontWeight: 600, color: "#FFFFFF",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>{namePart}</span>
        <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
          {rolePart || "Management office"}
        </span>
      </span>
    </div>
  );
}

/** Desktop rail. Sticky, natural width; the main column's grow factor keeps it there. */
export function Sidebar() {
  const s = useStore();
  const items = NAV.filter((n) => s.allowedSections.includes(n.id));
  const counts = useSectionCounts();
  return (
    /* Reads as its own surface, the way cards do against the stone page, and
       takes its own scrollbar so a long nav never drags the page with it. */
    /* Pinned, and pinned where it already sits: the sticky offset has to
       include the shell's own top padding, or the rail jumps up by that much
       the moment the page first scrolls. */
    <aside style={{
      position: "sticky", top: `calc(88px + ${pad.shell})`, alignSelf: "flex-start",
      flex: "0 1 248px", minWidth: 210, display: "flex", flexDirection: "column", gap: 2,
      /* The one heavy surface in the office portal, per the redesign: a dark
         ink rail against the paper page, so the eye starts at navigation
         rather than swimming in a field of white cards. */
      background: color.ink,
      color: "#FFFFFF",
      borderRadius: radius.card,
      padding: 10,
      height: `calc(100dvh - 88px - ${pad.shell} * 2)`,
      overflowY: "auto",
    }}>
      {/* The mark and what this portal is, so the rail identifies the product
          and the header is free to carry the screen. */}
      <div style={{ padding: "4px 10px 14px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/unitylogo.png"
          alt="Unity Grid Management"
          style={{ display: "block", height: 24, width: "auto", filter: "brightness(0) invert(1)" }}
        />
        <div style={{
          marginTop: 9, fontFamily: font.mono, fontSize: 10,
          letterSpacing: "0.12em", textTransform: "uppercase",
          color: "#AEBB90",
        }}>
          Management portal
        </div>
      </div>

      {/* Scope lives with navigation, not in the page chrome: re-scoping is a
          navigation act — it changes what every list on every screen means. */}
      <div style={{ padding: "0 6px 14px" }}>
        <ScopeSelect />
      </div>

      {/* Grouped per the handoff: Today · Money · Property · People · Office.
          A group only renders when the role can reach something inside it.
          Kept tight on purpose so the whole nav fits without scrolling. */}
      {NAV_GROUPS.filter((group) => items.some((n) => n.group === group)).map((group) => (
        <React.Fragment key={group}>
          <span style={{
            fontFamily: font.mono, fontSize: 10.5, letterSpacing: "0.14em",
            textTransform: "uppercase", color: "rgba(255,255,255,0.42)",
            padding: "8px 12px 2px",
          }}>
            {group}
          </span>
          {items.filter((n) => n.group === group).map((n) => {
            const on = n.id === s.view;
            return (
              <button key={n.id} type="button" onClick={() => s.setView(n.id)}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                  width: "100%", textAlign: "left", font: "inherit", fontSize: 14.5,
                  border: "1px solid transparent",
                  background: on ? "#FFFFFF" : "transparent",
                  color: on ? color.ink : "rgba(255,255,255,0.78)",
                  fontWeight: on ? 600 : 500,
                  /* 44px: the rail shows from 760px, and half the devices in
                     that band are touched rather than pointed at. The rail
                     already takes its own scrollbar, so the extra height
                     costs a scroll rather than a missed tap. */
                  borderRadius: radius.md, padding: "7px 12px", minHeight: 44,
                  cursor: "pointer",
                }}>
                <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <NavIcon id={n.id} />
                  <span style={{ fontWeight: on ? 600 : 400 }}>{n.label}</span>
                </span>
                {counts[n.id] ? <CountBadge>{counts[n.id]}</CountBadge> : null}
              </button>
            );
          })}
        </React.Fragment>
      ))}
    </aside>
  );
}

/**
 * Mobile nav sheet. The toggle names the current group and section so the user
 * always knows where they are; the sheet groups sections and marks the current one.
 */
export function MobileNav() {
  const s = useStore();
  const items = NAV.filter((n) => s.allowedSections.includes(n.id));
  const current = items.find((n) => n.id === s.view) ?? items[0] ?? NAV[0];
  /* The same live counts the rail uses. This read `n.badge`, a field NAV no
     longer carries, so the toggle always said "0 open" — a badge reading zero
     is noise, and one that can only ever read zero is worse. */
  const counts = useSectionCounts();
  const openTotal = items.reduce((t, n) => t + (counts[n.id] ?? 0), 0);

  return (
    <div style={{ flex: "1 1 100%", display: "grid", gap: 10 }}>
      <button type="button" onClick={() => s.setNavOpen(!s.navOpen)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          width: "100%", font: "inherit", textAlign: "left", background: color.surface,
          border: `1px solid ${color.borderInput}`, borderRadius: radius.lg,
          padding: "13px 16px", cursor: "pointer", color: color.ink,
        }}>
        <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
          <span style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: color.inkQuaternary }}>
            {current.group}
          </span>
          <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>{current.label}</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 9, flex: "0 0 auto" }}>
          {openTotal > 0 ? <Badge>{openTotal} open</Badge> : null}
          <span style={{ fontSize: 13, fontWeight: 500, color: "oklch(0.44 0.045 155)" }}>{s.navOpen ? "Close" : "Menu"}</span>
        </span>
      </button>

      {s.navOpen ? (
        <div style={{
          background: color.surface, border: `1px solid ${color.hairline}`,
          borderRadius: radius.xl, padding: 6, maxHeight: "66vh", overflowY: "auto",
          boxShadow: "0 12px 32px oklch(0.4 0.02 150 / 0.1)",
        }}>
          {NAV_GROUPS.filter((group) => items.some((n) => n.group === group)).map((group) => (
            <div key={group} style={{ display: "grid", gap: 2, padding: "8px 6px 10px" }}>
              <span style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "oklch(0.6 0.015 150)", padding: "0 8px 6px" }}>
                {group}
              </span>
              {items.filter((n) => n.group === group).map((n) => {
                const on = n.id === s.view;
                return (
                  <button key={n.id} type="button" onClick={() => s.setView(n.id)}
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                      width: "100%", textAlign: "left", font: "inherit", fontSize: 16, border: "none",
                      background: on ? color.accentTint : "transparent",
                      color: on ? "oklch(0.28 0.03 152)" : "oklch(0.32 0.014 150)",
                      borderRadius: radius.md, padding: "13px 14px", cursor: "pointer",
                    }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <NavIcon id={n.id} />
                      <span style={{ fontWeight: on ? 600 : 400 }}>{n.label}</span>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
                      {counts[n.id] ? <Badge>{counts[n.id]}</Badge> : null}
                      {on ? <span style={{ fontFamily: font.mono, fontSize: 12, color: "oklch(0.5 0.04 155)" }}>viewing</span> : null}
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
