"use server";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { createServiceClient, isSupabaseConfigured } from "@/lib/supabase/server";

import { loadOwnerNames, type FinanceRow } from "./server-data";
import type { ReportData, ReportSection, ReportType } from "./types";

/**
 * Financial reports over a date range, built from the same tables the
 * Accounting section shows. Every number is computed from live rows at the
 * moment the report runs — nothing is cached, nothing is invented. Reports
 * are reads; only exports of *changed* data would need the audit trail.
 *
 * The standard HOA monthly package also carries a balance sheet, budget
 * comparison and AR aging; those need budgets and per-owner balance ledgers
 * that don't exist yet, so they are deliberately absent rather than faked.
 */

const usd = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function prettyDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function stampNow(): string {
  const d = new Date();
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}, ${h}:${String(d.getMinutes()).padStart(2, "0")} ${ampm}`;
}

const TITLES: Record<ReportType, string> = {
  "income-statement": "Income & expense statement",
  "general-ledger": "General ledger detail",
  "cash-bank": "Cash & bank activity",
  "owner-charges": "Owner charges & collections",
};

type CategoryBucket = { count: number; cents: number };

function byCategory(rows: FinanceRow[]): Map<string, CategoryBucket> {
  const map = new Map<string, CategoryBucket>();
  for (const r of rows) {
    const key = r.category || "Other";
    const b = map.get(key) ?? { count: 0, cents: 0 };
    b.count += 1;
    b.cents += r.amount_cents ?? 0;
    map.set(key, b);
  }
  return map;
}

function categorySection(title: string, rows: FinanceRow[], totalLabel: string): ReportSection {
  const buckets = [...byCategory(rows).entries()].sort((a, b) => b[1].cents - a[1].cents);
  return {
    title,
    columns: ["Category", "Entries", "Amount"],
    rows: buckets.map(([cat, b]) => [cat, String(b.count), usd(b.cents)]),
    total: [totalLabel, String(rows.length), usd(rows.reduce((s, r) => s + (r.amount_cents ?? 0), 0))],
  };
}

export async function buildReport(input: {
  type: ReportType;
  start: string;
  end: string;
  periodLabel: string;
}): Promise<{ ok: true; report: ReportData } | { ok: false; error: string }> {
  try {
    const session = await requireAdminUser();
    if (!isSupabaseConfigured()) {
      return { ok: false, error: "Supabase is not configured — there is nothing to report on." };
    }
    if (!DATE_RE.test(input.start) || !DATE_RE.test(input.end)) {
      return { ok: false, error: "Pick a start and end date for the report." };
    }
    if (input.start > input.end) {
      return { ok: false, error: "The report's start date is after its end date." };
    }
    if (!(input.type in TITLES)) {
      return { ok: false, error: "Pick a report." };
    }

    const db = createServiceClient();
    const [ftRes, baRes, ownerNames] = await Promise.all([
      db
        .from("finance_transactions")
        .select("*")
        .gte("occurred_on", input.start)
        .lte("occurred_on", input.end)
        .order("occurred_on", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(5000),
      db.from("bank_accounts").select("*").order("created_at", { ascending: true }),
      loadOwnerNames(db),
    ]);
    if (ftRes.error) throw new Error(ftRes.error.message);

    const rows = (ftRes.data ?? []) as FinanceRow[];
    const income = rows.filter((r) => r.kind === "income");
    const expense = rows.filter((r) => r.kind === "expense");
    const incomeCents = income.reduce((s, r) => s + (r.amount_cents ?? 0), 0);
    const expenseCents = expense.reduce((s, r) => s + (r.amount_cents ?? 0), 0);
    const net = incomeCents - expenseCents;
    const netLabel = `${net < 0 ? "−" : ""}${usd(Math.abs(net))}`;

    type BankRow = {
      id: string;
      name: string;
      institution_name: string;
      mask: string;
      account_type: string;
      current_balance_cents: number | null;
      status: string;
      last_synced_at: string | null;
    };
    const banks = (baRes.data ?? []) as BankRow[];
    const bankLabel = (b: BankRow) =>
      `${b.institution_name || b.name}${b.mask ? ` ····${b.mask}` : ""}`;

    const report: ReportData = {
      type: input.type,
      title: TITLES[input.type],
      community: "Sofi Lakes — Unity Grid Management",
      periodLabel: `${prettyDate(input.start)} – ${prettyDate(input.end)}${input.periodLabel ? ` · ${input.periodLabel}` : ""}`,
      start: input.start,
      end: input.end,
      generatedAt: stampNow(),
      generatedBy:
        session.profile.display_name?.trim() || session.user.email || "Administrator",
      summary: [],
      sections: [],
    };

    if (input.type === "income-statement") {
      report.summary = [
        { label: "Total income", value: usd(incomeCents), note: `${income.length} entr${income.length === 1 ? "y" : "ies"}` },
        { label: "Total expenses", value: usd(expenseCents), note: `${expense.length} entr${expense.length === 1 ? "y" : "ies"}` },
        { label: "Net", value: netLabel, note: net < 0 ? "Spending ahead of income" : "Income ahead of spending" },
      ];
      report.sections = [
        categorySection("Income by category", income, "Total income"),
        categorySection("Expenses by category", expense, "Total expenses"),
      ];
      if (!rows.length) report.note = "No ledger activity in this period.";
    }

    if (input.type === "general-ledger") {
      report.summary = [
        { label: "Entries", value: String(rows.length) },
        { label: "Money in", value: usd(incomeCents) },
        { label: "Money out", value: usd(expenseCents) },
        { label: "Net", value: netLabel },
      ];
      report.sections = [
        {
          title: "Every transaction, oldest first",
          columns: ["Date", "Description", "Category", "Owner", "Source", "Amount"],
          rows: rows.map((r) => [
            prettyDate(r.occurred_on ?? r.created_at.slice(0, 10)),
            r.description || "(no description)",
            r.category || "Other",
            (r.lot_id && ownerNames.get(r.lot_id)) || "—",
            r.source === "bank" ? "Bank import" : "Manual",
            `${r.kind === "expense" ? "−" : "+"}${usd(r.amount_cents ?? 0)}`,
          ]),
          total: ["Net for the period", "", "", "", "", netLabel],
        },
      ];
      if (!rows.length) report.note = "No ledger activity in this period.";
    }

    if (input.type === "cash-bank") {
      const active = banks.filter((b) => b.status === "active");
      const withBalance = active.filter((b) => b.current_balance_cents != null);
      const balanceCents = withBalance.reduce((s, b) => s + (b.current_balance_cents ?? 0), 0);
      const bankRows = rows.filter((r) => r.source === "bank");
      const perAccount = new Map<string, { inCents: number; outCents: number; count: number }>();
      for (const r of bankRows) {
        const key = r.bank_account_id ?? "unknown";
        const b = perAccount.get(key) ?? { inCents: 0, outCents: 0, count: 0 };
        if (r.kind === "income") b.inCents += r.amount_cents ?? 0;
        else b.outCents += r.amount_cents ?? 0;
        b.count += 1;
        perAccount.set(key, b);
      }
      report.summary = [
        { label: "Linked accounts", value: String(active.length) },
        { label: "Bank balance today", value: withBalance.length ? usd(balanceCents) : "—" },
        { label: "Imported in", value: usd(bankRows.filter((r) => r.kind === "income").reduce((s, r) => s + (r.amount_cents ?? 0), 0)) },
        { label: "Imported out", value: usd(bankRows.filter((r) => r.kind === "expense").reduce((s, r) => s + (r.amount_cents ?? 0), 0)) },
      ];
      report.sections = [
        {
          title: "Bank accounts",
          columns: ["Account", "Type", "Balance", "Last synced", "Status"],
          rows: banks.map((b) => [
            bankLabel(b),
            b.account_type,
            b.current_balance_cents == null ? "—" : usd(b.current_balance_cents),
            b.last_synced_at ? prettyDate(b.last_synced_at.slice(0, 10)) : "Never",
            b.status === "active" ? "Active" : "Disconnected",
          ]),
        },
        {
          title: "Imported activity by account",
          columns: ["Account", "Entries", "Money in", "Money out"],
          rows: [...perAccount.entries()].map(([id, v]) => [
            banks.find((b) => b.id === id) ? bankLabel(banks.find((b) => b.id === id)!) : "(unlinked)",
            String(v.count),
            usd(v.inCents),
            usd(v.outCents),
          ]),
        },
      ];
      if (!banks.length) {
        report.note =
          "No bank account is linked yet. Connect one in Accounting → Bank accounts and this report fills itself.";
      }
    }

    if (input.type === "owner-charges") {
      const linked = rows.filter((r) => r.lot_id);
      const perOwner = new Map<string, { count: number; cents: number }>();
      for (const r of linked) {
        const key = ownerNames.get(r.lot_id!) ?? "Unknown lot";
        const b = perOwner.get(key) ?? { count: 0, cents: 0 };
        b.count += 1;
        b.cents += r.kind === "expense" ? -(r.amount_cents ?? 0) : (r.amount_cents ?? 0);
        perOwner.set(key, b);
      }
      const totalCents = [...perOwner.values()].reduce((s, v) => s + v.cents, 0);
      report.summary = [
        { label: "Owners with activity", value: String(perOwner.size) },
        { label: "Linked entries", value: String(linked.length) },
        { label: "Net collected", value: usd(Math.max(0, totalCents)) },
      ];
      report.sections = [
        {
          title: "By owner",
          columns: ["Owner", "Entries", "Net"],
          rows: [...perOwner.entries()]
            .sort((a, b) => b[1].cents - a[1].cents)
            .map(([owner, v]) => [owner, String(v.count), usd(v.cents)]),
          total: ["Total", String(linked.length), usd(totalCents)],
        },
        {
          title: "Entry detail",
          columns: ["Date", "Owner", "Description", "Category", "Amount"],
          rows: linked.map((r) => [
            prettyDate(r.occurred_on ?? r.created_at.slice(0, 10)),
            ownerNames.get(r.lot_id!) ?? "Unknown lot",
            r.description || "(no description)",
            r.category || "Other",
            `${r.kind === "expense" ? "−" : "+"}${usd(r.amount_cents ?? 0)}`,
          ]),
        },
      ];
      if (!linked.length) {
        report.note =
          "No owner-linked entries in this period. Link income to a resident when recording it and they appear here.";
      }
    }

    return { ok: true, report };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "The report could not be built." };
  }
}
