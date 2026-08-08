"use client";

import { useState } from "react";

import { changePassword } from "@/app/admin/(dashboard)/profile/actions";

const FIELD =
  "w-full rounded-[10px] border border-outline-strong bg-surface-container-low px-3.5 py-3 text-base text-on-surface placeholder:text-outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
const LABEL = "mb-2 block text-sm text-on-surface-variant";

export function ProfileForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!current) return setError("Enter your current password.");
    if (next.length < 6) return setError("New password must be at least 6 characters.");
    if (next !== confirm) return setError("The new passwords don't match.");
    setSaving(true);
    try {
      const res = await changePassword({ currentPassword: current, newPassword: next });
      if ("error" in res) {
        setError(res.error);
        return;
      }
      setDone(true);
      setCurrent(""); setNext(""); setConfirm("");
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (done) {
    return (
      <div>
        <p className="font-label text-[11px] uppercase tracking-[0.12em] text-outline">
          Password changed
        </p>
        <p className="mt-2.5 text-[15px] leading-relaxed text-on-surface-variant">
          Your password has been updated. Use it the next time you sign in.
        </p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-5 rounded-[10px] border border-outline-strong px-5 py-2.5 text-base text-on-surface hover:border-outline"
        >
          Change it again
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="grid max-w-[420px] gap-4">
      <label className="block">
        <span className={LABEL}>Current password</span>
        <input
          className={FIELD}
          type="password"
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
        />
      </label>
      <label className="block">
        <span className={LABEL}>New password</span>
        <input
          className={FIELD}
          type="password"
          autoComplete="new-password"
          placeholder="At least 6 characters"
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </label>
      <label className="block">
        <span className={LABEL}>Confirm new password</span>
        <input
          className={FIELD}
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </label>
      {error ? (
        <p className="text-sm text-status-critical" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={saving}
        className="mt-1 w-full rounded-[10px] bg-secondary py-[15px] text-base font-medium text-on-secondary transition-colors hover:bg-secondary-hover disabled:cursor-default disabled:opacity-60"
      >
        {saving ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
