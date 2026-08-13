"use client";

import { useState } from "react";

import { requestResidentPasswordReset } from "@/app/portal/login/actions";

export function ResidentForgotPasswordForm() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    await requestResidentPasswordReset(fd);
    setPending(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          /* 44px tall: a resident reaching for this is already locked out,
             and it was a 16px target. */
          background: "none", border: "none", padding: "10px 0", font: "inherit",
          minHeight: 44, display: "inline-flex", alignItems: "center",
          fontSize: 14, color: "oklch(0.44 0.045 155)", cursor: "pointer",
        }}
      >
        Forgot password?
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 10 }}>
      <p style={{ margin: 0, fontSize: 13, color: "oklch(0.52 0.012 150)" }}>
        We will email a reset link if the account exists.
      </p>
      <input
        name="email"
        type="email"
        required
        placeholder="your@email.com"
        style={{
          width: "100%", font: "inherit", fontSize: 16,
          background: "oklch(0.99 0.004 130)",
          border: "1px solid oklch(0.86 0.012 145)",
          borderRadius: 10, padding: "11px 14px",
        }}
      />
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          type="submit"
          disabled={pending}
          style={{
            font: "inherit", fontSize: 14, fontWeight: 500,
            background: "oklch(0.42 0.05 155)", color: "oklch(0.97 0.008 140)",
            border: "none", borderRadius: 999, padding: "9px 18px",
            cursor: "pointer", opacity: pending ? 0.6 : 1,
          }}
        >
          {pending ? "Sending…" : "Send reset link"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          style={{
            background: "none", border: "none", font: "inherit", fontSize: 14,
            color: "oklch(0.52 0.012 150)", cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
