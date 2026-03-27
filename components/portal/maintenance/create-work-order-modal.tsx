"use client";

import { WorkOrderCreateForm } from "./work-order-create-form";

type EmployeeOpt = { id: string; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  employees: EmployeeOpt[];
};

export function CreateWorkOrderModal({ open, onClose, employees }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wo-create-title"
    >
      <div className="bg-surface-container-lowest rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col border border-outline-variant/20">
        <div className="p-6 border-b border-outline-variant/15 flex justify-between items-start gap-4">
          <div>
            <h2 id="wo-create-title" className="font-headline text-xl font-bold text-on-surface">
              New work order
            </h2>
            <p className="text-xs text-on-surface-variant mt-1">
              A work order number is assigned automatically.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>
        <div className="p-6 flex flex-col gap-4 flex-1 min-h-0">
          <WorkOrderCreateForm
            employees={employees}
            onCancel={onClose}
            onSuccess={onClose}
          />
        </div>
      </div>
    </div>
  );
}
