"use client";

import Link from "next/link";
import { useId } from "react";

type WordmarkLogoProps = {
  variant?: "onLight" | "onDark";
  /** Larger lockup for hero sections. */
  emphasis?: "default" | "hero";
  align?: "start" | "center";
  href?: string;
  className?: string;
  priority?: boolean;
};

function UnityGridManagementSvg({
  variant,
  emphasis,
}: {
  variant: "onLight" | "onDark";
  emphasis: "default" | "hero";
}) {
  const isOnDark = variant === "onDark";
  const isHero = emphasis === "hero" && isOnDark;
  const gid = useId().replace(/:/g, "");

  const sizeClass = isHero
    ? "h-12 w-auto sm:h-16 md:h-20"
    : isOnDark
      ? "h-8 w-auto sm:h-9"
      : "h-7 w-auto sm:h-9";

  const wordClass = isOnDark
    ? "fill-secondary-fixed"
    : "fill-secondary-fixed-dim dark:fill-secondary-fixed";

  return (
    <svg
      className={sizeClass}
      viewBox="0 0 296 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="0%" y1="50%" x2="100%" y2="50%">
          <stop stopColor="var(--color-secondary-fixed)" />
          <stop offset="1" stopColor="var(--color-secondary-fixed-dim)" />
        </linearGradient>
      </defs>
      <rect
        x="0"
        y="0"
        width="36"
        height="36"
        rx="6"
        fill={`url(#${gid})`}
      />
      <rect
        x="7.5"
        y="8.5"
        width="5.2"
        height="19"
        rx="1.4"
        className="fill-secondary"
      />
      <rect
        x="23.3"
        y="8.5"
        width="5.2"
        height="19"
        rx="1.4"
        className="fill-secondary"
      />
      <rect
        x="7.5"
        y="24"
        width="21"
        height="5.2"
        rx="2.6"
        className="fill-secondary"
      />
      <text
        x="44"
        y="24.5"
        className={wordClass}
        style={{
          fontFamily: "var(--font-headline), ui-sans-serif, system-ui, sans-serif",
          fontSize: "12.5px",
          fontWeight: 700,
          letterSpacing: "0.07em",
        }}
      >
        UNITY GRID MANAGEMENT
      </text>
    </svg>
  );
}

export function WordmarkLogo({
  variant = "onLight",
  emphasis = "default",
  align = "start",
  href,
  className,
  priority = false,
}: WordmarkLogoProps) {
  void priority;
  const justify = align === "center" ? "justify-center" : "justify-start";

  const content = (
    <span
      className={`relative inline-flex ${justify} ${className ?? ""}`.trim()}
    >
      <UnityGridManagementSvg variant={variant} emphasis={emphasis} />
    </span>
  );

  if (href) {
    const linkLayout =
      align === "center"
        ? "block mx-auto max-w-full w-fit"
        : "inline-block max-w-full shrink-0";
    return (
      <Link
        href={href}
        className={`${linkLayout} hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary rounded-md`}
      >
        {content}
      </Link>
    );
  }

  return content;
}
