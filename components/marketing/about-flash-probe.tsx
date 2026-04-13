"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

const ENDPOINT =
  "http://127.0.0.1:7345/ingest/a72712c2-d85b-4bc4-86c4-3918f25ed1bb";

let probePhysicalMountSeq = 0;

function send(
  location: string,
  message: string,
  hypothesisId: string,
  data: Record<string, unknown>,
) {
  fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "5f63f3",
    },
    body: JSON.stringify({
      sessionId: "5f63f3",
      runId: "post-fix",
      location,
      message,
      hypothesisId,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}

/** Debug-only: traces paint-order and hero image for About page flash investigation. */
export function AboutFlashProbe() {
  const probeMountInstance = useRef<number | null>(null);
  if (probeMountInstance.current === null) {
    probeMountInstance.current = ++probePhysicalMountSeq;
  }

  // #region agent log
  useLayoutEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    send(
      "about-flash-probe.tsx:layout",
      "about_probe_layout",
      "D",
      {
        readyState: document.readyState,
        prefersDark: mql.matches,
        htmlClassLen: document.documentElement.className.length,
      },
    );
    send("about-flash-probe.tsx:layout", "about_probe_mount", "F", {
      probeMountInstance: probeMountInstance.current,
    });
  }, []);
  // #endregion

  // #region agent log
  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    send(
      "about-flash-probe.tsx:effect",
      "about_probe_effect",
      "D",
      {
        readyState: document.readyState,
        prefersDark: mql.matches,
      },
    );

    const heroSection = document.querySelector("main section");
    const firstImg = document.querySelector(
      'main section img[alt="Luxury residential estate architecture and landscaping"]',
    ) as HTMLImageElement | null;

    const logImg = (via: string) => {
      send("about-flash-probe.tsx:img", "hero_img_state", "A", {
        via,
        complete: firstImg?.complete ?? null,
        naturalWidth: firstImg?.naturalWidth ?? null,
        currentSrcLen: firstImg?.currentSrc?.length ?? null,
      });
    };

    if (firstImg) {
      if (firstImg.complete) logImg("already_complete");
      else firstImg.addEventListener("load", () => logImg("load_event"), { once: true });
    } else {
      send("about-flash-probe.tsx:img", "hero_img_missing", "A", {
        via: "no_img",
        note: "expect_when_hero_is_css_background",
      });
    }

    void document.fonts.ready.then(() => {
      send("about-flash-probe.tsx:fonts", "document_fonts_ready", "C", {
        status: document.fonts.status,
      });
    });

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const el = heroSection;
        send("about-flash-probe.tsx:raf2", "post_paint_layout", "B", {
          sectionW: el?.clientWidth ?? null,
          sectionH: el?.clientHeight ?? null,
        });
      });
    });
  }, []);
  // #endregion

  return null;
}
