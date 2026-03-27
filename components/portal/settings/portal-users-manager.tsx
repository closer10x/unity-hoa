"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  createPortalUser,
  type ListedAuthUser,
} from "@/app/admin/(dashboard)/settings/users/actions";

type Props = {
  initial: ListedAuthUser[];
};

export function PortalUsersManager({ initial }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const r = await createPortalUser(fd);
    setPending(false);
    if ("error" in r) {
      setError(r.error);
      return;
    }
    e.currentTarget.reset();
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-outline-variant/40 bg-surface-container-lowest p-6">
        <h3 className="font-headline text-base font-bold text-on-surface mb-1">
          Create user
        </h3>
        <p className="text-sm text-on-surface-variant mb-4 max-w-xl">
          <strong>Admin</strong> can sign in here and manage the association.{" "}
          <strong>Basic</strong> is for HOA staff who need portal access without
          full admin rights. That is separate from the{" "}
          <strong>employees</strong> roster, which is only used when assigning
          work orders.
        </p>
        <form onSubmit={onCreate} className="grid gap-4 sm:grid-cols-2 max-w-2xl">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="off"
              className="w-full rounded-lg bg-surface-container-highest px-4 py-3 text-sm outline-none ring-1 ring-transparent focus:ring-secondary"
            />
          </div>
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
              Temporary password
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
              Role
            </label>
            <select
              name="role"
              className="w-full rounded-lg bg-surface-container-highest px-4 py-3 text-sm outline-none ring-1 ring-transparent focus:ring-secondary"
            >
              <option value="basic">Basic (HOA staff)</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={pending}
              className="w-full sm:w-auto px-6 py-3 rounded-lg bg-secondary text-on-secondary font-semibold text-sm disabled:opacity-50"
            >
              {pending ? "Creating…" : "Create user"}
            </button>
          </div>
        </form>
        {error ? (
          <p className="text-error text-sm mt-4" role="alert">
            {error}
          </p>
        ) : null}
      </section>

      <section>
        <h3 className="font-headline text-base font-bold text-on-surface mb-4">
          Portal accounts
        </h3>
        <div className="overflow-x-auto rounded-xl border border-outline-variant/40">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-container-high text-on-surface-variant text-xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-on-surface-variant"
                  >
                    No users yet.
                  </td>
                </tr>
              ) : (
                items.map((u) => (
                  <tr
                    key={u.id}
                    className="border-t border-outline-variant/30 bg-surface-container-lowest"
                  >
                    <td className="px-4 py-3 text-on-surface">
                      {u.email ?? "—"}
                    </td>
                    <td className="px-4 py-3 capitalize">{u.role}</td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {new Date(u.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
