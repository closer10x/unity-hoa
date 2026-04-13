"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  updateMyEmail,
  updateMyPassword,
  updateMyProfile,
  uploadMyAvatar,
} from "@/app/admin/(dashboard)/settings/account/actions";

type Props = {
  email: string | null | undefined;
  displayName: string | null | undefined;
  avatarPreviewUrl: string | null;
};

export function AccountSettingsForms({
  email,
  displayName,
  avatarPreviewUrl,
}: Props) {
  const router = useRouter();
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);
  const [avatarErr, setAvatarErr] = useState<string | null>(null);

  async function onAvatar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAvatarErr(null);
    setAvatarMsg(null);
    const r = await uploadMyAvatar(new FormData(e.currentTarget));
    if ("error" in r) {
      setAvatarErr(r.error);
      return;
    }
    setAvatarMsg("Profile photo updated.");
    e.currentTarget.reset();
    router.refresh();
  }

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

  const shownName = displayName?.trim() || email?.trim() || "User";

  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6 max-w-xl">
        <h3 className="font-headline text-base font-bold text-on-surface mb-4">
          Profile photo
        </h3>
        <p className="text-sm text-on-surface-variant mb-4">
          Shown next to your name in the admin header. Square images work best.
        </p>
        <div className="flex flex-col sm:flex-row sm:items-start gap-6">
          <div className="w-20 h-20 rounded-full overflow-hidden border border-outline-variant/30 bg-surface-container-highest shrink-0">
            {avatarPreviewUrl ? (
              <Image
                src={avatarPreviewUrl}
                alt="Your profile photo"
                width={80}
                height={80}
                className="w-full h-full object-cover"
                unoptimized
              />
            ) : (
              <span className="flex w-full h-full items-center justify-center text-secondary text-xl font-bold bg-secondary/10">
                {shownName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <form onSubmit={onAvatar} className="space-y-4 flex-1 min-w-0">
            <div className="space-y-1">
              <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Upload image
              </label>
              <input
                name="avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                className="w-full text-sm text-on-surface-variant file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:bg-secondary file:text-on-secondary file:text-xs file:font-semibold"
              />
              <p className="text-[10px] text-on-surface-variant">
                JPEG, PNG, or WebP. Up to 2 MB.
              </p>
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-lg bg-secondary text-on-secondary font-semibold text-sm"
            >
              Save photo
            </button>
          </form>
        </div>
        {avatarErr ? (
          <p className="text-error text-sm mt-3" role="alert">
            {avatarErr}
          </p>
        ) : null}
        {avatarMsg ? (
          <p className="text-secondary text-sm mt-3">{avatarMsg}</p>
        ) : null}
      </section>

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
