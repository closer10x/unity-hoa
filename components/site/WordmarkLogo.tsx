import Link from "next/link";

type WordmarkLogoProps = {
  variant?: "onLight" | "onDark";
  align?: "start" | "center";
  href?: string;
  showPeriod?: boolean;
  className?: string;
};

export function WordmarkLogo({
  variant: _variant = "onLight",
  align = "start",
  href,
  showPeriod = false,
  className = "text-base font-bold",
}: WordmarkLogoProps) {
  const color = "text-secondary-fixed-dim";

  const alignClass =
    align === "center" ? "items-center text-center" : "items-start text-left";

  const content = (
    <span
      className={`inline-flex flex-col ${alignClass} ${color} leading-none tracking-tight ${className}`}
    >
      <span className="block">Unity Grid</span>
      <span className="block mt-0.5">Management{showPeriod ? "." : ""}</span>
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="shrink-0 hover:opacity-90 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary rounded-sm"
      >
        {content}
      </Link>
    );
  }

  return content;
}
