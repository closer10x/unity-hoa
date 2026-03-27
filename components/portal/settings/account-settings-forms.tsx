"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  updateMyEmail,
  updateMyPassword,
  updateMyProfile,
} from "@/app/admin/(dashboard)/settings/account/actions";

type Props = {
  email: string | null | undefined;
  displayName: string | null | undefined;
};

export function AccountSettingsForms({ email, displayName }: Props) {
  const router = useRouter();
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);

  async function onProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setProfileErr(null);
    setProfileMsg(null);
    const r = await updateMyProfile(new FormData(e.currentTarget));
    if ("error" in r) {
      setProfileErr(r.error);
      return;
    }
    setProfileMsg("Display name saved.");
    router.refresh();
  }

  async function onEmail(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setEmailErr(null);
    setEmailMsg(null);
    const r = await updateMyEmail(new FormData(e.currentTarget));
    if ("error" in r) {
      setEmailErr(r.error);
      return;
    }
    setEmailMsg(
      "Confirmation sent to the new address if your project allows email change.",
    );
    router.refresh();
  }

  async function onPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPasswordErr(null);
    setPasswordMsg(null);
    const r = await updateMyPassword(new FormData(e.currentTarget));
    if ("error" in r) {
      setPasswordErr(r.error);
      return;
    }
    setPasswordMsg("Password updated.");
    e.currentTarget.reset();
  }

  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 max-w-xl">
        <h3 className="font-headline text-base font-bold text-on-surface mb-4">
          Display name
        </h3>
        <form onSubmit={onProfile} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Name shown in header
            </label>
            <input
              name="display_name"
              required
              defaultValue={displayName ?? ""}
              className="w-full rounded-lg bg-surface-container-highest px-4 py-3 text-sm outline-none ring-1 ring-transparent focus:ring-secondary"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-lg bg-secondary text-on-secondary font-semibold text-sm"
          >
            Save
          </button>
        </form>
        {profileErr ? (
          <p className="text-error text-sm mt-3" role="alert">
            {profileErr}
          </p>
        ) : null}
        {profileMsg ? (
          <p className="text-secondary text-sm mt-3">{profileMsg}</p>
        ) : null}
      </section>

      <section className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 max-w-xl">
        <h3 className="font-headline text-base font-bold text-on-surface mb-1">
          Email
        </h3>
        <p className="text-sm text-on-surface-variant mb-4">
          Current:{" "}
          <span className="text-on-surface font-medium">{email ?? "—"}</span>
        </p>
        <form onSubmit={onEmail} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              New email
            </label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-lg bg-surface-container-highest px-4 py-3 text-sm outline-none ring-1 ring-transparent focus:ring-secondary"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-lg bg-secondary text-on-secondary font-semibold text-sm"
          >
            Request email change
          </button>
        </form>
        {emailErr ? (
          <p className="text-error text-sm mt-3" role="alert">
            {emailErr}
          </p>
        ) : null}
        {emailMsg ? (
          <p className="text-secondary text-sm mt-3">{emailMsg}</p>
        ) : null}
      </section>

      <section className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 max-w-xl">
        <h3 className="font-headline text-base font-bold text-on-surface mb-4">
          Password
        </h3>
        <form onSubmit={onPassword} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              New password
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg bg-surface-container-highest px-4 py-3 text-sm outline-none ring-1 ring-transparent focus:ring-secondary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Confirm password
            </label>
            <input
              name="password_confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="w-full rounded-lg bg-surface-container-highest px-4 py-3 text-sm outline-none ring-1 ring-transparent focus:ring-secondary"
            />
          </div>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-lg bg-secondary text-on-secondary font-semibold text-sm"
          >
            Update password
          </button>
        </form>
        {passwordErr ? (
          <p className="text-error text-sm mt-3" role="alert">
            {passwordErr}
          </p>
        ) : null}
        {passwordMsg ? (
          <p className="text-secondary text-sm mt-3">{passwordMsg}</p>
        ) : null}
      </section>
    </div>
  );
}
