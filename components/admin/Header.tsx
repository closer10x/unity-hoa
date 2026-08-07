"use client";

import React, { useEffect, useRef, useState } from "react";
import { signOutAdmin } from "@/app/admin/(dashboard)/sign-out-action";
import { useStore } from "@/lib/admin-portal/store";
import { color, font, pad, radius } from "@/lib/admin-portal/tokens";

/** Two-letter initials from the account name for the profile chip. */
function initials(name: string): string {
  const clean = name.split("·")[0].trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Scope switcher re-scopes every list, metric and calendar in the app.
 * In production this belongs in the URL so it survives navigation and sharing.
 */
export default function Header() {
  const s = useStore();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // The account string is "Name · Role"; split for display.
  const [namePart, rolePart] = s.currentUser.split("·").map((x) => x.trim());

  useEffect(() => {
    if (!profileOpen) return;
    const onDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setProfileOpen(false);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);

  const options = [
    { id: "all", label: "All communities", meta: `${s.communities.length} communities · 676 doors` },
    ...s.portfolios.map((p) => ({ id: p.id, label: p.name, meta: `Portfolio · ${p.members.length} communities` })),
    ...s.communities.map((c) => ({ id: c.id, label: c.name, meta: `${c.doors} · ${c.dues} ${c.cadence.toLowerCase()}` })),
  ];

  return (
    <header style={{
      background: color.surface, padding: `14px ${pad.shell}`,
      borderBottom: `1px solid ${color.hairline}`,
      position: "sticky", top: 0, zIndex: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px 14px", flexWrap: "wrap", minWidth: 0 }}>
        <span style={{ display: "flex", alignItems: "center", flex: "0 0 auto" }}>
          <img
            src="/images/unitylogo.png"
            alt="Unity Grid Management"
            style={{ display: "block", height: 28, width: "auto" }}
          />
        </span>

        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 auto", minWidth: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <div style={{ position: "relative" }}>
            <button type="button" onClick={() => setOpen(!open)}
              style={{
                font: "inherit", fontSize: 14, fontWeight: 500, background: color.surfaceSunken,
                border: `1px solid ${color.borderInput}`, borderRadius: 999,
                padding: "10px 18px", cursor: "pointer", color: color.ink, whiteSpace: "nowrap",
              }}>
              {s.scope === "all" ? "All communities" : s.scopeLabel} ▾
            </button>
            {open ? (
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 280,
                background: color.surface, border: `1px solid ${color.borderInput}`,
                borderRadius: 12, padding: 6, zIndex: 30,
                boxShadow: "0 14px 36px oklch(0.4 0.02 150 / 0.12)",
                display: "grid", gap: 2, maxHeight: 340, overflowY: "auto",
              }}>
                {options.map((o) => (
                  <button key={o.id} type="button"
                    onClick={() => { s.setScope(o.id); setOpen(false); }}
                    style={{
                      textAlign: "left", font: "inherit", border: "none", cursor: "pointer",
                      background: s.scope === o.id ? color.accentTint : "transparent",
                      borderRadius: 8, padding: "10px 12px", color: "inherit",
                    }}>
                    <span style={{ display: "block", fontSize: 15, fontWeight: s.scope === o.id ? 600 : 400 }}>{o.label}</span>
                    <span style={{ display: "block", fontSize: 13, color: color.inkTertiary, marginTop: 2 }}>{o.meta}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div ref={profileRef} style={{ position: "relative" }}>
            <button type="button" onClick={() => setProfileOpen((v) => !v)}
              aria-haspopup="menu" aria-expanded={profileOpen}
              style={{
                display: "flex", alignItems: "center", gap: 9, font: "inherit",
                background: profileOpen ? color.surfaceSunken : "none",
                border: `1px solid ${profileOpen ? color.borderInput : "transparent"}`,
                borderRadius: 999, padding: "6px 12px 6px 6px", cursor: "pointer",
                color: color.ink, whiteSpace: "nowrap",
              }}>
              <span aria-hidden style={{
                display: "grid", placeItems: "center", width: 28, height: 28,
                borderRadius: "50%", background: color.accentTint, color: "oklch(0.34 0.05 155)",
                fontSize: 12, fontWeight: 600, flex: "0 0 auto",
              }}>
                {initials(s.currentUser)}
              </span>
              <span style={{ fontSize: 14, color: color.inkSecondary }}>{namePart}</span>
              <span aria-hidden style={{ fontSize: 11, color: color.inkQuaternary }}>▾</span>
            </button>

            {profileOpen ? (
              <div role="menu" style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 240,
                background: color.surface, border: `1px solid ${color.borderInput}`,
                borderRadius: radius.lg, padding: 6, zIndex: 30,
                boxShadow: "0 14px 36px oklch(0.4 0.02 150 / 0.12)",
              }}>
                <div style={{ padding: "10px 12px 12px", borderBottom: `1px solid ${color.hairlineSoft}` }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: color.ink }}>{namePart}</div>
                  {rolePart ? (
                    <div style={{ marginTop: 3, fontFamily: font.mono, fontSize: 11, letterSpacing: "0.06em", textTransform: "uppercase", color: color.inkTertiary }}>
                      {rolePart}
                    </div>
                  ) : null}
                </div>
                <button type="button" role="menuitem"
                  onClick={() => { setProfileOpen(false); s.setView("team"); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left", font: "inherit",
                    fontSize: 14, border: "none", background: "transparent", cursor: "pointer",
                    color: color.ink, borderRadius: radius.md, padding: "10px 12px", marginTop: 4,
                  }}>
                  Team &amp; accounts
                </button>
                <form action={signOutAdmin}>
                  <button type="submit" role="menuitem"
                    style={{
                      display: "block", width: "100%", textAlign: "left", font: "inherit",
                      fontSize: 14, border: "none", background: "transparent", cursor: "pointer",
                      color: color.destructive, borderRadius: radius.md, padding: "10px 12px",
                    }}>
                    Sign out
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
