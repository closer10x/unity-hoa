"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import type { WorkOrderDetail } from "@/app/admin/(dashboard)/maintenance/actions";
import { updateWorkOrder } from "@/app/admin/(dashboard)/maintenance/actions";

import { AttachmentStrip } from "./attachment-strip";
import { WorkOrderFormFields } from "./work-order-form-fields";

type EmployeeOpt = { id: string; name: string };

type Props = {
  order: WorkOrderDetail;
  employees: EmployeeOpt[];
};

function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function WorkOrderDetailClient({ order, employees }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const defaults = useMemo(
    () => ({
      title: order.title,
      description: order.description ?? "",
      location: order.location ?? "",
      category: order.category,
      priority: order.priority,
      status: order.status,
      reported_by_name: order.reported_by_name ?? "",
      reported_by_unit: order.reported_by_unit ?? "",
      reported_by_email: order.reported_by_email ?? "",
      assigned_to: order.assigned_to ?? "",
      due_at: toDatetimeLocalValue(order.due_at),
      internal_notes: order.internal_notes ?? "",
    }),
    [order],
  );

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setOk(null);
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const r = await updateWorkOrder(fd);
    setSubmitting(false);
    if ("error" in r) {
      setError(r.error);
      return;
    }
    setOk("Saved.");
    router.refresh();
  }

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-center gap-3 text-sm">
        <Link
          href="/admin/maintenance"
          className="text-secondary font-semibold hover:underline inline-flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to maintenance
        </Link>
      </div>

      <header>
        <p className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant mb-1">
          Work order
        </p>
        <h1 className="text-2xl font-headline font-bold text-on-surface">
          {order.work_order_number}
        </h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Created {new Date(order.created_at).toLocaleString()}
          {order.assignee_name ? ` · Assigned: ${order.assignee_name}` : ""}
        </p>
      </header>

      <section className="bg-surface-container-low rounded-xl p-6 md:p-8 border border-outline-variant/10">
        <h2 className="font-headline text-lg font-bold text-on-surface mb-4">
          Details
        </h2>
        <form onSubmit={onSubmit} className="space-y-4">
          <WorkOrderFormFields
            employees={employees}
            defaults={defaults}
            idField={order.id}
            showImages
          />
          {error ? (
            <p className="text-xs text-error font-medium" role="alert">
              {error}
            </p>
          ) : null}
          {ok ? (
            <p className="text-xs text-secondary font-medium" role="status">
              {ok}
            </p>
          ) : null}
          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-secondary text-on-secondary disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-surface-container-low rounded-xl p-6 md:p-8 border border-outline-variant/10">
        <h2 className="font-headline text-lg font-bold text-on-surface mb-2">
          Photos
        </h2>
        <p className="text-xs text-on-surface-variant mb-4">
          Click a thumbnail to enlarge. Use “Add photos” above to upload more.
        </p>
        <AttachmentStrip workOrderId={order.id} attachments={order.attachments} />
      </section>
    </div>
  );
}
