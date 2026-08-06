"use client";

/**
 * Home hero. Sits in the same 21:9 rounded frame the design specifies for the
 * hero photo slot, but plays the neighborhood drone footage instead of the
 * striped placeholder.
 */
export function HeroMedia() {
  return (
    <div className="relative overflow-hidden rounded-[18px] border border-outline-variant bg-surface-container-high">
      {/* Capped to about half the 21:9 height so the hero doesn't dominate the
          fold. object-cover crops rather than squashing, and the cap is fluid
          so it stays a sensible band on narrow screens. */}
      <video
        className="block h-full w-full object-cover"
        style={{
          aspectRatio: "21 / 9",
          maxHeight: "clamp(170px, 22vw, 270px)",
        }}
        src="/video/hero-drone.mp4"
        autoPlay
        muted
        loop
        playsInline
        /* "metadata" only fetched the header, so the loop point stalled while
           the rest of a 14.8MB clip streamed. "auto" buffers ahead and the
           wrap is seamless. */
        preload="auto"
        aria-label="Aerial view of the neighborhood"
        /* Belt and braces: some browsers drop out of loop after a stall or a
           tab-visibility change, so nudge it back rather than leaving a frozen
           frame on the page. */
        onEnded={(e) => {
          const v = e.currentTarget;
          v.currentTime = 0;
          void v.play();
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary/60 to-transparent px-6 pt-16 pb-6 md:px-9 md:pb-8">
        <p className="text-right font-headline text-[clamp(20px,2.4vw,30px)] font-semibold tracking-[-0.02em] text-on-primary [text-shadow:0_1px_10px_rgb(0_0_0/0.35)]">
          We proudly manage Sofi Lakes.
        </p>
      </div>
    </div>
  );
}
