"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  MAINTENANCE_COMMUNITIES,
  MAINTENANCE_COMMON_AREAS,
  MAINTENANCE_REQUEST_HASH,
} from "@/lib/maintenance-request/options";

export function MaintenanceRequestCard() {
  const dialogTitleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const lastTriggerRef = useRef<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const openForm = useCallback(() => {
    setDone(false);
    setFormError(null);
    setOpen(true);
  }, []);

  useEffect(() => {
    function syncFromHash() {
      if (typeof window === "undefined") return;
      if (window.location.hash !== MAINTENANCE_REQUEST_HASH) return;
      openForm();
      const { pathname, search } = window.location;
      window.history.replaceState(null, "", `${pathname}${search}`);
    }
    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, [openForm]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const t = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>("select, input, textarea")?.focus();
    }, 0);
    return () => window.clearTimeout(t);
  }, [open]);

  function close() {
    setOpen(false);
    setFormError(null);
    if (done) {
      setDone(false);
    }
    queueMicrotask(() => lastTriggerRef.current?.focus());
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      community: String(fd.get("community") ?? ""),
      location: String(fd.get("location") ?? ""),
      street: String(fd.get("street") ?? ""),
      details: String(fd.get("details") ?? ""),
      name: String(fd.get("name") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      email: String(fd.get("email") ?? ""),
      website: String(fd.get("website") ?? ""),
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/maintenance-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok) {
        setFormError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
      e.currentTarget.reset();
    } catch {
      setFormError("Network error. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div
        id="maintenance-request"
        className="scroll-mt-28 md:col-span-2 lg:col-span-2 bg-surface-container-lowest p-8 rounded-xl shadow-sm hover:translate-y-[-4px] transition-transform flex flex-col justify-between group"
      >
        <div className="mb-12">
          <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-6 group-hover:bg-secondary/20 transition-colors">
            <span
              className="material-symbols-outlined text-secondary"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              engineering
            </span>
          </div>
          <h3 className="text-xl font-bold mb-2">Maintenance Request</h3>
          <p className="text-sm text-on-surface-variant">
            Report issues or request service for common areas directly through
            our portal.
          </p>
        </div>
        <button
          type="button"
          ref={(el) => {
            lastTriggerRef.current = el;
          }}
          className="text-left text-secondary font-bold text-sm flex items-center cursor-pointer bg-transparent border-0 p-0 font-inherit"
          onClick={openForm}
        >
          File Request{" "}
          <span className="material-symbols-outlined ml-2 text-sm">
            arrow_forward
          </span>
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Close maintenance request form"
            className="absolute inset-0 bg-primary/55 backdrop-blur-[3px] transition-opacity duration-200"
            onClick={close}
          />
          <div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={dialogTitleId}
            className="maint-request-dialog-panel relative w-full max-w-lg max-h-[min(90vh,720px)] overflow-y-auto rounded-2xl bg-surface-container-lowest shadow-xl border border-outline-variant/20"
          >
            <div className="sticky top-0 z-[1] flex items-start justify-between gap-4 border-b border-outline-variant/15 bg-surface-container-lowest/95 backdrop-blur-sm px-6 py-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider font-bold text-secondary mb-1">
                  Resident services
                </p>
                <h2
                  id={dialogTitleId}
                  className="text-xl font-bold text-on-surface leading-tight"
                >
                  Maintenance request
                </h2>
                <p className="text-sm text-on-surface-variant mt-1">
                  Tell us where the issue is and how to reach you. We&apos;ll
                  route this to HOA management.
                </p>
              </div>
              <button
                type="button"
                onClick={close}
                className="shrink-0 rounded-lg p-2 text-on-surface-variant hover:bg-surface-container-highest transition-colors"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            <div className="px-6 py-6">
              {done ? (
                <div className="rounded-xl bg-secondary/8 border border-secondary/15 px-5 py-8 text-center">
                  <span
                    className="material-symbols-outlined text-secondary text-4xl mb-3 inline-block"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    mark_email_read
                  </span>
                  <p className="font-bold text-on-surface mb-2">Request sent</p>
                  <p className="text-sm text-on-surface-variant mb-6">
                    Thank you. Management has received your message and will
                    follow up if needed.
                  </p>
                  <button
                    type="button"
                    onClick={close}
                    className="rounded-md bg-secondary text-on-secondary px-6 py-3 text-sm font-bold hover:opacity-95 transition-opacity"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <form className="space-y-5" onSubmit={onSubmit}>
                  <input
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                    className="absolute opacity-0 pointer-events-none w-0 h-0"
                    aria-hidden="true"
                  />

                  <div className="space-y-2">
                    <label
                      className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant block"
                      htmlFor={`${dialogTitleId}-community`}
                    >
                      Community
                    </label>
                    <select
                      id={`${dialogTitleId}-community`}
                      name="community"
                      required
                      defaultValue="sofi-lakes"
                      className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-secondary focus:outline-none transition-shadow"
                    >
                      {MAINTENANCE_COMMUNITIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant block"
                      htmlFor={`${dialogTitleId}-location`}
                    >
                      Area / location
                    </label>
                    <select
                      id={`${dialogTitleId}-location`}
                      name="location"
                      required
                      defaultValue=""
                      className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-secondary focus:outline-none transition-shadow"
                    >
                      <option value="" disabled>
                        Select an area
                      </option>
                      {MAINTENANCE_COMMON_AREAS.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant block"
                      htmlFor={`${dialogTitleId}-street`}
                    >
                      Street name or nearest cross streets{" "}
                      <span className="font-normal normal-case text-on-surface-variant/80">
                        (optional)
                      </span>
                    </label>
                    <input
                      id={`${dialogTitleId}-street`}
                      name="street"
                      type="text"
                      maxLength={200}
                      placeholder="e.g. Lakeshore Dr near the north gate"
                      className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:ring-2 focus:ring-secondary focus:outline-none transition-shadow"
                    />
                  </div>

                  <div className="space-y-2">
                    <label
                      className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant block"
                      htmlFor={`${dialogTitleId}-details`}
                    >
                      What should we know?
                    </label>
                    <textarea
                      id={`${dialogTitleId}-details`}
                      name="details"
                      rows={4}
                      maxLength={4000}
                      placeholder="Brief description of the issue, approximate time you noticed it, safety concerns, etc."
                      className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/60 focus:ring-2 focus:ring-secondary focus:outline-none transition-shadow resize-y min-h-[100px]"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2 sm:col-span-2">
                      <label
                        className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant block"
                        htmlFor={`${dialogTitleId}-name`}
                      >
                        Your name
                      </label>
                      <input
                        id={`${dialogTitleId}-name`}
                        name="name"
                        type="text"
                        required
                        autoComplete="name"
                        maxLength={120}
                        className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-secondary focus:outline-none transition-shadow"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant block"
                        htmlFor={`${dialogTitleId}-phone`}
                      >
                        Phone
                      </label>
                      <input
                        id={`${dialogTitleId}-phone`}
                        name="phone"
                        type="tel"
                        required
                        autoComplete="tel"
                        maxLength={40}
                        className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-secondary focus:outline-none transition-shadow"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        className="text-[11px] uppercase tracking-wider font-bold text-on-surface-variant block"
                        htmlFor={`${dialogTitleId}-email`}
                      >
                        Email{" "}
                        <span className="font-normal normal-case text-on-surface-variant/80">
                          (optional)
                        </span>
                      </label>
                      <input
                        id={`${dialogTitleId}-email`}
                        name="email"
                        type="email"
                        autoComplete="email"
                        maxLength={200}
                        className="w-full bg-surface-container-highest border-none rounded-md px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-secondary focus:outline-none transition-shadow"
                      />
                    </div>
                  </div>

                  {formError ? (
                    <p
                      className="text-sm text-error font-medium rounded-md bg-error-container/40 px-3 py-2"
                      role="alert"
                    >
                      {formError}
                    </p>
                  ) : null}

                  <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={close}
                      className="rounded-md px-5 py-3 text-sm font-bold text-on-surface-variant hover:bg-surface-container-highest transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="rounded-md bg-secondary text-on-secondary px-6 py-3 text-sm font-bold hover:opacity-95 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {submitting ? "Sending…" : "Send to management"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
