/** Shared intro block: mono eyebrow, page title, lead paragraph. */
export function PageIntro({
  eyebrow,
  title,
  lead,
}: {
  eyebrow: string;
  title: string;
  lead: string;
}) {
  return (
    <section className="px-4 pt-10 pb-8 sm:px-6 md:px-8 md:pt-16 md:pb-12">
      <div className="mx-auto w-full max-w-[1200px]">
        <p className="mb-6 font-label text-xs uppercase tracking-[0.14em] text-secondary-muted">
          {eyebrow}
        </p>
        <h1 className="mb-6 max-w-[18ch] text-[clamp(34px,4.2vw,56px)] leading-[1.06] font-semibold tracking-[-0.028em] text-balance">
          {title}
        </h1>
        <p className="max-w-[62ch] text-[19px] leading-relaxed text-on-surface-variant text-pretty">
          {lead}
        </p>
      </div>
    </section>
  );
}

export const SECTION_PAD = "px-4 sm:px-6 md:px-8";
export const SECTION_COL = "mx-auto w-full max-w-[1200px]";
