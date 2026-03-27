"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  createEmployee,
  deleteEmployee,
  updateEmployee,
} from "@/app/admin/(dashboard)/settings/employees/actions";
import type { EmployeeRow } from "@/lib/types/maintenance";

type Props = {
  initial: EmployeeRow[];
};

export function EmployeesManager({ initial }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [editing, setEditing] = useState<EmployeeRow | null>(null);

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const r = await createEmployee(fd);
    if ("error" in r) {
      setError(r.error);
      return;
    }
    e.currentTarget.reset();
    router.refresh();
  }

  async function onUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("id", editing.id);
    const r = await updateEmployee(fd);
    if ("error" in r) {
      setError(r.error);
      return;
    }
    setEditing(null);
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!confirm("Remove this employee? Assigned work orders will become unassigned.")) {
      return;
    }
    setPending(id);
    setError(null);
    const r = await deleteEmployee(id);
    setPending(null);
    if ("error" in r) {
      setError(r.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-headline font-bold text-on-surface mb-1">
          Team
        </h1>
        <p className="text-on-surface-variant text-sm max-w-xl">
          Staff who can be assigned to maintenance work orders.
        </p>
      </div>

      <section className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/10">
        <h2 className="font-headline text-lg font-bold text-on-surface mb-4">
          Add employee
        </h2>
        <form
          onSubmit={onCreate}
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 items-end"
        >
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
              Name
            </label>
            <input
              name="name"
              required
              className="w-full bg-surface-container-highest border-none rounded-md px-3 py-2.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
              Role
            </label>
            <input
              name="role"
              className="w-full bg-surface-container-highest border-none rounded-md px-3 py-2.5 text-sm"
              placeholder="e.g. Grounds"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
              Email
            </label>
            <input
              name="email"
              type="email"
              className="w-full bg-surface-container-highest border-none rounded-md px-3 py-2.5 text-sm"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
              Phone
            </label>
            <input
              name="phone"
              className="w-full bg-surface-container-highest border-none rounded-md px-3 py-2.5 text-sm"
            />
          </div>
          <div className="flex gap-2 xl:col-span-1">
            <button
              type="submit"
              className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-secondary text-on-secondary"
            >
              Add
            </button>
          </div>
        </form>
      </section>

      {error ? (
        <p className="text-sm text-error" role="alert">
          {error}
        </p>
      ) : null}

      <section className="bg-surface-container-low rounded-xl border border-outline-variant/10 overflow-hidden">
        <div className="p-4 border-b border-outline-variant/15">
          <h2 className="font-headline text-lg font-bold text-on-surface">
            Employees
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-container-highest/60 text-[11px] uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="px-4 py-3 font-bold">Name</th>
                <th className="px-4 py-3 font-bold">Role</th>
                <th className="px-4 py-3 font-bold">Contact</th>
                <th className="px-4 py-3 font-bold">Active</th>
                <th className="px-4 py-3 font-bold w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-on-surface-variant">
                    No employees yet.
                  </td>
                </tr>
              ) : (
                items.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-outline-variant/10 hover:bg-surface-container-lowest/80"
                  >
                    <td className="px-4 py-3 font-semibold text-on-surface">{row.name}</td>
                    <td className="px-4 py-3 text-on-surface-variant">{row.role || "—"}</td>
                    <td className="px-4 py-3 text-on-surface-variant text-xs">
                      {row.email || "—"}
                      {row.phone ? ` · ${row.phone}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          row.active
                            ? "bg-secondary-container text-on-secondary-container"
                            : "bg-surface-container-highest text-on-surface-variant"
                        }`}
                      >
                        {row.active ? "Yes" : "No"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setEditing(row);
                          }}
                          className="text-xs font-bold text-secondary hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={pending === row.id}
                          onClick={() => onDelete(row.id)}
                          className="text-xs font-bold text-error hover:underline disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {editing ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-surface-container-lowest rounded-xl shadow-xl max-w-md w-full p-6 border border-outline-variant/20">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-headline text-lg font-bold text-on-surface">
                Edit employee
              </h3>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="text-on-surface-variant"
                aria-label="Close"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={onUpdate} className="space-y-4">
              <input type="hidden" name="id" value={editing.id} />
              <div className="space-y-1">
                <label className="text-[11px] uppercase font-bold text-on-surface-variant">
                  Name
                </label>
                <input
                  name="name"
                  required
                  defaultValue={editing.name}
                  className="w-full bg-surface-container-highest border-none rounded-md px-3 py-2.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] uppercase font-bold text-on-surface-variant">
                  Role
                </label>
                <input
                  name="role"
                  defaultValue={editing.role ?? ""}
                  className="w-full bg-surface-container-highest border-none rounded-md px-3 py-2.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] uppercase font-bold text-on-surface-variant">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  defaultValue={editing.email ?? ""}
                  className="w-full bg-surface-container-highest border-none rounded-md px-3 py-2.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] uppercase font-bold text-on-surface-variant">
                  Phone
                </label>
                <input
                  name="phone"
                  defaultValue={editing.phone ?? ""}
                  className="w-full bg-surface-container-highest border-none rounded-md px-3 py-2.5 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] uppercase font-bold text-on-surface-variant">
                  Status
                </label>
                <select
                  name="active"
                  defaultValue={editing.active ? "true" : "false"}
                  className="w-full bg-surface-container-highest border-none rounded-md px-3 py-2.5 text-sm"
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <p className="text-[10px] text-on-surface-variant">
                Inactive employees are hidden from assignment lists.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-on-surface-variant"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-secondary text-on-secondary"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
