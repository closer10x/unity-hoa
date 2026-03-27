"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { updateCommunitySettings } from "@/app/admin/(dashboard)/settings/organization/actions";
import type { CommunitySettingsRow } from "@/lib/types/settings";

type Props = {
  initial: CommunitySettingsRow;
};

export function OrganizationForm({ initial }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    const r = await updateCommunitySettings(new FormData(e.currentTarget));
    if ("error" in r) {
      setError(r.error);
      return;
    }
    setMsg("Saved.");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="max-w-xl space-y-4">
      <div className="space-y-1">
        <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          Association name
        </label>
        <input
          name="association_name"
          defaultValue={initial.association_name ?? ""}
          className="w-full rounded-lg bg-surface-container-highest px-4 py-3 text-sm outline-none ring-1 ring-transparent focus:ring-secondary"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          Support email
        </label>
        <input
          name="support_email"
          type="email"
          defaultValue={initial.support_email ?? ""}
          className="w-full rounded-lg bg-surface-container-highest px-4 py-3 text-sm outline-none ring-1 ring-transparent focus:ring-secondary"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          Timezone
        </label>
        <input
          name="timezone"
          defaultValue={initial.timezone ?? "America/New_York"}
          placeholder="America/New_York"
          className="w-full rounded-lg bg-surface-container-highest px-4 py-3 text-sm outline-none ring-1 ring-transparent focus:ring-secondary"
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
          Mailing address
        </label>
        <textarea
          name="mailing_address"
          rows={3}
          defaultValue={initial.mailing_address ?? ""}
          className="w-full rounded-lg bg-surface-container-highest px-4 py-3 text-sm outline-none ring-1 ring-transparent focus:ring-secondary resize-y min-h-[80px]"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-on-surface cursor-pointer">
        <input
          type="checkbox"
          name="allow_resident_directory"
          defaultChecked={initial.allow_resident_directory}
          className="rounded border-outline-variant"
        />
        Allow resident contact directory (when homeowner portal ships)
      </label>
      <button
        type="submit"
        className="px-6 py-2.5 rounded-lg bg-secondary text-on-secondary font-semibold text-sm"
      >
        Save organization
      </button>
      {error ? (
        <p className="text-error text-sm" role="alert">
          {error}
        </p>
      ) : null}
      {msg ? <p className="text-secondary text-sm">{msg}</p> : null}
    </form>
  );
}
