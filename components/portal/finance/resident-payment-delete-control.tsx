"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { deleteResidentPayment } from "@/app/admin/(dashboard)/finances/resident-payment-actions";

type Props = {
  paymentId: string;
  /** Smaller control for nested tables */
  compact?: boolean;
};

export function ResidentPaymentDeleteControl({ paymentId, compact }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setOpen(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setError(null);
    startTransition(async () => {
      const res = await deleteResidentPayment(paymentId, fd);
      if (res.ok) {
        close();
        form.reset();
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setError(null);
        }}
        className={
          compact
            ? "text-[10px] font-semibold uppercase tracking-wide text-error hover:underline"
            : "text-xs font-semibold text-error hover:underline"
        }
      >
        Delete
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50"
          role="presentation"
          onClick={(ev) => {
            if (ev.target === ev.currentTarget) close();
          }}
        >
          <div
            className="w-full max-w-md rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-5 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-payment-title"
          >
            <h3 id="delete-payment-title" className="text-lg font-headline font-bold text-on-surface">
              Delete payment record
            </h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              This removes the row from your directory. It does not refund Stripe. Enter the configured
              delete password to confirm.
            </p>
            <form onSubmit={handleSubmit} className="mt-4 space-y-3">
              <div>
                <label htmlFor={`del-pw-${paymentId}`} className="sr-only">
                  Delete password
                </label>
                <input
                  id={`del-pw-${paymentId}`}
                  name="delete_password"
                  type="password"
                  autoComplete="off"
                  required
                  placeholder="Delete password"
                  className="w-full rounded-lg border border-outline-variant/25 bg-surface-container-highest px-3 py-2 text-sm"
                />
              </div>
              {error ? (
                <p className="text-sm text-error" role="alert">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={close}
                  className="px-4 py-2 rounded-lg border border-outline-variant/25 text-sm font-semibold text-on-surface-variant hover:bg-surface-container-high/50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="px-4 py-2 rounded-lg bg-error text-on-error text-sm font-semibold disabled:opacity-50"
                >
                  {pending ? "Deleting…" : "Confirm delete"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
