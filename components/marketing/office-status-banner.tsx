"use client";

import { useEffect, useState } from "react";

import { isManagementOfficeOpenAt } from "@/lib/marketing/management-office-hours";

export function OfficeStatusBanner() {
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    const refresh = () => setOpen(isManagementOfficeOpenAt(new Date()));
    refresh();
    const id = window.setInterval(refresh, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const isOpen = open === true;

  return (
    <div
      className={
        open === null
          ? "bg-surface-container-highest p-6 rounded-xl flex items-center justify-between gap-4"
          : isOpen
            ? "bg-tertiary-fixed p-6 rounded-xl flex items-center justify-between gap-4"
            : "bg-error-container p-6 rounded-xl flex items-center justify-between gap-4"
      }
      aria-live="polite"
      aria-busy={open === null}
    >
      <div>
        <span
          className={
            open === null
              ? "text-[10px] uppercase font-bold tracking-widest text-on-surface-variant block mb-1"
              : isOpen
                ? "text-[10px] uppercase font-bold tracking-widest text-on-tertiary-fixed-variant block mb-1"
                : "text-[10px] uppercase font-bold tracking-widest text-on-error-container/80 block mb-1"
          }
        >
          Current Status
        </span>
        <p
          className={
            open === null
              ? "text-on-surface-variant font-bold text-lg"
              : isOpen
                ? "text-on-tertiary-fixed font-bold text-lg"
                : "text-on-error-container font-bold text-lg"
          }
        >
          {open === null
            ? "Checking hours…"
            : isOpen
              ? "Office is Open"
              : "Office is Closed"}
        </p>
      </div>
      <div
        className={
          open === null
            ? "h-3 w-3 rounded-full bg-on-surface-variant/30 shrink-0"
            : isOpen
              ? "h-3 w-3 rounded-full bg-secondary animate-pulse shrink-0"
              : "h-3 w-3 rounded-full bg-on-error-container shrink-0"
        }
        aria-hidden
      />
    </div>
  );
}
