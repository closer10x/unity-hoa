"use client";

import React from "react";

import { NAV, NAV_GROUPS } from "@/lib/resident-portal/nav";
import { useResident } from "@/lib/resident-portal/store";
import { color, font, radius } from "@/lib/admin-portal/tokens";
import { NavIcon } from "@/components/admin/ui/NavIcon";

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ fontFamily: font.mono, fontSize: 11, background: color.chipOn, color: "oklch(0.38 0.05 155)", borderRadius: 999, padding: "2px 8px" }}>
      {children}
    </span>
  );
}

/** Live badge counts — open maintenance requests and unread messages. */
function useBadges(): Record<string, number> {
  const s = useResident();
  return { maintenance: s.openRequestCount, messages: s.unreadCount };
}

/** Desktop rail: grouped, mono group eyebrows, tinted current item. */
export function Sidebar() {
  const s = useResident();
  const badges = useBadges();
  return (
    <aside
      style={{
        position: "sticky", top: 88, alignSelf: "flex-start",
        flex: "0 1 236px", minWidth: 200, display: "grid", gap: 2,
        background: color.surface,
        border: `1px solid ${color.hairline}`,
        borderRadius: radius.card,
        padding: 8,
        height: "calc(100dvh - 108px)",
        overflowY: "auto",
      }}
    >
      {NAV_GROUPS.map((group) => (
        <div key={group} style={{ display: "grid", gap: 2, paddingBottom: 4 }}>
          <span style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "oklch(0.6 0.015 150)", padding: "8px 8px 4px" }}>
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
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
                  width: "100%", textAlign: "left", font: "inherit", fontSize: 14.5,
                  border: `1px solid ${on ? color.accentTintBorder : "transparent"}`,
                  background: on ? color.accentTint : "transparent",
                  color: on ? "oklch(0.28 0.03 152)" : "oklch(0.32 0.014 150)",
                  borderRadius: radius.md, padding: "7px 12px", cursor: "pointer",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <NavIcon id={n.id} />
                  <span style={{ fontWeight: on ? 600 : 400 }}>{n.label}</span>
                </span>
                {badge ? <Badge>{badge}</Badge> : null}
              </button>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

/** Mobile nav sheet: group + section on the toggle, grouped sheet below. */
export function MobileNav() {
  const s = useResident();
  const badges = useBadges();
  const current = NAV.find((n) => n.id === s.view) ?? NAV[0];
  const openTotal = Object.values(badges).reduce((t, n) => t + n, 0);

  return (
    <div style={{ flex: "1 1 100%", display: "grid", gap: 10 }}>
      <button
        type="button"
        onClick={() => s.setNavOpen(!s.navOpen)}
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          width: "100%", font: "inherit", textAlign: "left", background: color.surface,
          border: `1px solid ${color.borderInput}`, borderRadius: radius.lg,
          padding: "13px 16px", cursor: "pointer", color: color.ink,
        }}
      >
        <span style={{ display: "grid", gap: 2, minWidth: 0 }}>
          <span style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.12em", textTransform: "uppercase", color: color.inkQuaternary }}>
            {current.group}
          </span>
          <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>{current.label}</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 9, flex: "0 0 auto" }}>
          {openTotal ? <Badge>{openTotal} open</Badge> : null}
          <span style={{ fontSize: 13, fontWeight: 500, color: "oklch(0.44 0.045 155)" }}>{s.navOpen ? "Close" : "Menu"}</span>
        </span>
      </button>

      {s.navOpen ? (
        <div
          style={{
            background: color.surface, border: `1px solid ${color.hairline}`,
            borderRadius: radius.xl, padding: 6, maxHeight: "66vh", overflowY: "auto",
            boxShadow: "0 12px 32px oklch(0.4 0.02 150 / 0.1)",
          }}
        >
          {NAV_GROUPS.map((group) => (
            <div key={group} style={{ display: "grid", gap: 2, padding: "8px 6px 10px" }}>
              <span style={{ fontFamily: font.mono, fontSize: 10, letterSpacing: "0.14em", textTransform: "uppercase", color: "oklch(0.6 0.015 150)", padding: "0 8px 6px" }}>
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
                    style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
                      width: "100%", textAlign: "left", font: "inherit", fontSize: 16, border: "none",
                      background: on ? color.accentTint : "transparent",
                      color: on ? "oklch(0.28 0.03 152)" : "oklch(0.32 0.014 150)",
                      borderRadius: radius.md, padding: "13px 14px", cursor: "pointer",
                    }}
                  >
                    <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      <NavIcon id={n.id} />
                      <span style={{ fontWeight: on ? 600 : 400 }}>{n.label}</span>
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 8, flex: "0 0 auto" }}>
                      {badge ? <Badge>{badge}</Badge> : null}
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
