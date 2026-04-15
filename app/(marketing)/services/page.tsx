import type { Metadata } from "next";
import Link from "next/link";

import { formatNextDuesFirstOfMonthLong } from "@/lib/format/next-dues-cycle";

export const metadata: Metadata = {
  title: "Resident Services Hub",
};

export default function ServicesPage() {
  return (
    <main className="max-w-7xl mx-auto px-8 py-20">
      <section className="mb-24">
        <div className="flex justify-end">
          <div className="bg-surface-container-low p-8 rounded-xl w-full lg:max-w-sm">
            <div className="flex items-center gap-4 mb-4">
              <span
                className="material-symbols-outlined text-secondary"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                account_balance_wallet
              </span>
              <span className="font-label text-[11px] uppercase tracking-wider font-bold text-on-surface-variant">
                Next Dues Cycle
              </span>
            </div>
            <h3
              className="font-headline text-2xl font-bold text-primary"
              suppressHydrationWarning
            >
              {formatNextDuesFirstOfMonthLong()}
            </h3>
          </div>
        </div>
      </section>

      <section className="mb-24">
        <div className="mb-14">
          <span className="font-label text-sm uppercase tracking-[0.15em] text-secondary font-bold mb-4 block">
            Full-Service Management
          </span>
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold text-primary leading-tight max-w-2xl">
            What we can do for your community.
          </h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[
            {
              icon: "account_balance",
              title: "Financial Services",
              description:
                "Complete fiscal management so the board sees clear numbers and residents see fair assessments.",
              items: [
                { icon: "attach_money", label: "Fee Collection", detail: "Revenue collection, delinquency follow-up, and deposits into your account." },
                { icon: "receipt_long", label: "Records & Transactions", detail: "Payables, receivables, payroll (optional), budgets, and monthly reports." },
                { icon: "trending_up", label: "Financial Planning", detail: "Budgeting, capital planning, reserve funds, and asset management." },
                { icon: "account_balance", label: "Financial Management", detail: "Assessments, bank reconciliations, and year-end audit preparation." },
              ],
            },
            {
              icon: "engineering",
              title: "Operations & Maintenance",
              description:
                "Hands-on management of your property, vendors, and emergencies around the clock.",
              items: [
                { icon: "location_city", label: "Site Management", detail: "Routine inspections, on-site staff supervision, and bylaw enforcement." },
                { icon: "build", label: "Repairs & Maintenance", detail: "Qualified repair estimates and contract administration oversight." },
                { icon: "handshake", label: "Vendor Coordination", detail: "Sourcing, vetting, and managing contractors so the board doesn't have to." },
                { icon: "emergency", label: "Emergency Service", detail: "24-hour emergency assistance for all owners, any day of the year." },
              ],
            },
            {
              icon: "forum",
              title: "Governance & Communication",
              description:
                "Keeping the board informed, residents connected, and the community compliant.",
              items: [
                { icon: "call", label: "Communications", detail: "Point of contact for owners, board members, and homeowners." },
                { icon: "groups", label: "Meetings", detail: "Agendas, minutes, attendance coordination, and distribution." },
                { icon: "gavel", label: "Violations & Compliance", detail: "Violation tracking, courtesy notices, hearings, and resolution." },
              ],
            },
          ].map((group) => (
            <div
              key={group.title}
              className="bg-surface-container-lowest p-8 rounded-xl flex flex-col"
            >
              <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center mb-6">
                <span
                  className="material-symbols-outlined text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {group.icon}
                </span>
              </div>
              <h3 className="font-headline text-xl font-bold text-primary mb-2">
                {group.title}
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-6">
                {group.description}
              </p>
              <ul className="space-y-4">
                {group.items.map((item) => (
                  <li key={item.label} className="flex items-start gap-3">
                    <span
                      className="material-symbols-outlined text-secondary/60 text-lg mt-0.5 shrink-0"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {item.icon}
                    </span>
                    <div>
                      <p className="text-primary font-bold text-sm">
                        {item.label}
                      </p>
                      <p className="text-on-surface-variant text-xs leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-24">
        <div className="mb-14">
          <span className="font-label text-sm uppercase tracking-[0.15em] text-secondary font-bold mb-4 block">
            Built for Everyone
          </span>
          <h2 className="font-headline text-4xl md:text-5xl font-extrabold text-primary leading-tight max-w-2xl">
            Who we serve.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-primary to-primary-container p-10 rounded-xl relative overflow-hidden group">
            <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center mb-8 backdrop-blur-md">
                <span
                  className="material-symbols-outlined text-white"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  shield_person
                </span>
              </div>
              <h3 className="font-headline text-2xl font-bold text-white mb-3">
                HOA Boards
              </h3>
              <p className="text-white/60 text-sm leading-relaxed mb-8 max-w-md">
                Strategic partnership that lets your board focus on decisions, not
                day-to-day operations.
              </p>
              <ul className="space-y-4">
                {[
                  {
                    icon: "admin_panel_settings",
                    label: "Full-Service Management",
                    detail:
                      "End-to-end community operations so your board can govern, not manage vendors.",
                  },
                  {
                    icon: "monitoring",
                    label: "Financial Oversight",
                    detail:
                      "Transparent budgets, reserve tracking, and monthly reporting you can trust.",
                  },
                  {
                    icon: "verified",
                    label: "Compliance & Governance",
                    detail:
                      "Bylaw enforcement, meeting coordination, and regulatory guidance built in.",
                  },
                  {
                    icon: "support_agent",
                    label: "Board Support",
                    detail:
                      "Dedicated management liaison for agenda prep, action-item tracking, and strategic guidance between meetings.",
                  },
                ].map((item) => (
                  <li key={item.label} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                      <span
                        className="material-symbols-outlined text-secondary-fixed-dim text-xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {item.icon}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">
                        {item.label}
                      </p>
                      <p className="text-white/50 text-sm leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-10 rounded-xl relative overflow-hidden group hover:bg-surface-container-low transition-colors duration-300">
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center mb-8">
                <span
                  className="material-symbols-outlined text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  family_restroom
                </span>
              </div>
              <h3 className="font-headline text-2xl font-bold text-primary mb-3">
                Residents
              </h3>
              <p className="text-on-surface-variant text-sm leading-relaxed mb-8 max-w-md">
                Everything you need to manage your home and stay connected with
                the community, all in one place.
              </p>
              <ul className="space-y-4">
                {[
                  {
                    icon: "credit_card",
                    label: "Easy Payments",
                    detail:
                      "Pay dues online in seconds with one-time or auto-pay options.",
                  },
                  {
                    icon: "construction",
                    label: "Service Requests",
                    detail:
                      "Submit and track maintenance requests from your phone or desktop.",
                  },
                  {
                    icon: "campaign",
                    label: "Community Updates",
                    detail:
                      "Stay informed with real-time announcements, meeting notes, and event details.",
                  },
                  {
                    icon: "forum",
                    label: "Resident Communication",
                    detail:
                      "Direct line to management for questions, concerns, and feedback—no runaround.",
                  },
                ].map((item) => (
                  <li key={item.label} className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center shrink-0 mt-0.5">
                      <span
                        className="material-symbols-outlined text-secondary text-xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        {item.icon}
                      </span>
                    </div>
                    <div>
                      <p className="text-primary font-bold text-sm">
                        {item.label}
                      </p>
                      <p className="text-on-surface-variant text-sm leading-relaxed">
                        {item.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="text-center py-20 border-t border-outline-variant/20">
        <h2 className="font-headline text-3xl font-bold text-primary mb-4">
          Need further assistance?
        </h2>
        <p className="text-on-surface-variant mb-10 max-w-2xl mx-auto">
          Our management office is available Monday through Friday, 9:00 AM to
          5:00 PM for personalized support.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/contact"
            className="bg-primary text-white px-8 py-3 rounded-md font-bold text-sm hover:opacity-90 transition-all"
          >
            Contact Management
          </Link>
          <Link
            href="/contact#emergency"
            className="text-secondary px-8 py-3 rounded-md font-bold text-sm border border-secondary/20 hover:bg-secondary/5 transition-all"
          >
            Emergency Contacts
          </Link>
        </div>
      </section>
    </main>
  );
}
