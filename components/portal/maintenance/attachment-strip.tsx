"use client";

import { useState } from "react";

import { deleteAttachment } from "@/app/admin/(dashboard)/maintenance/actions";

import { ImageLightbox } from "./image-lightbox";

type Att = {
  id: string;
  storage_path: string;
  content_type: string | null;
  signedUrl: string | null;
};

type Props = {
  workOrderId: string;
  attachments: Att[];
};

export function AttachmentStrip({ workOrderId, attachments }: Props) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function onRemove(id: string) {
    if (!confirm("Remove this image?")) return;
    setPendingId(id);
    const r = await deleteAttachment(id, workOrderId);
    setPendingId(null);
    if ("error" in r) {
      alert(r.error);
    }
  }

  if (attachments.length === 0) {
    return (
      <p className="text-xs text-on-surface-variant">No photos attached yet.</p>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {attachments.map((a) => (
          <div
            key={a.id}
            className="relative group w-24 h-24 rounded-lg overflow-hidden border border-outline-variant/30 bg-surface-container-highest shrink-0"
          >
            {a.signedUrl ? (
              <button
                type="button"
                onClick={() => setLightbox(a.signedUrl)}
                className="block w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={a.signedUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[10px] text-on-surface-variant px-1 text-center">
                Preview unavailable
              </div>
            )}
            <button
              type="button"
              disabled={pendingId === a.id}
              onClick={() => onRemove(a.id)}
              className="absolute top-1 right-1 w-7 h-7 rounded-full bg-error text-on-error text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
              aria-label="Remove image"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <ImageLightbox
        src={lightbox}
        alt="Attachment"
        open={Boolean(lightbox)}
        onClose={() => setLightbox(null)}
      />
    </>
  );
}
