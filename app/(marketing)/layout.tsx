import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

/**
 * The public marketing site. Its palette, display font and paper background are
 * scoped to this wrapper — the tokens live in globals.css but nothing outside
 * (marketing) references them, so the admin and resident portals are untouched.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex min-h-full flex-col bg-paper text-ink"
      style={{ fontFamily: "var(--font-marketing)" }}
    >
      <SiteHeader />
      <div className="flex-1">{children}</div>
      <SiteFooter />
    </div>
  );
}
