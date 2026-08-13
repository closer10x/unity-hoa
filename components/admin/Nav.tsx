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

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: font.mono, fontSize: 11, background: color.chipOn, color: "oklch(0.38 0.05 155)", borderRadius: 999, padding: "2px 8px" }}>
      {children}
    </span>
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
      flex: "0 1 236px", minWidth: 200, display: "grid", gap: 2,
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
                  borderRadius: radius.md, padding: "7px 12px", cursor: "pointer",
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
  const openTotal = items.reduce((t, n) => t + (("badge" in n && n.badge) ? parseInt(n.badge, 10) || 0 : 0), 0);

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
          <Badge>{openTotal} open</Badge>
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
                      {"badge" in n && n.badge ? <Badge>{n.badge}</Badge> : null}
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
