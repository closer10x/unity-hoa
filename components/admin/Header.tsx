"use client";

import React, { useState } from "react";
import { useStore } from "@/lib/admin-portal/store";
import { color, pad } from "@/lib/admin-portal/tokens";

/**
 * Scope switcher re-scopes every list, metric and calendar in the app.
 * In production this belongs in the URL so it survives navigation and sharing.
 */
export default function Header() {
  const s = useStore();
  const [open, setOpen] = useState(false);

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
            src="/images/unitylogo-admin.png"
            alt="Unity Grid Management"
            style={{ display: "block", height: 34, width: "auto" }}
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
          <span style={{ fontSize: 14, color: color.inkTertiary, whiteSpace: "nowrap" }}>{s.currentUser}</span>
        </div>
      </div>
    </header>
  );
}
