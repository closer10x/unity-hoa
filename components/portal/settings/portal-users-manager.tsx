"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  createPortalUser,
  deletePortalUser,
  type ListedAuthUser,
} from "@/app/admin/(dashboard)/settings/users/actions";

type Props = {
  initial: ListedAuthUser[];
  currentUserId: string;
};

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <path
        fillRule="evenodd"
        d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.882a.75.75 0 0 0-1.06.053l-.5.556a.75.75 0 1 0 1.11 1.01l.234-.26v7.126a.75.75 0 0 0 1.5 0V12.5h1.5v3.867a.75.75 0 0 0 1.5 0V9.242l.234.26a.75.75 0 1 0 1.11-1.01l-.5-.556a.75.75 0 0 0-1.06-.053l-.72.8V8.25a.75.75 0 0 0-1.5 0v1.433l-.72-.8Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function PortalUsersManager({ initial, currentUserId }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  async function onDelete(userId: string, email: string | undefined) {
    const label = email?.trim() || "this user";
    if (
      !confirm(
        `Remove portal account ${label}? They will no longer be able to sign in.`,
      )
    ) {
      return;
    }
    setDeletingId(userId);
    setError(null);
    const r = await deletePortalUser(userId);
    setDeletingId(null);
    if ("error" in r) {
      setError(r.error);
      return;
    }
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
                <th className="px-4 py-3 w-14 font-semibold">
                  <span className="sr-only">Remove user</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
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
                    <td className="px-4 py-3 text-center">
                      {u.id === currentUserId ? (
                        <span className="text-on-surface-variant text-xs">
                          —
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={deletingId === u.id}
                          onClick={() => onDelete(u.id, u.email)}
                          className="inline-flex items-center justify-center rounded-lg p-2 text-error hover:bg-error/10 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                          aria-label={`Remove portal user ${u.email ?? u.id}`}
                        >
                          <TrashIcon className="size-5" />
                        </button>
                      )}
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
