"use client";

import { useCallback, useEffect } from "react";

type Props = {
  src: string | null;
  alt: string;
  open: boolean;
  onClose: () => void;
};

export function ImageLightbox({ src, alt, open, onClose }: Props) {
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onKey]);

  if (!open || !src) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close"
        onClick={onClose}
      />
      <div className="relative z-10 max-h-[90vh] max-w-[min(100%,920px)] w-full flex flex-col items-center">
        <button
          type="button"
          onClick={onClose}
          className="self-end mb-2 text-white text-sm font-semibold hover:underline"
        >
          Close
        </button>
        {/* Signed Supabase URLs; use native img for expiring query strings */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-h-[min(80vh,720px)] w-auto max-w-full rounded-lg object-contain shadow-2xl"
        />
      </div>
    </div>
  );
}
