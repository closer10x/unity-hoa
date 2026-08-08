import type { Metadata } from "next";
import Link from "next/link";

import { ProfileForm } from "@/components/admin/ProfileForm";
import { signOutAdmin } from "@/app/admin/(dashboard)/sign-out-action";
import { requireAdminUser } from "@/lib/auth/require-admin";

export const metadata: Metadata = { title: "Profile settings" };
export const dynamic = "force-dynamic";

const EYEBROW =
  "font-label text-[11px] uppercase tracking-[0.12em] text-outline";

export default async function ProfilePage() {
  const session = await requireAdminUser();
  const name = session.profile.display_name?.trim() || null;
  const email = session.user.email ?? "—";
  const role = session.profile.staff_role || "Administrator";

  return (
    <div className="min-h-screen bg-surface font-body">
      <header className="sticky top-0 z-20 border-b border-outline-variant bg-surface px-4 py-4 sm:px-6 md:px-8">
        <div className="mx-auto flex w-full max-w-[900px] items-center justify-between gap-4">
          <Link href="/admin" className="flex items-center">
            <img src="/images/unitylogo.png" alt="Unity Grid Management" className="block h-7 w-auto" />
          </Link>
          <Link href="/admin" className="text-sm text-secondary hover:underline">
            ← Back to portal
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[900px] px-4 py-10 sm:px-6 md:px-8">
        <h1 className="mb-1 text-[clamp(24px,4vw,32px)] font-semibold tracking-[-0.024em] text-on-surface">
          Profile settings
        </h1>
        <p className="mb-9 text-base text-on-surface-variant">
          Your account and sign-in security.
        </p>

        <div className="grid gap-6">
          <section className="rounded-[16px] border border-outline-variant bg-surface-container-lowest p-6 md:p-7">
            <p className={`${EYEBROW} mb-5`}>Account</p>
            <dl className="grid gap-4 sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))]">
              <div>
                <dt className="text-sm text-on-surface-variant">Name</dt>
                <dd className="mt-1 text-[15px] text-on-surface">{name ?? "Not set"}</dd>
              </div>
              <div>
                <dt className="text-sm text-on-surface-variant">Email</dt>
                <dd className="mt-1 text-[15px] text-on-surface">{email}</dd>
              </div>
              <div>
                <dt className="text-sm text-on-surface-variant">Role</dt>
                <dd className="mt-1 font-label text-[13px] uppercase tracking-[0.06em] text-on-surface">
                  {role}
                </dd>
              </div>
            </dl>
            <p className="mt-5 text-sm leading-relaxed text-on-surface-variant">
              Your name and role are managed by an administrator in Team &amp;
              accounts.
            </p>
          </section>

          <section className="rounded-[16px] border border-outline-variant bg-surface-container-lowest p-6 md:p-7">
            <p className={`${EYEBROW} mb-2.5`}>Security</p>
            <h2 className="mb-1 text-[19px] font-semibold text-on-surface">
              Change password
            </h2>
            <p className="mb-6 text-[15px] leading-relaxed text-on-surface-variant">
              Enter your current password, then a new one.
            </p>
            <ProfileForm />
          </section>

          <section className="rounded-[16px] border border-outline-variant bg-surface-container-lowest p-6 md:p-7">
            <p className={`${EYEBROW} mb-2.5`}>Session</p>
            <p className="mb-4 text-[15px] leading-relaxed text-on-surface-variant">
              Sign out of the administrator portal on this device.
            </p>
            <form action={signOutAdmin}>
              <button
                type="submit"
                className="rounded-[10px] border border-outline-strong px-5 py-2.5 text-base font-medium text-on-surface hover:border-outline"
              >
                Sign out
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}
