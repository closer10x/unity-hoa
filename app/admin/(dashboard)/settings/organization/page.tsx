import type { Metadata } from "next";

import { OrganizationForm } from "@/components/portal/settings/organization-form";

import { getCommunitySettings } from "./actions";

export const metadata: Metadata = {
  title: "Organization",
};

export const dynamic = "force-dynamic";

export default async function SettingsOrganizationPage() {
  const res = await getCommunitySettings();
  if ("error" in res) {
    return (
      <p className="text-error text-sm" role="alert">
        {res.error}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <h2 className="font-headline text-lg font-bold text-on-surface">
        Organization
      </h2>
      <p className="text-sm text-on-surface-variant max-w-xl mb-6">
        Information shown on documents and emails. Single association per
        deployment (row id = 1).
      </p>
      <OrganizationForm initial={res.row} />
    </div>
  );
}
