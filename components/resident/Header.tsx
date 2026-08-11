"use client";

import React, { useState } from "react";

import { signOutResident } from "@/app/portal/(dashboard)/sign-out-action";
import { useResident } from "@/lib/resident-portal/store";
import { color, font, pad } from "@/lib/admin-portal/tokens";
import { useOnScreenPanel } from "@/components/admin/ui";

/**
 * Portal header: wordmark, the property switcher (a resident may own in more
 * than one community), and the resident's identity. With a single property the
 * switcher still names it — the resident should always see which home the
 * portal is scoped to.
 */
export default function Header() {
  const s = useResident();
  const [open, setOpen] = useState(false);
  const switcherRef = React.useRef<HTMLButtonElement>(null);
  const panel = useOnScreenPanel(open, switcherRef);

  return (
    <header
      style={{
        background: color.surface,
        padding: `14px ${pad.shell}`,
        borderBottom: `1px solid ${color.hairline}`,
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: s.isMobile ? "8px" : "10px 14px",
        flexWrap: "wrap", minWidth: 0,
      }}>
        <span style={{ display: "flex", alignItems: "center", flex: "0 0 auto" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/unitylogo.png"
            alt="Unity Grid Management"
            style={{ display: "block", height: s.isMobile ? 22 : 28, width: "auto" }}
          />
        </span>

        <div style={{
          display: "flex", alignItems: "center", gap: s.isMobile ? 8 : 10,
          flex: s.isMobile ? "0 0 auto" : "1 1 auto",
          minWidth: 0, flexWrap: "wrap", justifyContent: "flex-end",
        }}>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              ref={switcherRef}
              onClick={() => setOpen(!open)}
              style={{
                font: "inherit", fontSize: 14, fontWeight: 500,
                background: color.surfaceSunken,
                border: `1px solid ${color.borderInput}`,
                borderRadius: 999,
                padding: s.isMobile ? "9px 12px" : "10px 18px",
                minHeight: 44, cursor: "pointer",
                color: color.ink, whiteSpace: "nowrap",
                maxWidth: s.isMobile ? 150 : 320,
                overflow: "hidden", textOverflow: "ellipsis",
              }}
            >
              {s.property.name} ▾
            </button>
            {open ? (
              <div
                style={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0, minWidth: 280,
                  background: color.surface, border: `1px solid ${color.borderInput}`,
                  borderRadius: 12, padding: 6, zIndex: 30,
                  boxShadow: "0 14px 36px oklch(0.4 0.02 150 / 0.12)",
                  display: "grid", gap: 2,
                  ...panel,
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    textAlign: "left", font: "inherit", border: "none", cursor: "pointer",
                    background: color.accentTint, borderRadius: 8, padding: "10px 12px", color: "inherit",
                  }}
                >
                  <span style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                    <span style={{ fontSize: 15, fontWeight: 600 }}>{s.property.name}</span>
                    <span style={{ fontFamily: font.mono, fontSize: 12, color: "oklch(0.5 0.04 155)" }}>viewing</span>
                  </span>
                  <span style={{ display: "block", fontSize: 13, color: color.inkTertiary, marginTop: 2 }}>
                    {s.property.mailingAddress || s.property.address}
                  </span>
                </button>
              </div>
            ) : null}
          </div>
          {s.isMobile ? null : (
            <span style={{ fontSize: 14, color: color.inkTertiary, whiteSpace: "nowrap" }}>{s.residentName}</span>
          )}
          <form action={signOutResident} style={{ display: "contents" }}>
            <button
              type="submit"
              style={{
                font: "inherit", fontSize: 14, background: "none",
                border: `1px solid ${color.borderInput}`, borderRadius: 999,
                padding: s.isMobile ? "9px 12px" : "9px 16px",
                minHeight: 44, cursor: "pointer", color: color.inkSecondary,
                whiteSpace: "nowrap",
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
