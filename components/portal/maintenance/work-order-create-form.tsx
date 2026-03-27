"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createWorkOrder } from "@/app/admin/(dashboard)/maintenance/actions";

import { WorkOrderFormFields } from "./work-order-form-fields";

type EmployeeOpt = { id: string; name: string };

type Props = {
  employees: EmployeeOpt[];
  cancelHref?: string;
  onCancel?: () => void;
  onSuccess?: () => void;
  onCreated?: (id: string) => void;
};

export function WorkOrderCreateForm({
  employees,
  cancelHref,
  onCancel,
  onSuccess,
  onCreated,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const r = await createWorkOrder(fd);
    setSubmitting(false);
    if ("error" in r) {
      setError(r.error);
      return;
    }
    onSuccess?.();
    onCreated?.(r.id);
    router.push(`/admin/maintenance/${r.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <WorkOrderFormFields employees={employees} showImages />
      {error ? (
        <p className="text-xs text-error font-medium" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end gap-2 pt-2">
        {cancelHref ? (
          <a
            href={cancelHref}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high inline-flex items-center"
          >
            Cancel
          </a>
        ) : onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 rounded-lg text-sm font-semibold bg-secondary text-on-secondary disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Create work order"}
        </button>
      </div>
    </form>
  );
}
