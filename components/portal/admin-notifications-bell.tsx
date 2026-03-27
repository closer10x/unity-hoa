"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/admin/(dashboard)/settings/notifications/actions";
import type { AdminNotificationHeaderPayload } from "@/lib/notifications/load";

function formatRelativeTime(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 45) return "Just now";
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

type Props = {
  initial: AdminNotificationHeaderPayload;
};

export function AdminNotificationsBell({ initial }: Props) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  const { items, unreadCount } = initial;

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function onItemClick(id: string, href: string | null) {
    startTransition(async () => {
      await markNotificationRead(id);
      setOpen(false);
      router.refresh();
      if (href) {
        router.push(href);
      }
    });
  }

  function onMarkAll() {
    startTransition(async () => {
      await markAllNotificationsRead();
      router.refresh();
    });
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        className="relative p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500"
        aria-label="Notifications"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 ? (
          <span className="absolute top-0 right-0 min-w-[18px] h-[18px] px-0.5 rounded-full bg-secondary text-[10px] font-bold text-on-secondary flex items-center justify-center">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div
          className="absolute right-0 mt-2 w-[min(100vw-2rem,24rem)] max-h-[min(70vh,26rem)] overflow-y-auto rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-xl z-[60]"
          role="menu"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/20">
            <span className="text-sm font-bold text-on-surface">Notifications</span>
            {unreadCount > 0 ? (
              <button
                type="button"
                className="text-xs font-semibold text-secondary hover:underline"
                onClick={onMarkAll}
              >
                Mark all read
              </button>
            ) : null}
          </div>
          {items.length === 0 ? (
            <p className="px-4 py-8 text-sm text-on-surface-variant text-center">
              No notifications yet.
            </p>
          ) : (
            <ul className="divide-y divide-outline-variant/15">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    role="menuitem"
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors ${
                      !n.read ? "bg-secondary/5" : ""
                    }`}
                    onClick={() => onItemClick(n.id, n.href)}
                  >
                    <p className="text-sm font-semibold text-on-surface">{n.title}</p>
                    {n.body ? (
                      <p className="text-xs text-on-surface-variant mt-0.5 line-clamp-2">
                        {n.body}
                      </p>
                    ) : null}
                    <p className="text-[10px] text-on-surface-variant/80 mt-1">
                      {formatRelativeTime(n.created_at)}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
