import Link from "next/link";

export type FinanceAdminTabId = "summary" | "payments" | "units" | "billing";

const TABS: { id: FinanceAdminTabId; label: string; href: string }[] = [
  { id: "summary", label: "Summary", href: "/admin/finances" },
  { id: "payments", label: "Payment History", href: "/admin/finances?tab=payments" },
  { id: "units", label: "Units", href: "/admin/finances?tab=units" },
  { id: "billing", label: "Billing settings", href: "/admin/finances?tab=billing" },
];

type Props = {
  active: FinanceAdminTabId;
};

export function FinanceAdminTabs({ active }: Props) {
  return (
    <nav
      className="flex flex-wrap gap-1 border-b border-outline-variant/20 -mb-px"
      aria-label="Finances sections"
    >
      {TABS.map((t) => {
        const isActive = t.id === active;
        return (
          <Link
            key={t.id}
            href={t.href}
            className={
              "px-4 py-2.5 text-sm font-semibold rounded-t-lg border border-b-0 transition-colors " +
              (isActive
                ? "bg-surface-container-low text-secondary border-outline-variant/25 relative z-[1] mb-[-1px]"
                : "text-on-surface-variant border-transparent hover:text-on-surface hover:bg-surface-container-lowest/80")
            }
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
