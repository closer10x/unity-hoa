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
  "balance-sheet": "Balance sheet",
  "income-statement": "Income & expense statement",
  "ar-aging": "Aged receivables",
  "owner-balances": "Owner balances",
  receipts: "Receipts — money received",
  disbursements: "Disbursements — money paid out",
  "revenue-by-entity": "Revenue by company",
  "general-ledger": "General ledger detail",
  "cash-bank": "Cash & bank activity",
  "owner-charges": "Owner charges & collections",
};

/**
 * An invoice as the receivables reports need it: what is still owed, and for
 * how long it has been owed.
 */
type InvoiceRow = {
  id: string;
  invoice_number: string;
  lot_id: string | null;
  bill_to_name: string | null;
  issued_on: string;
  due_on: string | null;
  status: string;
  total_cents: number;
  paid_on: string | null;
  entity_key: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_bank: string | null;
  payment_deposited: boolean | null;
};

/** Days past due as of `asOf`, floored at zero. Undated invoices are current. */
function daysPastDue(due: string | null, asOf: string): number {
  if (!due) return 0;
  const ms = Date.parse(`${asOf}T00:00:00Z`) - Date.parse(`${due}T00:00:00Z`);
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/* The buckets every managing agent's aging report uses, so a board reading
   this next to one from another agent is comparing like with like. */
const AGING_BUCKETS = ["Current", "1–30", "31–60", "61–90", "Over 90"] as const;

function agingBucket(days: number): (typeof AGING_BUCKETS)[number] {
  if (days <= 0) return "Current";
  if (days <= 30) return "1–30";
  if (days <= 60) return "31–60";
  if (days <= 90) return "61–90";
  return "Over 90";
}

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
    /* Invoices are read in full rather than by period: a receivable is owed
       today regardless of which month it was raised in, and an aging report
       that only saw the last 30 days would show a clean book. */
    const [ftRes, baRes, ownerNames, invRes, entRes] = await Promise.all([
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
      db.from("invoices").select("*").order("issued_on", { ascending: true }).limit(5000),
      db.from("billing_entities").select("key, name, legal_name").order("sort"),
    ]);
    if (ftRes.error) throw new Error(ftRes.error.message);

    const invoices = (invRes.data ?? []) as InvoiceRow[];
    const entities = (entRes.data ?? []) as { key: string; name: string; legal_name: string }[];
    const entityName = (key: string | null) =>
      key ? entities.find((e) => e.key === key)?.legal_name ?? key : "Unassigned";

    /** Everything issued and not yet collected, as of the report's end date. */
    const owed = invoices.filter((i) => i.status === "sent");
    const owedFor = (i: InvoiceRow) =>
      (i.lot_id && ownerNames.get(i.lot_id)) || i.bill_to_name || "Unassigned lot";

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

    if (input.type === "balance-sheet") {
      const active = banks.filter((b) => b.status === "active");
      const cashCents = active.reduce((s, b) => s + (b.current_balance_cents ?? 0), 0);
      const arCents = owed.reduce((s, i) => s + (i.total_cents ?? 0), 0);
      const assetsCents = cashCents + arCents;

      report.summary = [
        { label: "Cash", value: usd(cashCents), note: `${active.length} linked account${active.length === 1 ? "" : "s"}` },
        { label: "Receivables", value: usd(arCents), note: `${owed.length} invoice${owed.length === 1 ? "" : "s"} unpaid` },
        { label: "Total assets", value: usd(assetsCents) },
      ];
      report.sections = [
        {
          title: "Assets",
          columns: ["Line", "Detail", "Amount"],
          rows: [
            ...active.map((b) => [
              "Cash — operating",
              bankLabel(b),
              b.current_balance_cents == null ? "not reported" : usd(b.current_balance_cents),
            ]),
            ...(active.length ? [] : [["Cash", "No bank account linked", usd(0)]]),
            ["Accounts receivable", `${owed.length} invoice${owed.length === 1 ? "" : "s"} issued and unpaid`, usd(arCents)],
          ],
          total: ["Total assets", "", usd(assetsCents)],
        },
        {
          title: "Liabilities",
          columns: ["Line", "Detail", "Amount"],
          rows: [["Accounts payable", "Vendor bills are not tracked in this portal yet", "—"]],
        },
        {
          title: "Equity",
          columns: ["Line", "Detail", "Amount"],
          /* Assets minus the liabilities we actually know about. Named
             "members' equity" the way an association's statements do. */
          rows: [["Members' equity", "Assets less recorded liabilities", usd(assetsCents)]],
          total: ["Total liabilities & equity", "", usd(assetsCents)],
        },
      ];
      report.caveats = [
        "Accounts payable is not tracked yet, so liabilities are understated and equity is overstated by whatever is owed to vendors.",
        "Reserve and operating funds are not separated — every linked account is shown as operating cash.",
        "Prepaid assessments are counted as collected income rather than a liability.",
      ];
      if (!active.length && !owed.length) {
        report.note = "No linked bank account and no unpaid invoices — there is nothing on the balance sheet yet.";
      }
    }

    if (input.type === "ar-aging") {
      const asOf = input.end;
      const byBucket = new Map<string, { count: number; cents: number }>();
      for (const b of AGING_BUCKETS) byBucket.set(b, { count: 0, cents: 0 });
      for (const i of owed) {
        const b = byBucket.get(agingBucket(daysPastDue(i.due_on, asOf)))!;
        b.count += 1;
        b.cents += i.total_cents ?? 0;
      }
      const totalCents = owed.reduce((s, i) => s + (i.total_cents ?? 0), 0);
      const pastDueCents = owed
        .filter((i) => daysPastDue(i.due_on, asOf) > 0)
        .reduce((s, i) => s + (i.total_cents ?? 0), 0);

      report.summary = [
        { label: "Total receivable", value: usd(totalCents), note: `${owed.length} unpaid invoice${owed.length === 1 ? "" : "s"}` },
        { label: "Past due", value: usd(pastDueCents), note: totalCents ? `${Math.round((pastDueCents / totalCents) * 100)}% of the book` : "Nothing outstanding" },
        { label: "Over 90 days", value: usd(byBucket.get("Over 90")!.cents), note: "Collections territory" },
      ];
      report.sections = [
        {
          title: `Aging summary as of ${prettyDate(asOf)}`,
          columns: ["Days past due", "Invoices", "Amount", "Share"],
          rows: AGING_BUCKETS.map((b) => {
            const v = byBucket.get(b)!;
            return [
              b,
              String(v.count),
              usd(v.cents),
              totalCents ? `${Math.round((v.cents / totalCents) * 100)}%` : "—",
            ];
          }),
          total: ["Total", String(owed.length), usd(totalCents), totalCents ? "100%" : "—"],
        },
        {
          title: "Every unpaid invoice, oldest first",
          columns: ["Invoice", "Owner", "Company", "Due", "Days past due", "Amount"],
          rows: [...owed]
            .sort((a, b) => daysPastDue(b.due_on, asOf) - daysPastDue(a.due_on, asOf))
            .map((i) => {
              const d = daysPastDue(i.due_on, asOf);
              return [
                i.invoice_number,
                owedFor(i),
                entityName(i.entity_key),
                i.due_on ? prettyDate(i.due_on) : "No due date",
                d > 0 ? String(d) : "Current",
                usd(i.total_cents ?? 0),
              ];
            }),
          total: ["Total receivable", "", "", "", "", usd(totalCents)],
        },
      ];
      if (!owed.length) report.note = "Nothing is outstanding — every invoice raised has been collected.";
    }

    if (input.type === "owner-balances") {
      const asOf = input.end;
      const perOwner = new Map<string, { count: number; cents: number; oldest: number }>();
      for (const i of owed) {
        const key = owedFor(i);
        const v = perOwner.get(key) ?? { count: 0, cents: 0, oldest: 0 };
        v.count += 1;
        v.cents += i.total_cents ?? 0;
        v.oldest = Math.max(v.oldest, daysPastDue(i.due_on, asOf));
        perOwner.set(key, v);
      }
      const paid = invoices.filter((i) => i.status === "paid");
      const collectedCents = paid.reduce((s, i) => s + (i.total_cents ?? 0), 0);
      const totalCents = [...perOwner.values()].reduce((s, v) => s + v.cents, 0);

      report.summary = [
        { label: "Owners with a balance", value: String(perOwner.size) },
        { label: "Total owed", value: usd(totalCents) },
        { label: "Collected to date", value: usd(collectedCents), note: `${paid.length} invoice${paid.length === 1 ? "" : "s"} settled` },
      ];
      report.sections = [
        {
          title: "Owners owing money, largest first",
          columns: ["Owner", "Unpaid invoices", "Balance", "Oldest item"],
          rows: [...perOwner.entries()]
            .sort((a, b) => b[1].cents - a[1].cents)
            .map(([owner, v]) => [
              owner,
              String(v.count),
              usd(v.cents),
              v.oldest > 0 ? `${v.oldest} days past due` : "Current",
            ]),
          total: ["Total", String(owed.length), usd(totalCents), ""],
        },
      ];
      report.caveats = [
        "Balances come from issued invoices only. A household that has never been invoiced shows no balance even if dues are owed.",
      ];
      if (!perOwner.size) report.note = "No owner has an unpaid invoice.";
    }

    if (input.type === "receipts") {
      /* What actually arrived, from the ledger rather than the invoices —
         the ledger is where money is recorded, and a receipt that came in
         without an invoice behind it still has to appear. */
      const received = income;
      const byMethod = new Map<string, { count: number; cents: number }>();
      const paidInPeriod = invoices.filter(
        (i) => i.paid_on && i.paid_on >= input.start && i.paid_on <= input.end,
      );
      for (const i of paidInPeriod) {
        const key = i.payment_method?.trim() || "Not recorded";
        const v = byMethod.get(key) ?? { count: 0, cents: 0 };
        v.count += 1;
        v.cents += i.total_cents ?? 0;
        byMethod.set(key, v);
      }
      const undeposited = paidInPeriod.filter((i) => i.payment_deposited === false);

      report.summary = [
        { label: "Received", value: usd(incomeCents), note: `${received.length} ledger entr${received.length === 1 ? "y" : "ies"}` },
        { label: "Against invoices", value: usd(paidInPeriod.reduce((s, i) => s + (i.total_cents ?? 0), 0)), note: `${paidInPeriod.length} collected` },
        { label: "Not yet deposited", value: usd(undeposited.reduce((s, i) => s + (i.total_cents ?? 0), 0)), note: `${undeposited.length} awaiting the bank` },
      ];
      report.sections = [
        {
          title: "By payment method",
          columns: ["Method", "Payments", "Amount"],
          rows: [...byMethod.entries()]
            .sort((a, b) => b[1].cents - a[1].cents)
            .map(([m, v]) => [m, String(v.count), usd(v.cents)]),
          total: ["Total against invoices", String(paidInPeriod.length), usd(paidInPeriod.reduce((s, i) => s + (i.total_cents ?? 0), 0))],
        },
        {
          title: "Every receipt in the period",
          columns: ["Date", "From", "Description", "Category", "Amount"],
          rows: received.map((r) => [
            prettyDate(r.occurred_on ?? r.created_at.slice(0, 10)),
            (r.lot_id && ownerNames.get(r.lot_id)) || "—",
            r.description || "(no description)",
            r.category || "Other",
            usd(r.amount_cents ?? 0),
          ]),
          total: ["Total received", "", "", "", usd(incomeCents)],
        },
      ];
      if (!received.length) report.note = "No money was received in this period.";
    }

    if (input.type === "disbursements") {
      /* The check register: what left the account, in date order, with
         whatever identifies it on a statement. */
      report.summary = [
        { label: "Paid out", value: usd(expenseCents), note: `${expense.length} payment${expense.length === 1 ? "" : "s"}` },
        { label: "Categories", value: String(byCategory(expense).size) },
        { label: "Largest single payment", value: expense.length ? usd(Math.max(...expense.map((r) => r.amount_cents ?? 0))) : "—" },
      ];
      report.sections = [
        categorySection("Spending by category", expense, "Total paid out"),
        {
          title: "Every payment in the period",
          columns: ["Date", "Paid to / for", "Category", "Source", "Amount"],
          rows: expense.map((r) => [
            prettyDate(r.occurred_on ?? r.created_at.slice(0, 10)),
            r.description || "(no description)",
            r.category || "Other",
            r.source === "bank" ? "Bank import" : "Manual",
            usd(r.amount_cents ?? 0),
          ]),
          total: ["Total paid out", "", "", "", usd(expenseCents)],
        },
      ];
      report.caveats = [
        "Vendor bills are not tracked, so this shows money that has left the account — not what is owed and unpaid.",
      ];
      if (!expense.length) report.note = "Nothing was paid out in this period.";
    }

    if (input.type === "revenue-by-entity") {
      /* The reason the two companies exist as separate rows in the first
         place: each files its own return, so each needs its own income and
         its own receivable. */
      const keys = [...entities.map((e) => e.key), null];
      const rowsFor = (key: string | null) => ({
        income: income.filter((r) => (r.entity_key ?? null) === key),
        expense: expense.filter((r) => (r.entity_key ?? null) === key),
        owed: owed.filter((i) => (i.entity_key ?? null) === key),
      });

      const unassignedIncome = income.filter((r) => !r.entity_key);
      report.summary = [
        ...entities.map((e) => {
          const v = rowsFor(e.key);
          return {
            label: e.name,
            value: usd(v.income.reduce((s, r) => s + (r.amount_cents ?? 0), 0)),
            note: `${usd(v.owed.reduce((s, i) => s + (i.total_cents ?? 0), 0))} still receivable`,
          };
        }),
        {
          label: "Unassigned",
          value: usd(unassignedIncome.reduce((s, r) => s + (r.amount_cents ?? 0), 0)),
          note: unassignedIncome.length ? "In neither company's books" : "Nothing unassigned",
        },
      ];
      report.sections = [
        {
          title: "Income and expense by company",
          columns: ["Company", "Income", "Expenses", "Net", "Receivable"],
          rows: keys.map((key) => {
            const v = rowsFor(key);
            const inC = v.income.reduce((s, r) => s + (r.amount_cents ?? 0), 0);
            const outC = v.expense.reduce((s, r) => s + (r.amount_cents ?? 0), 0);
            const n = inC - outC;
            return [
              entityName(key),
              usd(inC),
              usd(outC),
              `${n < 0 ? "−" : ""}${usd(Math.abs(n))}`,
              usd(v.owed.reduce((s, i) => s + (i.total_cents ?? 0), 0)),
            ];
          }),
          total: ["All companies", usd(incomeCents), usd(expenseCents), netLabel, usd(owed.reduce((s, i) => s + (i.total_cents ?? 0), 0))],
        },
        {
          title: "Income detail by company",
          columns: ["Date", "Company", "Description", "Category", "Amount"],
          rows: income.map((r) => [
            prettyDate(r.occurred_on ?? r.created_at.slice(0, 10)),
            entityName(r.entity_key ?? null),
            r.description || "(no description)",
            r.category || "Other",
            usd(r.amount_cents ?? 0),
          ]),
          total: ["Total income", "", "", "", usd(incomeCents)],
        },
      ];
      if (unassignedIncome.length) {
        report.caveats = [
          `${unassignedIncome.length} income entr${unassignedIncome.length === 1 ? "y is" : "ies are"} assigned to no company and appear in neither return. Assign the fee behind them on the fee schedule.`,
        ];
      }
      if (!income.length && !expense.length) report.note = "No ledger activity in this period.";
    }

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
