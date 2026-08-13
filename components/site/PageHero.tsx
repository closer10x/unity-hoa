export function PageHero({
  eyebrow,
  title,
  intro,
}: {
  eyebrow: string;
  title: string;
  intro: string;
}) {
  return (
    <section className="mx-auto grid max-w-[1320px] items-end gap-10 px-6 pt-[76px] md:grid-cols-[1.05fr_1fr] md:gap-[72px] md:px-11">
      <div>
        <div className="mb-[18px] text-[13px] font-bold tracking-[0.08em] text-moss uppercase">
          {eyebrow}
        </div>
        <h1 className="font-display text-[44px] leading-[0.98] font-extrabold tracking-[-0.04em] text-balance md:text-[68px]">
          {title}
        </h1>
      </div>
      <p className="mb-2 text-[19px] leading-[1.62] text-body text-pretty">{intro}</p>
    </section>
  );
}
