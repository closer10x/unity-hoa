"use client";

import { useState } from "react";

import { requestPasswordReset } from "@/app/admin/login/actions";

export function AdminForgotPasswordForm() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    await requestPasswordReset(fd);
    setPending(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        className="text-xs font-semibold text-secondary hover:underline transition-all"
        onClick={() => setOpen(true)}
      >
        Forgot password?
      </button>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 pt-2 border-t border-outline-variant/30">
      <p className="text-xs text-on-surface-variant">
        We will email a reset link if the account exists.
      </p>
      <input
        name="email"
        type="email"
        required
        placeholder="your@email.com"
        className="w-full rounded-lg bg-surface-container-highest px-4 py-2.5 text-sm outline-none ring-1 ring-transparent focus:ring-secondary"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="text-xs font-semibold px-3 py-2 rounded-lg bg-secondary text-on-secondary disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send reset link"}
        </button>
        <button
          type="button"
          className="text-xs text-on-surface-variant underline"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
