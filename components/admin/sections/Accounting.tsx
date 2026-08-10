"use client";

import React, { useMemo, useState } from "react";
import { AGING, BUDGET } from "@/lib/admin-portal/fixtures";
import {
  addFee, addLedgerEntry, connectBankAccount, deleteLedgerEntry,
  disconnectBankAccount, getBankLinkToken, setFeeActive, syncBankNow, updateFee,
} from "@/lib/admin-portal/accounting-actions";
import {
  createInvoice, recordInvoicePayment, sendInvoice, updateInvoice, voidInvoice,
} from "@/lib/admin-portal/invoice-actions";
import { CARD_FEE_RATE, DELINQ_STEPS, PAY_METHODS } from "@/lib/admin-portal/actions";
import { openPlaidLink } from "@/lib/admin-portal/plaid-link";
import { buildReport } from "@/lib/admin-portal/report-actions";
import { buildActionMenu, useSearchFilter, useStore } from "@/lib/admin-portal/store";
import { color, font, pad, radius } from "@/lib/admin-portal/tokens";
import type {
  BankAccount, Fee, Invoice, LedgerEntry, PendingConfirm, ReportData, ReportType,
} from "@/lib/admin-portal/types";
import {
  ActionSelect, AddDrawer, Card, CardHead, Chip, ConfirmBar, DateInput, Empty, ErrorLine, Field, FieldGrid, FilterBar, HomePicker, Input, Mono, PageTitle, Primary, Row, RowMain, Select, Status, TextButton, Tile, Tiles,
} from "../ui";

const INCOME_CATEGORIES = [
  "HOA fees", "Late fees", "Amenity income", "Interest income", "Other income",
];
const EXPENSE_CATEGORIES = [
  "Landscaping", "Utilities", "Insurance", "Repairs & maintenance", "Management",
  "Legal & professional", "Office & admin", "Reserves", "Other expense",
];

const usd = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Sub-navigation inside Accounting — one surface per job, less scrolling. */
const ACCOUNTING_TABS = [
  { id: "overview", label: "Overview" },
  { id: "ledger", label: "General ledger" },
  { id: "invoices", label: "Invoices" },
  { id: "reports", label: "Reports" },
  { id: "fees", label: "Fee schedule" },
  { id: "bank", label: "Bank accounts" },
] as const;
type AccountingTab = (typeof ACCOUNTING_TABS)[number]["id"];

export default function Accounting() {
  const s = useStore();
  /* Anything still wanting the office's attention: a draft waiting to be
     issued, or an issued invoice waiting to be collected. A paid or void one
     is finished with. */
  const outstandingCount = s.invoices.filter(
    (i) => i.status === "draft" || i.status === "sent",
  ).length;

  /* ----- take a payment (collapsed at the top; product rule 1) ----- */
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<{ receipt: string; detail: string } | null>(null);
  const [resent, setResent] = useState(false);

  const [query, setQuery] = useState("");
  const [account, setAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [applyTo, setApplyTo] = useState("Oldest balance first");
  const [method, setMethod] = useState<string>("card");
  const [card, setCard] = useState({ number: "", expiry: "", cvv: "", zip: "" });
  const [ref, setRef] = useState({ number: "", received: "" });
  const [flags, setFlags] = useState({ authorized: false, recorded: false, emailReceipt: true });
  const [error, setError] = useState("");

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || account) return [];
    return s.owners
      .filter((o) => `${o.name} ${o.address} ${o.contact} ${o.account}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [query, account, s.owners]);

  const picked = s.owners.find((o) => o.name === account);
  const amt = parseFloat(amount.replace(/[^0-9.]/g, "")) || 0;
  const fee = method === "card" ? Math.round(amt * CARD_FEE_RATE * 100) / 100 : 0;

  const reset = () => {
    setAmount(""); setCard({ number: "", expiry: "", cvv: "", zip: "" });
    setRef({ number: "", received: "" }); setAccount(""); setQuery(""); setError("");
  };

  function process() {
    if (!account) return setError("Pick the account this payment belongs to.");
    if (!amt) return setError("Enter an amount.");
    if (method === "card" && (!card.number.trim() || !card.expiry.trim() || !card.cvv.trim()))
      return setError("Card number, expiry and CVV are required.");
    if (method === "card" && !flags.authorized)
      return setError("Mark the owner's verbal authorization before charging a card.");
    if ((method === "check" || method === "money") && !ref.number.trim())
      return setError("Add the check or money order number.");

    const label = PAY_METHODS.find((m) => m.id === method)?.label ?? "";
    const last4 = card.number.replace(/[^0-9]/g, "").slice(-4);
    const short = `${account.split(" ")[0].charAt(0)}. ${account.split(" ").slice(1).join(" ")}`;

    s.setPayments((prev) => [
      { id: s.uid("p"), date: s.stamp().split(",")[0], amount: `$${amt.toFixed(2)}`,
        label: `${short} · ${label.toLowerCase()}${last4 ? ` ····${last4}` : ""}${ref.number.trim() ? ` · ref ${ref.number.trim()}` : ""}` },
      ...prev,
    ]);
    s.setDelinquents((prev) => prev
      .map((d) => {
        if (d.owner !== short) return d;
        const remaining = Math.max(0, (parseFloat(d.balance.replace(/[^0-9.]/g, "")) || 0) - amt);
        return { ...d, balance: `$${remaining.toFixed(2)}`, stage: remaining === 0 ? "Paid in full" : d.stage };
      })
      .filter((d) => d.balance !== "$0.00"));

    setDone({
      receipt: `$${(amt + fee).toFixed(2)} from ${account}`,
      detail: `${label}${last4 ? ` ····${last4}` : ""}${ref.number.trim() ? ` · ref ${ref.number.trim()}` : ""} · applied to ${applyTo.toLowerCase()} · posted by ${s.currentUser.split(" · ")[0]} at ${s.stamp()}${flags.emailReceipt ? " · receipt emailed" : " · no receipt sent"}`,
    });
    setResent(false);
    setError("");
    s.audit(`Posted $${amt.toFixed(2)} for ${account} (${label})`);
  }

  /* ----- delinquency ladder ----- */
  const [pending, setPending] = useState<PendingConfirm | null>(null);

  /* ----- sub-navigation ----- */
  const [tab, setTab] = useState<AccountingTab>("overview");

  return (
    <>
      <PageTitle title="Accounting" lede={`Receivables, the general ledger and bank activity for ${s.scopeLabel}.`} />

      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", borderBottom: `1px solid ${color.hairline}` }}>
        {ACCOUNTING_TABS.map((t) => (
          <button key={t.id} type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
            style={{
              font: "inherit", fontSize: 15, fontWeight: 500, cursor: "pointer",
              background: "none", border: "none", padding: "10px 14px 12px",
              color: tab === t.id ? color.ink : color.inkTertiary,
              boxShadow: tab === t.id ? `inset 0 -2px 0 ${color.accent}` : "none",
              whiteSpace: "nowrap",
            }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
              {t.label}
              {/* Only invoices carry a count, and only when something is
                  actually waiting — a badge reading zero is noise. */}
              {t.id === "invoices" && outstandingCount > 0 ? (
                <span aria-label={`${outstandingCount} outstanding`}
                  style={{
                    display: "inline-grid", placeItems: "center",
                    minWidth: 19, height: 19, padding: "0 6px",
                    borderRadius: 999, background: "oklch(0.62 0.22 25)",
                    color: "oklch(0.99 0.01 25)",
                    fontFamily: font.mono, fontSize: 11, fontWeight: 600,
                    lineHeight: 1,
                  }}>
                  {outstandingCount}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>

      {tab === "overview" ? (
      <>
      <LedgerTiles />

      <Card>
        <CardHead title="Take a payment" meta={`Phone, walk-in or mailed check · posted by ${s.currentUser.split(" · ")[0]}`} />
        <div style={{ padding: 24 }}>
          {done ? (
            <div style={{ display: "grid", gap: 16, maxWidth: 640 }}>
              <Mono size={11} style={{ letterSpacing: "0.12em", textTransform: "uppercase", color: color.neutral }}>Payment posted</Mono>
              <p style={{ fontSize: 24, fontWeight: 600, letterSpacing: "-0.02em" }}>{done.receipt}</p>
              <p style={{ fontSize: 15, lineHeight: 1.6, color: color.inkSecondary }}>{done.detail}</p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <TextButton onClick={() => { setDone(null); reset(); setOpen(true); }}>Take another payment</TextButton>
                <TextButton onClick={() => setResent(true)}>Email receipt again</TextButton>
              </div>
              {resent ? <p style={{ fontSize: 14, color: color.accent }}>Receipt re-sent to the owner&rsquo;s email on file.</p> : null}
            </div>
          ) : !open ? (
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
              <Primary onClick={() => setOpen(true)}>Add a payment</Primary>
              <span style={{ fontSize: 14, color: color.inkTertiary }}>
                Card, ACH, check, money order or cash — over the phone or at the counter.
              </span>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 18, maxWidth: 780 }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>New payment</span>
                <TextButton tone="muted" onClick={() => { setOpen(false); reset(); }}>Cancel</TextButton>
              </div>

              <FieldGrid>
                <div style={{ position: "relative" }}>
                  <Field label="Owner or account">
                    <Input value={query} placeholder="Start typing a name, address or account no."
                      onChange={(v) => { setQuery(v); setAccount(""); setError(""); }} />
                  </Field>
                  {matches.length > 0 ? (
                    <div style={{
                      position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                      background: color.surface, border: `1px solid ${color.borderInput}`,
                      borderRadius: 12, boxShadow: "0 14px 36px oklch(0.4 0.02 150 / 0.12)",
                      padding: 6, zIndex: 20, display: "grid", gap: 2, maxHeight: 260, overflowY: "auto",
                    }}>
                      {matches.map((o) => (
                        <button key={o.id} type="button"
                          onClick={() => { setAccount(o.name); setQuery(o.name); setError(""); }}
                          style={{ textAlign: "left", width: "100%", background: "none", border: "none", borderRadius: 8, padding: "10px 12px", font: "inherit", cursor: "pointer", color: "inherit" }}>
                          <span style={{ display: "block", fontSize: 15, fontWeight: 500 }}>{o.name}</span>
                          <span style={{ display: "block", fontSize: 13, color: color.inkQuaternary, marginTop: 2 }}>
                            {o.address} · {o.balance !== "$0.00" ? `${o.balance} due` : "current"} · {o.status}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  {!account && query.trim() && matches.length === 0 ? (
                    <p style={{ marginTop: 8, fontSize: 14, color: color.inkTertiary }}>
                      No owner matches that. Check the spelling or search by lot number.
                    </p>
                  ) : null}
                  {picked ? (
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 8, background: color.accentTint, border: `1px solid ${color.accentTintBorder}`, borderRadius: radius.md, padding: "10px 12px" }}>
                      <span style={{ fontSize: 14, color: "oklch(0.3 0.02 150)" }}>
                        {picked.name} · {picked.address} · {picked.balance !== "$0.00" ? `${picked.balance} due` : "current"}
                      </span>
                      <TextButton onClick={() => { setAccount(""); setQuery(""); }}>Change</TextButton>
                    </span>
                  ) : null}
                </div>
                <Field label="Amount"><Input value={amount} onChange={setAmount} placeholder="$0.00" /></Field>
                <Field label="Apply to">
                  <Select value={applyTo} onChange={setApplyTo} options={[
                    { id: "Oldest balance first", label: "Oldest balance first" },
                    { id: "Current HOA fee", label: "Current HOA fee" },
                    { id: "Late fees", label: "Late fees" },
                    { id: "Legal fees & costs", label: "Legal fees & costs" },
                    { id: "Special assessment", label: "Special assessment" },
                  ]} />
                </Field>
              </FieldGrid>

              {s.fees.some((f) => f.active) ? (
                <div style={{ display: "grid", gap: 10 }}>
                  <span style={{ fontSize: 14, color: color.inkSecondary }}>
                    Fee schedule — tap to fill the amount
                  </span>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {s.fees.filter((f) => f.active).map((f) => (
                      <Chip key={f.id} size="sm" on={amount === f.amount}
                        onClick={() => { setAmount(f.amount); setError(""); }}>
                        {f.name} · {f.amount}
                      </Chip>
                    ))}
                  </div>
                </div>
              ) : null}

              <div style={{ display: "grid", gap: 10 }}>
                <span style={{ fontSize: 14, color: color.inkSecondary }}>Method</span>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {PAY_METHODS.map((m) => (
                    <Chip key={m.id} on={method === m.id} onClick={() => { setMethod(m.id); setError(""); }}>{m.label}</Chip>
                  ))}
                </div>
              </div>

              {method === "card" ? (
                <FieldGrid>
                  <Field label="Card number"><Input value={card.number} onChange={(v) => setCard({ ...card, number: v })} placeholder="•••• •••• •••• ••••" /></Field>
                  <Field label="Expiry"><Input value={card.expiry} onChange={(v) => setCard({ ...card, expiry: v })} placeholder="MM / YY" /></Field>
                  <Field label="CVV"><Input value={card.cvv} onChange={(v) => setCard({ ...card, cvv: v })} placeholder="•••" /></Field>
                  <Field label="Billing ZIP"><Input value={card.zip} onChange={(v) => setCard({ ...card, zip: v })} placeholder="77493" /></Field>
                </FieldGrid>
              ) : null}

              {method === "check" || method === "money" || method === "cash" ? (
                <FieldGrid>
                  <Field label="Check or reference no."><Input value={ref.number} onChange={(v) => setRef({ ...ref, number: v })} placeholder="e.g. 2841" /></Field>
                  <Field label="Received on"><DateInput value={ref.received} onChange={(v) => setRef({ ...ref, received: v })} /></Field>
                </FieldGrid>
              ) : null}

              <div style={{ background: color.surfaceMuted, border: `1px solid ${color.hairlineSoft}`, borderRadius: radius.lg, padding: 18, display: "grid", gap: 8 }}>
                {[
                  ["Payment", `$${amt.toFixed(2)}`],
                  [method === "card" ? "Processor fee (2.95%)" : "Processor fee", `$${fee.toFixed(2)}`],
                ].map(([l, v]) => (
                  <span key={l} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 15 }}>
                    <span style={{ color: color.inkSecondary }}>{l}</span>
                    <Mono size={14}>{v}</Mono>
                  </span>
                ))}
                <span style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 16, fontWeight: 600, borderTop: `1px solid ${color.hairlineSoft}`, paddingTop: 8 }}>
                  <span>Total charged</span>
                  <Mono size={15}>{`$${(amt + fee).toFixed(2)}`}</Mono>
                </span>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                <span style={{ fontSize: 14, color: color.inkSecondary }}>Authorization &amp; receipt</span>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <Chip on={flags.authorized} onClick={() => setFlags({ ...flags, authorized: !flags.authorized })}>Owner authorized by phone</Chip>
                  <Chip on={flags.recorded} onClick={() => setFlags({ ...flags, recorded: !flags.recorded })}>Call recorded</Chip>
                  <Chip on={flags.emailReceipt} onClick={() => setFlags({ ...flags, emailReceipt: !flags.emailReceipt })}>Email receipt</Chip>
                </div>
                <span style={{ fontSize: 13, lineHeight: 1.6, color: color.inkQuaternary }}>
                  {method === "card"
                    ? "Card-not-present payments need the owner's verbal authorization on the call. It's stamped with your name and the time."
                    : "Log who handed over the check or cash and when it was received."}
                </span>
              </div>

              {error ? <ErrorLine>{error}</ErrorLine> : null}
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                <Primary onClick={process}>{method === "card" ? `Charge $${(amt + fee).toFixed(2)}` : "Post payment"}</Primary>
                <span style={{ fontSize: 13, color: color.inkQuaternary }}>
                  Card details are never stored — the processor returns a token and the last four.
                </span>
              </div>
            </div>
          )}
        </div>
      </Card>

      <Tiles min={180}>
        {AGING.map((a) => <Tile key={a.label} label={a.label} value={a.amount} />)}
      </Tiles>

      <Card>
        <CardHead title="Delinquent accounts" meta="Collection ladder follows the recorded policy" />
        {s.delinquents.length === 0 ? (
          <Empty>No delinquent accounts. When an owner falls behind, the collection ladder starts here.</Empty>
        ) : null}
        {s.delinquents.map((d) => {
          const menu = buildActionMenu(DELINQ_STEPS, d.stage, d.id, `${d.owner} · ${d.address}`, pending, setPending);
          return (
            <React.Fragment key={d.id}>
              <Row>
                <RowMain label={d.owner} detail={d.address} />
                <Mono size={15}>{d.balance}</Mono>
                <Status tone={d.stage.startsWith("90") || d.stage === "Lien filed" ? "critical" : "attention"}>{d.stage}</Status>
                <ActionSelect options={menu.options} onChoose={menu.onChoose} />
              </Row>
              {menu.confirming ? (
                <ConfirmBar text={menu.confirmText} confirmLabel={menu.confirmLabel}
                  onCancel={menu.cancel}
                  onConfirm={() => {
                    const next = menu.nextValue!;
                    s.setDelinquents((prev) => prev.map((x) => x.id === d.id ? { ...x, stage: next } : x));
                    setPending(null);
                    s.audit(`${next} — ${d.owner} (${d.balance})`);
                  }} />
              ) : null}
            </React.Fragment>
          );
        })}
      </Card>

      <Card>
        <CardHead title="Recent payments" />
        {s.payments.length === 0 ? (
          <Empty>No payments recorded yet.</Empty>
        ) : s.payments.slice(0, 8).map((p) => (
          <Row key={p.id}>
            <Mono size={13} style={{ color: color.neutral }}>{p.date}</Mono>
            <span style={{ fontSize: 15 }}>{p.label}</span>
            <Mono size={14}>{p.amount}</Mono>
          </Row>
        ))}
      </Card>

      {BUDGET.length > 0 ? (
        <Card>
          <CardHead title="Budget vs actual · YTD" />
          {BUDGET.map((b) => (
            <Row key={b.label}>
              <span style={{ fontSize: 15, fontWeight: 500 }}>{b.label}</span>
              <Mono size={14} style={{ color: color.inkTertiary }}>{b.budget}</Mono>
              <Mono size={14}>{b.actual}</Mono>
              <span style={{ fontSize: 14, color: color.inkTertiary }}>{b.note}</span>
            </Row>
          ))}
        </Card>
      ) : null}
      </>
      ) : null}

      {tab === "ledger" ? (
        <>
          <LedgerTiles />
          <LedgerCard />
        </>
      ) : null}
      {tab === "invoices" ? <InvoicesCard /> : null}
      {tab === "reports" ? <ReportsCard /> : null}
      {tab === "fees" ? <FeeCard /> : null}
      {tab === "bank" ? <BankCard /> : null}
    </>
  );
}

/* ═══ Invoices ═════════════════════════════════════════════════════════ */

const INVOICE_FILTERS = ["All", "Draft", "Issued", "Overdue", "Paid", "Void"];

function InvoicesCard() {
  const s = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [drawer, setDrawer] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");

  const [home, setHome] = useState<{ id: string; label: string } | null>(null);
  const [dueOn, setDueOn] = useState("");
  const [memo, setMemo] = useState("");
  const [lines, setLines] = useState([{ description: "", amount: "", quantity: "1" }]);

  const [openId, setOpenId] = useState<string | null>(null);
  const [collecting, setCollecting] = useState<string | null>(null);
  const [paidOn, setPaidOn] = useState("");
  const [method, setMethod] = useState("Bank transfer");
  const [payMemo, setPayMemo] = useState("");
  const [reference, setReference] = useState("");
  const [bank, setBank] = useState("");
  const [attaching, setAttaching] = useState(false);
  const [attached, setAttached] = useState<string[]>([]);

  async function attach(invoiceId: string, file: File) {
    setAttaching(true);
    setError("");
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("invoiceId", invoiceId);
      const res = await fetch("/api/invoices/attachment", { method: "POST", body: form });
      const data = (await res.json()) as { ok?: boolean; error?: string; fileName?: string };
      if (!res.ok || !data.ok) return setError(data.error ?? "The file could not be attached.");
      setAttached((prev) => [...prev, data.fileName ?? file.name]);
    } catch {
      setError("The file could not be attached. Check the connection and try again.");
    } finally {
      setAttaching(false);
    }
  }
  const [voiding, setVoiding] = useState<string | null>(null);
  const [voidReason, setVoidReason] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [eDue, setEDue] = useState("");
  const [eMemo, setEMemo] = useState("");
  const [eLines, setELines] = useState([{ description: "", amount: "", quantity: "1" }]);

  function openEdit(inv: Invoice) {
    if (editing === inv.id) { setEditing(null); return; }
    setEditing(inv.id);
    setError("");
    setEDue(inv.dueOn ?? "");
    setEMemo(inv.memo);
    setELines(
      inv.lines.length
        ? inv.lines.map((l) => ({
            description: l.description,
            quantity: String(l.quantity),
            amount: (l.amountCents / 100 / Math.max(1, l.quantity)).toFixed(2),
          }))
        : [{ description: "", amount: "", quantity: "1" }],
    );
  }

  async function saveEdit(inv: Invoice) {
    if (saving) return;
    setSaving(true);
    setError("");
    const res = await updateInvoice({
      id: inv.id, dueOn: eDue, memo: eMemo,
      lines: eLines,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    s.setInvoices(res.invoices);
    s.audit(`Invoices: edited ${inv.number}`);
    setEditing(null);
  }

  const visible = useSearchFilter(
    s.invoices, query, ["number", "billTo", "address", "total"],
    (i) => {
      if (filter === "All") return true;
      if (filter === "Draft") return i.status === "draft";
      if (filter === "Issued") return i.status === "sent";
      if (filter === "Overdue") return i.overdue;
      if (filter === "Paid") return i.status === "paid";
      return i.status === "void";
    },
  );

  const owing = s.invoices.filter((i) => i.status === "sent");
  const owedCents = owing.reduce((t, i) => t + i.totalCents, 0);
  const overdueCount = s.invoices.filter((i) => i.overdue).length;

  function setLine(idx: number, patch: Partial<{ description: string; amount: string; quantity: string }>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError("");
    setNote("");
    const res = await createInvoice({ lotId: home?.id ?? "", dueOn, memo, lines });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    s.setInvoices(res.invoices);
    s.audit(`Invoices: drafted ${res.number}`);
    setNote(`${res.number} drafted. Issue it when you are ready to bill.`);
    setLines([{ description: "", amount: "", quantity: "1" }]);
    setMemo(""); setDueOn(""); setHome(null);
    setDrawer(false);
  }

  async function issue(id: string, number: string) {
    setError("");
    const res = await sendInvoice(id);
    if (!res.ok) return setError(res.error);
    s.setInvoices(res.invoices);
    s.audit(`Invoices: issued ${number}`);
  }

  async function collect(id: string, number: string) {
    setError("");
    const res = await recordInvoicePayment({
      id, paidOn, method, memo: payMemo, reference, bank,
    });
    if (!res.ok) return setError(res.error);
    setCollecting(null);
    s.setInvoices(res.invoices);
    s.audit(`Invoices: collected ${number}`);
    setPaidOn(""); setPayMemo(""); setReference(""); setBank(""); setAttached([]);
  }

  async function discard(id: string, number: string) {
    setError("");
    const res = await voidInvoice({ id, reason: voidReason });
    if (!res.ok) return setError(res.error);
    s.setInvoices(res.invoices);
    s.audit(`Invoices: voided ${number}`);
    setVoiding(null);
    setVoidReason("");
  }

  return (
    <>
      <Tiles min={200}>
        <Tile label="Outstanding" value={usd(owedCents)}
          note={owing.length ? `${owing.length} invoice${owing.length === 1 ? "" : "s"} issued and unpaid` : "Nothing outstanding"} />
        <Tile label="Overdue" value={String(overdueCount)}
          note={overdueCount ? "Past the due date" : "None past due"} />
        <Tile label="Invoices" value={String(s.invoices.length)} note="Drafted, issued, collected and void" />
      </Tiles>

      <Card>
        <CardHead title="Invoices"
          meta="Bill a household, then record the payment when it arrives — nothing reaches the ledger until the money does" />

        <AddDrawer open={drawer}
          onOpen={() => { setDrawer(true); setError(""); setNote(""); }}
          onCancel={() => { setDrawer(false); setError(""); }}
          openLabel="New invoice" title="New invoice">
          <FieldGrid>
            <HomePicker
              label="Bill to"
              hint="Search by owner name, address or account number"
              value={home}
              onChange={setHome}
              homes={s.owners.map((o) => ({
                id: o.id, name: o.name, address: o.address, account: o.account,
              }))} />
            <Field label="Due date"><DateInput value={dueOn} onChange={setDueOn} /></Field>
          </FieldGrid>

          <div style={{ display: "grid", gap: 10 }}>
            <span style={{ fontSize: 14, color: color.inkSecondary }}>Lines</span>
            {s.fees.filter((f) => f.active).length > 0 ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {s.fees.filter((f) => f.active).map((f) => (
                  <Chip key={f.id} size="sm" on={false}
                    onClick={() => setLines((prev) => {
                      const next = [...prev];
                      const blank = next.findIndex((l) => !l.description && !l.amount);
                      const line = { description: f.name, amount: f.amount.replace(/[^0-9.]/g, ""), quantity: "1" };
                      if (blank >= 0) next[blank] = line; else next.push(line);
                      return next;
                    })}>
                    {f.name} · {f.amount}
                  </Chip>
                ))}
              </div>
            ) : null}

            {lines.map((l, i) => (
              <div key={i} style={{ display: "grid", gap: 8 }}>
                <FieldGrid>
                  <Field label={i === 0 ? "Description" : ""}>
                    <Input value={l.description} onChange={(v) => setLine(i, { description: v })} placeholder="e.g. Q3 HOA fee" />
                  </Field>
                  <Field label={i === 0 ? "Quantity" : ""}>
                    <Input value={l.quantity} onChange={(v) => setLine(i, { quantity: v })} placeholder="1" />
                  </Field>
                  <Field label={i === 0 ? "Amount each" : ""}>
                    <Input value={l.amount} onChange={(v) => setLine(i, { amount: v })} placeholder="e.g. 375.00" />
                  </Field>
                </FieldGrid>
                {/* The last line stays: an invoice with nothing on it cannot
                    be billed, so removing it would only need adding back. */}
                {lines.length > 1 ? (
                  <TextButton tone="destructive"
                    onClick={() => setLines((prev) => prev.filter((_, x) => x !== i))}>
                    Remove this line
                  </TextButton>
                ) : null}
              </div>
            ))}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
              <TextButton onClick={() => setLines((prev) => [...prev, { description: "", amount: "", quantity: "1" }])}>
                Add another line
              </TextButton>
              <Mono size={14}>
                Total {usd(lines.reduce((t, l) => {
                  const cents = Math.round((parseFloat(l.amount.replace(/[^0-9.]/g, "")) || 0) * 100);
                  return t + cents * (Math.max(1, parseInt(l.quantity, 10) || 1));
                }, 0))}
              </Mono>
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <Field label="Memo" hint="Appears on the invoice">
              <Input value={memo} onChange={setMemo} placeholder="Optional" />
            </Field>
            {/* Whatever gets written here comes back as a one-tap choice on
                the next invoice, so the same phrases are never retyped. */}
            {s.invoiceMemos.length > 0 ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {s.invoiceMemos.map((m) => (
                  <Chip key={m} size="sm" on={memo.trim() === m}
                    onClick={() => setMemo(memo.trim() === m ? "" : m)}>
                    {m}
                  </Chip>
                ))}
              </div>
            ) : null}
          </div>

          {error ? <ErrorLine>{error}</ErrorLine> : null}
          <Primary onClick={save} style={{ justifySelf: "start", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save as draft"}
          </Primary>
        </AddDrawer>

        <FilterBar query={query} onQuery={setQuery} placeholder="Search number, household or address…"
          filters={INVOICE_FILTERS} active={filter} onFilter={setFilter} />

        {note ? <div style={{ padding: `12px ${pad.card}`, fontSize: 14, color: color.accent }}>{note}</div> : null}
        {error && !drawer ? <div style={{ padding: `12px ${pad.card}` }}><ErrorLine>{error}</ErrorLine></div> : null}

        {visible.length === 0 ? (
          <Empty>
            {s.invoices.length === 0
              ? "No invoices yet. Bill a household and it appears here, then in the ledger once it is collected."
              : "No invoices match that."}
          </Empty>
        ) : visible.map((inv) => (
          <React.Fragment key={inv.id}>
            <Row>
              <Mono size={13} style={{ color: color.neutral }}>{inv.number}</Mono>
              <RowMain label={inv.billTo} detail={inv.address} />
              <span>
                <span style={{ display: "block", fontSize: 14, color: color.inkSecondary }}>Due {inv.due}</span>
                <Mono size={11} style={{ color: color.inkQuaternary }}>Issued {inv.issued}</Mono>
              </span>
              <Mono size={15}>{inv.total}</Mono>
              <Status tone={
                inv.status === "paid" ? "positive"
                  : inv.overdue ? "critical"
                    : inv.status === "sent" ? "attention"
                      : "neutral"
              }>
                {inv.status === "void" ? "Void"
                  : inv.status === "paid" ? "Paid"
                    : inv.overdue ? "Overdue"
                      : inv.status === "sent" ? "Issued" : "Draft"}
              </Status>
              <span style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <TextButton onClick={() => setOpenId(openId === inv.id ? null : inv.id)}>
                  {openId === inv.id ? "Close" : "View"}
                </TextButton>
                {inv.status === "draft" || inv.status === "sent" ? (
                  <TextButton onClick={() => openEdit(inv)}>
                    {editing === inv.id ? "Close" : "Edit"}
                  </TextButton>
                ) : null}
                {inv.status === "draft" ? (
                  <TextButton onClick={() => issue(inv.id, inv.number)}>Issue…</TextButton>
                ) : null}
                {inv.status === "sent" ? (
                  <TextButton onClick={() => { setCollecting(inv.id); setPaidOn(todayISO()); }}>Record payment…</TextButton>
                ) : null}
                {inv.status === "draft" || inv.status === "sent" ? (
                  <TextButton tone="destructive" onClick={() => { setVoiding(inv.id); setVoidReason(""); }}>Void…</TextButton>
                ) : null}
              </span>
            </Row>

            {openId === inv.id ? (
              <div style={{ padding: `0 ${pad.card} 18px` }}>
                <div style={{ background: color.surfaceSunken, border: `1px solid ${color.hairline}`, borderRadius: radius.lg, padding: 18, display: "grid", gap: 10 }}>
                  {inv.lines.map((l) => (
                    <div key={l.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, fontSize: 14 }}>
                      <span style={{ color: color.inkSecondary }}>
                        {l.description}{l.quantity > 1 ? ` × ${l.quantity}` : ""}
                      </span>
                      <Mono size={13}>{l.amount}</Mono>
                    </div>
                  ))}
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, borderTop: `1px solid ${color.hairlineSoft}`, paddingTop: 10, fontWeight: 600 }}>
                    <span>Total</span><Mono size={14}>{inv.total}</Mono>
                  </div>
                  {inv.memo ? <span style={{ fontSize: 13.5, color: color.inkTertiary }}>{inv.memo}</span> : null}
                  <Mono size={12} style={{ color: color.inkQuaternary }}>
                    Raised by {inv.createdBy} · issued {inv.issued}
                  </Mono>
                  {inv.paidOn ? <span style={{ fontSize: 13.5, color: color.positive }}>Collected {inv.paidOn}.</span> : null}
                  {inv.voidReason ? <span style={{ fontSize: 13.5, color: color.inkTertiary }}>Voided — {inv.voidReason}</span> : null}
                </div>
              </div>
            ) : null}

            {editing === inv.id ? (
              <div style={{ padding: `0 ${pad.card} 18px` }}>
                <div style={{ background: color.surfaceSunken, border: `1px solid ${color.accentTintBorder}`, borderRadius: radius.lg, padding: 18, display: "grid", gap: 14 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Edit {inv.number}</span>

                  <FieldGrid>
                    <Field label="Due date"><DateInput value={eDue} onChange={setEDue} /></Field>
                    <Field label="Memo"><Input value={eMemo} onChange={setEMemo} placeholder="Optional" /></Field>
                  </FieldGrid>

                  <div style={{ display: "grid", gap: 10 }}>
                      <span style={{ fontSize: 14, color: color.inkSecondary }}>Lines</span>
                      {eLines.map((l, i) => (
                        <div key={i} style={{ display: "grid", gap: 8 }}>
                          <FieldGrid>
                            <Field label={i === 0 ? "Description" : ""}>
                              <Input value={l.description} onChange={(v) => setELines((prev) => prev.map((x, n) => n === i ? { ...x, description: v } : x))} />
                            </Field>
                            <Field label={i === 0 ? "Quantity" : ""}>
                              <Input value={l.quantity} onChange={(v) => setELines((prev) => prev.map((x, n) => n === i ? { ...x, quantity: v } : x))} />
                            </Field>
                            <Field label={i === 0 ? "Amount each" : ""}>
                              <Input value={l.amount} onChange={(v) => setELines((prev) => prev.map((x, n) => n === i ? { ...x, amount: v } : x))} />
                            </Field>
                          </FieldGrid>
                          {eLines.length > 1 ? (
                            <TextButton tone="destructive" onClick={() => setELines((prev) => prev.filter((_, n) => n !== i))}>
                              Remove this line
                            </TextButton>
                          ) : null}
                        </div>
                      ))}
                      <TextButton onClick={() => setELines((prev) => [...prev, { description: "", amount: "", quantity: "1" }])}>
                        Add another line
                      </TextButton>
                    </div>

                  {inv.status === "sent" ? (
                    <span style={{ fontSize: 13, lineHeight: 1.6, color: color.attention }}>
                      {inv.number} has already been issued. Changing what it bills is
                      recorded in the audit trail with the old and new figures — if a
                      notice went out at {inv.total}, send the household the corrected one.
                    </span>
                  ) : null}

                  <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                    <Primary onClick={() => saveEdit(inv)} style={{ justifySelf: "start", opacity: saving ? 0.6 : 1 }}>
                      {saving ? "Saving…" : "Save changes"}
                    </Primary>
                    <TextButton tone="muted" onClick={() => setEditing(null)}>Cancel</TextButton>
                  </div>
                </div>
              </div>
            ) : null}

            {collecting === inv.id ? (
              <div style={{ padding: `0 ${pad.card} 18px` }}>
                <div style={{ background: color.surfaceSunken, border: `1px solid ${color.accentTintBorder}`, borderRadius: radius.lg, padding: 18, display: "grid", gap: 14 }}>
                  <span style={{ fontSize: 15, fontWeight: 600 }}>Record payment for {inv.number}</span>
                  <FieldGrid>
                    <Field label="Date received"><DateInput value={paidOn} onChange={setPaidOn} /></Field>
                    <Field label="How it came in">
                      <Select value={method} onChange={setMethod} options={[
                        { id: "Bank transfer", label: "Bank transfer" },
                        { id: "Card", label: "Card" },
                        { id: "Check", label: "Check" },
                        { id: "Cash", label: "Cash" },
                        { id: "Escrow", label: "Escrow / title company" },
                      ]} />
                    </Field>
                  </FieldGrid>

                  {/* A check has to be traceable back to a statement, so its
                      number is required and the bank is worth having. */}
                  {method === "Check" ? (
                    <FieldGrid>
                      <Field label="Check number" hint="Required — it is what ties this to a statement">
                        <Input value={reference} onChange={setReference} placeholder="e.g. 1042" mono />
                      </Field>
                      <Field label="Drawn on" hint="The bank on the check">
                        <Input value={bank} onChange={setBank} placeholder="e.g. Frost Bank" />
                      </Field>
                    </FieldGrid>
                  ) : method === "Cash" ? null : (
                    <Field label="Reference" hint="Wire reference, transaction id or escrow file number">
                      <Input value={reference} onChange={setReference} placeholder="Optional" mono />
                    </Field>
                  )}

                  <div style={{ display: "grid", gap: 8 }}>
                    <Field label="Memo" hint="Anything worth remembering about this payment">
                      <Input value={payMemo} onChange={setPayMemo} placeholder="Optional" />
                    </Field>
                    {s.invoiceMemos.length > 0 ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {s.invoiceMemos.map((m) => (
                          <Chip key={m} size="sm" on={payMemo.trim() === m}
                            onClick={() => setPayMemo(payMemo.trim() === m ? "" : m)}>
                            {m}
                          </Chip>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div style={{ display: "grid", gap: 6, justifyItems: "start" }}>
                    <label style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      font: "inherit", fontSize: 13, fontWeight: 500,
                      background: color.surface, border: `1px solid ${color.borderInput}`,
                      borderRadius: 999, padding: "7px 15px",
                      cursor: attaching ? "default" : "pointer", opacity: attaching ? 0.6 : 1,
                    }}>
                      {attaching ? "Attaching…" : "Attach proof of payment"}
                      <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                        disabled={attaching}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (file) attach(inv.id, file);
                        }}
                        style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0 }} />
                    </label>
                    <span style={{ fontSize: 11.5, lineHeight: 1.5, color: color.inkQuaternary }}>
                      A photographed check or receipt · image or PDF, up to 10 MB · office only
                    </span>
                    {attached.length > 0 ? (
                      <Mono size={12} style={{ color: color.positive }}>
                        Attached: {attached.join(", ")}
                      </Mono>
                    ) : null}
                  </div>
                  <span style={{ fontSize: 13, color: color.inkQuaternary }}>
                    {inv.total} posts to the ledger against {inv.billTo} and settles this invoice.
                  </span>
                  <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
                    <Primary onClick={() => collect(inv.id, inv.number)} style={{ justifySelf: "start" }}>
                      Record {inv.total} received
                    </Primary>
                    <TextButton tone="muted" onClick={() => setCollecting(null)}>Cancel</TextButton>
                  </div>
                </div>
              </div>
            ) : null}

            {voiding === inv.id ? (
              <div style={{ padding: `0 ${pad.card} 18px` }}>
                <div style={{ background: color.surfaceSunken, border: `1px solid ${color.accentTintBorder}`, borderRadius: radius.lg, padding: 18, display: "grid", gap: 14 }}>
                  <Field label={`Why is ${inv.number} being voided?`} hint="Stays on the record — an invoice is never deleted">
                    <Input value={voidReason} onChange={setVoidReason} placeholder="e.g. billed to the wrong home" />
                  </Field>
                  <ConfirmBar
                    text={inv.status === "sent"
                      ? `Void ${inv.number}? The ${inv.total} charge is reversed with an opposing entry, so the ledger still shows it happened and was undone.`
                      : `Void ${inv.number}? It was never issued, so nothing is reversed — it stays on the record as void.`}
                    confirmLabel="Yes, void it"
                    onCancel={() => setVoiding(null)}
                    onConfirm={() => discard(inv.id, inv.number)} />
                </div>
              </div>
            ) : null}
          </React.Fragment>
        ))}
      </Card>
    </>
  );
}

/* ═══ General ledger ═══════════════════════════════════════════════════ */

function LedgerTiles() {
  const s = useStore();
  const year = String(new Date().getFullYear());

  const { incomeCents, expenseCents } = useMemo(() => {
    let income = 0, expense = 0;
    for (const e of s.ledger) {
      if (!e.date.startsWith(year)) continue;
      if (e.kind === "income") income += e.amountCents;
      else if (e.kind === "expense") expense += e.amountCents;
    }
    return { incomeCents: income, expenseCents: expense };
  }, [s.ledger, year]);

  const net = incomeCents - expenseCents;
  const active = s.bankAccounts.filter((b) => b.status === "active");
  const withBalance = active.filter((b) => b.balanceCents != null);
  const bankCents = withBalance.reduce((sum, b) => sum + (b.balanceCents ?? 0), 0);

  return (
    <Tiles min={180}>
      <Tile label={`Income · ${year}`} value={usd(incomeCents)} />
      <Tile label={`Expenses · ${year}`} value={usd(expenseCents)} />
      <Tile label={`Net · ${year}`} value={`${net < 0 ? "−" : ""}${usd(Math.abs(net))}`}
        note={net < 0 ? "Spending ahead of income" : undefined} />
      <Tile label="In the bank" value={withBalance.length ? usd(bankCents) : "—"}
        note={active.length
          ? `${active.length} linked account${active.length === 1 ? "" : "s"}`
          : "No bank account linked"} />
    </Tiles>
  );
}

const LEDGER_FILTERS = ["All", "Income", "Expenses", "Bank imported", "Manual"];

function LedgerCard() {
  const s = useStore();

  const [drawer, setDrawer] = useState(false);
  const [date, setDate] = useState(todayISO());
  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [ownerQuery, setOwnerQuery] = useState("");
  const [ownerPick, setOwnerPick] = useState<{ id: string; label: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");

  const ownerMatches = useMemo(() => {
    const q = ownerQuery.trim().toLowerCase();
    if (!q || ownerPick) return [];
    return s.owners
      .filter((o) => `${o.name} ${o.address} ${o.account}`.toLowerCase().includes(q))
      .slice(0, 6);
  }, [ownerQuery, ownerPick, s.owners]);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const categories = kind === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  const byFilter = useMemo(() => (e: LedgerEntry) => {
    if (filter === "Income") return e.kind === "income";
    if (filter === "Expenses") return e.kind === "expense";
    if (filter === "Bank imported") return e.source === "bank";
    if (filter === "Manual") return e.source === "manual";
    return true;
  }, [filter]);

  const filtered = useSearchFilter(
    s.ledger, query,
    ["description", "category", "account", "amount", "dateLabel"],
    byFilter,
  );

  async function save() {
    if (saving) return;
    setError("");
    setSaving(true);
    const res = await addLedgerEntry({
      date, kind, category, description: desc, amount,
      lotId: kind === "income" ? (ownerPick?.id ?? null) : null,
    });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    s.setLedger(res.ledger);
    s.setBankAccounts(res.bankAccounts);
    s.audit(`Ledger: recorded ${kind} (${category})${ownerPick ? ` for ${ownerPick.label}` : ""} — ${desc.trim()}`);
    setNote(`Recorded ${kind === "income" ? "income" : "an expense"} — ${desc.trim()}.`);
    setDesc(""); setAmount(""); setDate(todayISO());
    setOwnerQuery(""); setOwnerPick(null);
    setDrawer(false);
  }

  async function remove(e: LedgerEntry) {
    const res = await deleteLedgerEntry(e.id);
    setConfirmDelete(null);
    if (!res.ok) return setError(res.error);
    s.setLedger(res.ledger);
    s.audit(`Ledger: deleted ${e.amount} ${e.kind} — ${e.description}`);
    setNote(`Deleted ${e.amount} ${e.kind} — ${e.description}.`);
  }

  return (
    <Card>
      <CardHead title="General ledger"
        meta={`${s.ledger.length} entr${s.ledger.length === 1 ? "y" : "ies"} · manual and bank-imported`} />

      <AddDrawer open={drawer} onOpen={() => { setDrawer(true); setNote(""); setError(""); }}
        onCancel={() => { setDrawer(false); setError(""); }}
        openLabel="Add an entry"
        title="New ledger entry"
        note="Record income or an expense — bank imports land here automatically.">
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Chip on={kind === "expense"} onClick={() => { setKind("expense"); setCategory(EXPENSE_CATEGORIES[0]); }}>Expense</Chip>
            <Chip on={kind === "income"} onClick={() => { setKind("income"); setCategory(INCOME_CATEGORIES[0]); }}>Income</Chip>
          </div>
          {s.fees.some((f) => f.active) ? (
            <div style={{ display: "grid", gap: 10 }}>
              <span style={{ fontSize: 14, color: color.inkSecondary }}>
                Fee schedule — tap to fill the entry
              </span>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {s.fees.filter((f) => f.active).map((f) => (
                  <Chip key={f.id} size="sm" on={desc === f.name && amount === f.amount}
                    onClick={() => {
                      setKind("income");
                      setCategory(f.category);
                      setDesc(f.name);
                      setAmount(f.amount);
                      setError("");
                    }}>
                    {f.name} · {f.amount}
                  </Chip>
                ))}
              </div>
            </div>
          ) : null}
          <FieldGrid>
            <Field label="Date"><DateInput value={date} onChange={setDate} /></Field>
            <Field label="Category">
              <Select value={category} onChange={setCategory}
                options={categories.map((c) => ({ id: c, label: c }))} />
            </Field>
            <Field label="Amount"><Input value={amount} onChange={setAmount} placeholder="$0.00" /></Field>
          </FieldGrid>
          <Field label="Description">
            <Input value={desc} onChange={setDesc}
              placeholder={kind === "income" ? "e.g. Clubhouse rental — Sofi Lakes" : "e.g. April mowing — front entrances"} />
          </Field>
          {kind === "income" ? (
            <div style={{ position: "relative", maxWidth: 420 }}>
              <Field label="Resident it came from (optional)">
                <Input value={ownerQuery}
                  placeholder="Start typing a name, address or lot no."
                  onChange={(v) => { setOwnerQuery(v); setOwnerPick(null); }} />
              </Field>
              {ownerMatches.length > 0 ? (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                  background: color.surface, border: `1px solid ${color.borderInput}`,
                  borderRadius: 12, boxShadow: "0 14px 36px oklch(0.4 0.02 150 / 0.12)",
                  padding: 6, zIndex: 20, display: "grid", gap: 2, maxHeight: 260, overflowY: "auto",
                }}>
                  {ownerMatches.map((o) => (
                    <button key={o.id} type="button"
                      onClick={() => {
                        setOwnerPick({ id: o.id, label: `${o.name} · ${o.account}` });
                        setOwnerQuery(`${o.name} · ${o.account}`);
                      }}
                      style={{ textAlign: "left", width: "100%", background: "none", border: "none", borderRadius: 8, padding: "10px 12px", font: "inherit", cursor: "pointer", color: "inherit" }}>
                      <span style={{ display: "block", fontSize: 15, fontWeight: 500 }}>{o.name}</span>
                      <span style={{ display: "block", fontSize: 13, color: color.inkQuaternary, marginTop: 2 }}>
                        {o.address} · {o.account}
                      </span>
                    </button>
                  ))}
                </div>
              ) : null}
              {ownerPick ? (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 8, background: color.accentTint, border: `1px solid ${color.accentTintBorder}`, borderRadius: radius.md, padding: "10px 12px" }}>
                  <span style={{ fontSize: 14, color: "oklch(0.3 0.02 150)" }}>
                    Linked to {ownerPick.label}
                  </span>
                  <TextButton onClick={() => { setOwnerPick(null); setOwnerQuery(""); }}>Unlink</TextButton>
                </span>
              ) : null}
            </div>
          ) : null}
          {error ? <ErrorLine>{error}</ErrorLine> : null}
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
            <Primary onClick={save}>
              {saving ? "Saving…" : kind === "income" ? "Record income" : "Record expense"}
            </Primary>
            <span style={{ fontSize: 13, color: color.inkQuaternary }}>
              Saved to the books and stamped in the audit trail as {s.currentUser.split(" · ")[0]}.
            </span>
          </div>
        </div>
      </AddDrawer>

      <FilterBar query={query} onQuery={setQuery}
        placeholder="Search the ledger — description, category, amount or account"
        filters={LEDGER_FILTERS} active={filter} onFilter={setFilter} />

      {note && !drawer ? (
        <div style={{ padding: "12px 24px", borderBottom: `1px solid ${color.hairlineSoft}`, fontSize: 14, color: color.accent }}>{note}</div>
      ) : null}
      {error && !drawer ? (
        <div style={{ padding: "12px 24px", borderBottom: `1px solid ${color.hairlineSoft}` }}><ErrorLine>{error}</ErrorLine></div>
      ) : null}

      {filtered.length === 0 ? (
        <Empty>
          {s.ledger.length === 0
            ? "The ledger is empty. Record the first entry above, or connect a bank account and let transactions import themselves."
            : "Nothing matches that search."}
        </Empty>
      ) : filtered.slice(0, 100).map((e) => (
        <React.Fragment key={e.id}>
          <Row>
            <Mono size={13} style={{ color: color.neutral }}>{e.dateLabel}</Mono>
            <RowMain label={e.description}
              detail={`${e.category}${e.account ? ` · ${e.account}` : " · Manual entry"}`} />
            {e.ownerName ? (
              <TextButton onClick={() => { s.setFocusOwnerId(e.ownerId); s.setView("owners"); }}>
                {e.ownerName}
              </TextButton>
            ) : (
              <span style={{ fontSize: 14, color: color.inkQuaternary }}>—</span>
            )}
            <Status tone={e.kind === "income" ? "positive" : "neutral"}>
              {e.kind === "income" ? "Income" : "Expense"}{e.pending ? " · pending" : ""}
            </Status>
            <Mono size={15} style={{ color: e.kind === "income" ? color.positive : color.ink }}>
              {e.kind === "income" ? "+" : "−"}{e.amount}
            </Mono>
            <TextButton tone="destructive" onClick={() => setConfirmDelete(e.id)}>Delete…</TextButton>
          </Row>
          {confirmDelete === e.id ? (
            <ConfirmBar
              text={`Delete the ${e.amount} ${e.kind} “${e.description}” from the ledger? The removal is recorded in the audit trail.`}
              confirmLabel="Delete entry"
              onCancel={() => setConfirmDelete(null)}
              onConfirm={() => remove(e)} />
          ) : null}
        </React.Fragment>
      ))}
      {filtered.length > 100 ? (
        <Empty>Showing the first 100 of {filtered.length} matches — narrow the search to see the rest.</Empty>
      ) : null}
    </Card>
  );
}

/* ═══ Financial reports ════════════════════════════════════════════════ */

const REPORT_TYPES: { id: ReportType; label: string; blurb: string }[] = [
  { id: "income-statement", label: "Income statement", blurb: "Income and expenses by category, with the net." },
  { id: "general-ledger", label: "General ledger", blurb: "Every transaction in the period, oldest first." },
  { id: "cash-bank", label: "Cash & bank", blurb: "Linked accounts, balances and imported activity." },
  { id: "owner-charges", label: "Owner charges", blurb: "What was collected from each resident." },
];

const PERIODS = [
  { id: "30", label: "Last 30 days" },
  { id: "45", label: "Last 45 days" },
  { id: "60", label: "Last 60 days" },
  { id: "90", label: "Last 90 days" },
  { id: "ytd", label: "Year to date" },
  { id: "custom", label: "Custom range" },
];

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replaceAll('"', '""')}"` : v;
}

function reportToCsv(r: ReportData): string {
  const lines: string[] = [
    csvCell(r.title),
    csvCell(r.community),
    csvCell(`Period: ${r.periodLabel}`),
    csvCell(`Generated ${r.generatedAt} by ${r.generatedBy}`),
    "",
    ...r.summary.map((s) => [csvCell(s.label), csvCell(s.value)].join(",")),
  ];
  for (const sec of r.sections) {
    lines.push("", csvCell(sec.title), sec.columns.map(csvCell).join(","));
    for (const row of sec.rows) lines.push(row.map(csvCell).join(","));
    if (sec.total) lines.push(sec.total.map(csvCell).join(","));
  }
  return lines.join("\r\n");
}

function downloadCsv(r: ReportData) {
  const blob = new Blob(["﻿" + reportToCsv(r)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `sofi-lakes-${r.type}-${r.start}-to-${r.end}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

const escapeHtml = (v: string) =>
  v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

/** A standalone print document; the browser's print dialog saves it as PDF. */
function printReport(r: ReportData) {
  const amountCol = (sec: { columns: string[] }, i: number) => i === sec.columns.length - 1;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(r.title)} — ${escapeHtml(r.periodLabel)}</title>
<style>
  @page { margin: 18mm; }
  * { box-sizing: border-box; }
  body { font: 14px/1.5 'Instrument Sans', system-ui, sans-serif; color: ${color.ink}; margin: 0; }
  .mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
  header { border-bottom: 2px solid ${color.ink}; padding-bottom: 14px; margin-bottom: 20px; }
  .wordmark { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: ${color.neutral}; }
  h1 { font-size: 24px; margin: 6px 0 4px; letter-spacing: -0.02em; }
  .meta { font-size: 13px; color: ${color.inkTertiary}; }
  .summary { display: flex; gap: 28px; flex-wrap: wrap; margin: 0 0 22px; }
  .summary div { min-width: 120px; }
  .summary .l { font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: ${color.inkTertiary}; }
  .summary .v { font-size: 20px; font-weight: 600; margin-top: 2px; }
  .summary .n { font-size: 12px; color: ${color.inkTertiary}; }
  h2 { font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; color: ${color.neutral}; margin: 24px 0 8px; }
  table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
  th { text-align: left; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: ${color.inkTertiary}; font-weight: 400; padding: 6px 10px 6px 0; border-bottom: 1px solid ${color.ink}; }
  td { font-size: 13px; padding: 7px 10px 7px 0; border-bottom: 1px solid ${color.hairline}; vertical-align: top; }
  .num { text-align: right; font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 12.5px; white-space: nowrap; }
  tr.total td { font-weight: 600; border-top: 2px solid ${color.ink}; border-bottom: none; }
  .note { font-size: 14px; color: ${color.inkTertiary}; margin: 14px 0; }
  footer { margin-top: 28px; padding-top: 10px; border-top: 1px solid ${color.hairline}; font-size: 11px; color: ${color.inkQuaternary}; }
</style></head><body>
<header>
  <div class="wordmark">Unity Grid Management</div>
  <h1>${escapeHtml(r.title)}</h1>
  <div class="meta">${escapeHtml(r.community)} · ${escapeHtml(r.periodLabel)}</div>
</header>
<div class="summary">${r.summary.map((s) => `<div><div class="l">${escapeHtml(s.label)}</div><div class="v">${escapeHtml(s.value)}</div>${s.note ? `<div class="n">${escapeHtml(s.note)}</div>` : ""}</div>`).join("")}</div>
${r.note ? `<p class="note">${escapeHtml(r.note)}</p>` : ""}
${r.sections
  .filter((sec) => sec.rows.length || sec.total)
  .map(
    (sec) => `<h2>${escapeHtml(sec.title)}</h2>
<table><thead><tr>${sec.columns.map((c, i) => `<th${amountCol(sec, i) ? ' class="num"' : ""}>${escapeHtml(c)}</th>`).join("")}</tr></thead>
<tbody>${sec.rows.map((row) => `<tr>${row.map((cell, i) => `<td${amountCol(sec, i) ? ' class="num"' : ""}>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("")}
${sec.total ? `<tr class="total">${sec.total.map((cell, i) => `<td${amountCol(sec, i) ? ' class="num"' : ""}>${escapeHtml(cell)}</td>`).join("")}</tr>` : ""}</tbody></table>`,
  )
  .join("")}
<footer>Generated ${escapeHtml(r.generatedAt)} by ${escapeHtml(r.generatedBy)} · Unity Grid Management admin portal</footer>
<script>window.onload = () => window.print();</script>
</body></html>`;
  const w = window.open("", "_blank", "width=900,height=1100");
  if (!w) return;
  w.document.write(html);
  w.document.close();
}

function ReportsCard() {
  const [type, setType] = useState<ReportType>("income-statement");
  const [period, setPeriod] = useState("30");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState(todayISO());
  const [running, setRunning] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ReportData | null>(null);

  function resolveRange(): { start: string; end: string; label: string } | null {
    const end = todayISO();
    if (period === "custom") {
      if (!customStart || !customEnd) return null;
      return { start: customStart, end: customEnd, label: "custom range" };
    }
    if (period === "ytd") {
      return { start: `${new Date().getFullYear()}-01-01`, end, label: "year to date" };
    }
    const days = Number(period);
    const d = new Date();
    d.setDate(d.getDate() - (days - 1));
    const start = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { start, end, label: `last ${days} days` };
  }

  async function run() {
    if (running) return;
    const range = resolveRange();
    if (!range) return setError("Pick the custom range's start and end dates.");
    setError("");
    setRunning(true);
    const res = await buildReport({ type, start: range.start, end: range.end, periodLabel: range.label });
    setRunning(false);
    if (!res.ok) return setError(res.error);
    setReport(res.report);
  }

  const blurb = REPORT_TYPES.find((t) => t.id === type)?.blurb ?? "";

  return (
    <Card>
      <CardHead title="Financial reports"
        meta="Statement-quality output — print to PDF or export for Excel" />

      <div style={{ padding: "18px 24px", borderBottom: `1px solid ${color.hairlineSoft}`, display: "grid", gap: 14 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {REPORT_TYPES.map((t) => (
            <Chip key={t.id} on={type === t.id} onClick={() => { setType(t.id); setError(""); }}>{t.label}</Chip>
          ))}
        </div>
        <span style={{ fontSize: 14, color: color.inkTertiary }}>{blurb}</span>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {PERIODS.map((p) => (
            <Chip key={p.id} size="sm" on={period === p.id} onClick={() => { setPeriod(p.id); setError(""); }}>{p.label}</Chip>
          ))}
        </div>
        {period === "custom" ? (
          <FieldGrid>
            <Field label="From"><DateInput value={customStart} onChange={setCustomStart} /></Field>
            <Field label="Through"><DateInput value={customEnd} onChange={setCustomEnd} /></Field>
          </FieldGrid>
        ) : null}
        {error ? <ErrorLine>{error}</ErrorLine> : null}
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
          <Primary onClick={run} style={running ? { opacity: 0.6, pointerEvents: "none" } : undefined}>
            {running ? "Building…" : "Run report"}
          </Primary>
          {report ? (
            <>
              <TextButton onClick={() => downloadCsv(report)}>Export for Excel (CSV)</TextButton>
              <TextButton onClick={() => printReport(report)}>Print / save as PDF</TextButton>
            </>
          ) : (
            <span style={{ fontSize: 13, color: color.inkQuaternary }}>
              Numbers come from the live ledger the moment the report runs.
            </span>
          )}
        </div>
      </div>

      {report ? (
        <div style={{ padding: 24, display: "grid", gap: 20 }}>
          <div>
            <Mono size={11} style={{ letterSpacing: "0.12em", textTransform: "uppercase", color: color.neutral }}>
              {report.community}
            </Mono>
            <p style={{ fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em", margin: "6px 0 4px" }}>{report.title}</p>
            <p style={{ margin: 0, fontSize: 14, color: color.inkTertiary }}>
              {report.periodLabel} · generated {report.generatedAt} by {report.generatedBy}
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
            {report.summary.map((t) => (
              <div key={t.label} style={{ background: color.surfaceMuted, border: `1px solid ${color.hairlineSoft}`, borderRadius: radius.lg, padding: 16 }}>
                <Mono size={10} style={{ letterSpacing: "0.12em", textTransform: "uppercase", color: color.inkTertiary }}>{t.label}</Mono>
                <p style={{ margin: "6px 0 2px", fontSize: 22, fontWeight: 600, letterSpacing: "-0.02em" }}>{t.value}</p>
                {t.note ? <p style={{ margin: 0, fontSize: 13, color: color.inkTertiary }}>{t.note}</p> : null}
              </div>
            ))}
          </div>

          {report.note ? <p style={{ margin: 0, fontSize: 15, color: color.inkTertiary }}>{report.note}</p> : null}

          {report.sections.filter((sec) => sec.rows.length || sec.total).map((sec) => (
            <div key={sec.title} style={{ display: "grid", gap: 8 }}>
              <Mono size={11} style={{ letterSpacing: "0.1em", textTransform: "uppercase", color: color.neutral }}>{sec.title}</Mono>
              <div style={{ overflowX: "auto" }}>
                <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 520 }}>
                  <thead>
                    <tr>
                      {sec.columns.map((c, i) => (
                        <th key={c} style={{
                          textAlign: i === sec.columns.length - 1 ? "right" : "left",
                          padding: "8px 12px 8px 0", fontFamily: font.mono, fontSize: 10.5, fontWeight: 400,
                          letterSpacing: "0.1em", textTransform: "uppercase", color: color.inkTertiary,
                          borderBottom: `1px solid ${color.hairline}`, whiteSpace: "nowrap",
                        }}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sec.rows.map((row, ri) => (
                      <tr key={ri}>
                        {row.map((cell, i) => (
                          <td key={i} style={{
                            padding: "9px 12px 9px 0", fontSize: 14,
                            borderBottom: `1px solid ${color.hairlineSoft}`,
                            ...(i === sec.columns.length - 1
                              ? { textAlign: "right" as const, fontFamily: font.mono, fontSize: 13, whiteSpace: "nowrap" as const }
                              : null),
                          }}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                    {sec.total ? (
                      <tr>
                        {sec.total.map((cell, i) => (
                          <td key={i} style={{
                            padding: "10px 12px 4px 0", fontSize: 14, fontWeight: 600,
                            borderTop: `2px solid ${color.ink}`,
                            ...(i === sec.columns.length - 1
                              ? { textAlign: "right" as const, fontFamily: font.mono, fontSize: 13.5, whiteSpace: "nowrap" as const }
                              : null),
                          }}>{cell}</td>
                        ))}
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty>
          Pick a report and a period, then run it. The standard HOA package also carries a balance
          sheet, budget comparison and receivables aging — those switch on once budgets and per-owner
          balances are tracked, rather than showing invented numbers today.
        </Empty>
      )}
    </Card>
  );
}

/* ═══ Fee schedule ═════════════════════════════════════════════════════ */

function FeeCard() {
  const s = useStore();
  // Collapsible via the chevron; open by default now that it has its own tab.
  const [openCard, setOpenCard] = useState(true);
  const [drawer, setDrawer] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(INCOME_CATEGORIES[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [confirmRetire, setConfirmRetire] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [ef, setEf] = useState({ name: "", amount: "", category: INCOME_CATEGORIES[0] });

  function openEdit(f: Fee) {
    if (editId === f.id) { setEditId(null); return; }
    setEditId(f.id);
    setError("");
    setEf({ name: f.name, amount: f.amount.replace(/[^0-9.]/g, ""), category: f.category });
  }

  async function saveEdit(f: Fee) {
    if (saving) return;
    setSaving(true);
    setError("");
    const res = await updateFee({ id: f.id, name: ef.name, amount: ef.amount, category: ef.category });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    s.setFees(res.fees);
    s.audit(`Fee schedule: updated ${f.name}`);
    setEditId(null);
  }

  async function save() {
    if (saving) return;
    setError("");
    setSaving(true);
    const res = await addFee({ name, amount, category });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    s.setFees(res.fees);
    s.audit(`Fee schedule: added ${name.trim()} at ${amount.trim()}`);
    setName(""); setAmount("");
    setDrawer(false);
  }

  async function toggle(f: Fee) {
    const res = await setFeeActive(f.id, !f.active);
    setConfirmRetire(null);
    if (!res.ok) return setError(res.error);
    s.setFees(res.fees);
    s.audit(`Fee schedule: ${f.active ? "retired" : "restored"} ${f.name}`);
  }

  const activeCount = s.fees.filter((f) => f.active).length;

  return (
    <Card>
      <CardHead title="Fee schedule"
        meta={openCard
          ? "The association's named fees — quick-picks on the payment and ledger forms"
          : `${activeCount} active fee${activeCount === 1 ? "" : "s"} on the payment and ledger forms`}>
        <button
          type="button"
          onClick={() => setOpenCard((v) => !v)}
          aria-expanded={openCard}
          aria-label={openCard ? "Collapse the fee schedule" : "Expand the fee schedule"}
          style={{
            background: "none", border: "none", padding: "8px 2px",
            cursor: "pointer", color: "oklch(0.44 0.045 155)",
            display: "inline-flex", alignItems: "center",
          }}
        >
          {/* Chevron matches the nav icons: one stroke weight, currentColor. */}
          <svg
            width={17} height={17} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={1.5}
            strokeLinecap="round" strokeLinejoin="round"
            aria-hidden focusable={false}
            style={{
              transform: openCard ? "rotate(180deg)" : "none",
              transition: "transform 140ms ease",
            }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </CardHead>
      {!openCard ? null : (
      <>
      <AddDrawer open={drawer} onOpen={() => { setDrawer(true); setError(""); }}
        onCancel={() => { setDrawer(false); setError(""); }}
        openLabel="Add a fee"
        title="New fee"
        note="Name it exactly as it should appear on forms and receipts.">
        <div style={{ display: "grid", gap: 16 }}>
          <FieldGrid>
            <Field label="Fee name"><Input value={name} onChange={setName} placeholder="e.g. Transfer fee" /></Field>
            <Field label="Amount"><Input value={amount} onChange={setAmount} placeholder="$0.00" /></Field>
            <Field label="Books to">
              <Select value={category} onChange={setCategory}
                options={INCOME_CATEGORIES.map((c) => ({ id: c, label: c }))} />
            </Field>
          </FieldGrid>
          {error ? <ErrorLine>{error}</ErrorLine> : null}
          <Primary onClick={save} style={{ justifySelf: "start", ...(saving ? { opacity: 0.6, pointerEvents: "none" } : {}) }}>
            {saving ? "Saving…" : "Add to the schedule"}
          </Primary>
        </div>
      </AddDrawer>

      {error && !drawer ? (
        <div style={{ padding: "12px 24px", borderBottom: `1px solid ${color.hairlineSoft}` }}><ErrorLine>{error}</ErrorLine></div>
      ) : null}

      {s.fees.length === 0 ? (
        <Empty>No fees on the schedule yet. Add the HOA fee and the office&rsquo;s other standard charges.</Empty>
      ) : s.fees.map((f) => (
        <React.Fragment key={f.id}>
          <Row>
            <RowMain label={f.name} detail={`Books to ${f.category}`} />
            <Mono size={15}>{f.amount}</Mono>
            <Status tone={f.active ? "positive" : "neutral"}>{f.active ? "Active" : "Retired"}</Status>
            <span style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <TextButton onClick={() => openEdit(f)}>{editId === f.id ? "Close" : "Edit"}</TextButton>
              {f.active ? (
                <TextButton tone="destructive" onClick={() => setConfirmRetire(f.id)}>Retire…</TextButton>
              ) : (
                <TextButton onClick={() => toggle(f)}>Restore</TextButton>
              )}
            </span>
          </Row>

          {editId === f.id ? (
            <div style={{ padding: `0 ${pad.card} 18px` }}>
              <div style={{ background: color.surfaceSunken, border: `1px solid ${color.accentTintBorder}`, borderRadius: radius.lg, padding: 18, display: "grid", gap: 14 }}>
                <FieldGrid>
                  <Field label="Fee name"><Input value={ef.name} onChange={(v) => setEf({ ...ef, name: v })} /></Field>
                  <Field label="Amount"><Input value={ef.amount} onChange={(v) => setEf({ ...ef, amount: v })} placeholder="e.g. 375.00" /></Field>
                  <Field label="Books to">
                    <Select value={ef.category} onChange={(v) => setEf({ ...ef, category: v })}
                      options={INCOME_CATEGORIES.map((c) => ({ id: c, label: c }))} />
                  </Field>
                </FieldGrid>
                <span style={{ fontSize: 13, color: color.inkQuaternary }}>
                  Changes what gets quoted from here on. Amounts already posted to the ledger stay as they were charged.
                </span>
                <Primary onClick={() => saveEdit(f)} style={{ justifySelf: "start", opacity: saving ? 0.6 : 1 }}>
                  {saving ? "Saving\u2026" : "Save fee"}
                </Primary>
              </div>
            </div>
          ) : null}
          {confirmRetire === f.id ? (
            <ConfirmBar
              text={`Retire ${f.name} (${f.amount})? It disappears from the quick-picks; ledger entries that already reference it are untouched.`}
              confirmLabel="Retire fee"
              onCancel={() => setConfirmRetire(null)}
              onConfirm={() => toggle(f)} />
          ) : null}
        </React.Fragment>
      ))}
      </>
      )}
    </Card>
  );
}

/* ═══ Bank accounts & sync ═════════════════════════════════════════════ */

function BankCard() {
  const s = useStore();
  // Collapsible via the chevron; open by default in its own tab.
  const [openCard, setOpenCard] = useState(true);
  const [busy, setBusy] = useState<"connect" | "sync" | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [confirmDisconnect, setConfirmDisconnect] = useState<string | null>(null);

  const active = s.bankAccounts.filter((b) => b.status === "active");

  async function connect() {
    if (busy) return;
    setError(""); setNote("");
    setBusy("connect");
    const res = await getBankLinkToken();
    if (!res.ok) { setBusy(null); return setError(res.error); }
    try {
      await openPlaidLink(res.linkToken, {
        onSuccess: async (publicToken, institutionName) => {
          const done = await connectBankAccount({ publicToken, institutionName });
          setBusy(null);
          if (!done.ok) return setError(done.error);
          s.setLedger(done.ledger);
          s.setBankAccounts(done.bankAccounts);
          s.audit(`Bank sync: connected ${institutionName || "a bank"}`);
          setNote(`Connected ${institutionName || "the bank"} — ${done.imported} transaction${done.imported === 1 ? "" : "s"} imported into the ledger.`);
        },
        onExit: (message) => {
          setBusy(null);
          if (message) setError(message);
        },
      });
    } catch (e) {
      setBusy(null);
      setError(e instanceof Error ? e.message : "Couldn't open Plaid Link.");
    }
  }

  async function sync() {
    if (busy) return;
    setError(""); setNote("");
    setBusy("sync");
    const res = await syncBankNow();
    setBusy(null);
    if (!res.ok) return setError(res.error);
    s.setLedger(res.ledger);
    s.setBankAccounts(res.bankAccounts);
    s.audit(`Bank sync: pulled ${res.imported} transaction${res.imported === 1 ? "" : "s"}`);
    setNote(res.imported
      ? `Synced — ${res.imported} new or updated transaction${res.imported === 1 ? "" : "s"} in the ledger.`
      : "Synced — the books already match the bank.");
  }

  async function disconnect(b: BankAccount) {
    const res = await disconnectBankAccount(b.id);
    setConfirmDisconnect(null);
    if (!res.ok) return setError(res.error);
    s.setLedger(res.ledger);
    s.setBankAccounts(res.bankAccounts);
    s.audit(`Bank sync: disconnected ${b.institution || b.name}${b.mask ? ` ····${b.mask}` : ""}`);
    setNote(`Disconnected ${b.institution || b.name}${b.mask ? ` ····${b.mask}` : ""}. Imported entries stay in the ledger.`);
  }

  return (
    <Card>
      <CardHead title="Bank accounts"
        meta={openCard
          ? "Connected through Plaid · transactions import into the ledger"
          : `${active.length} linked account${active.length === 1 ? "" : "s"} syncing into the ledger`}>
        <button
          type="button"
          onClick={() => setOpenCard((v) => !v)}
          aria-expanded={openCard}
          aria-label={openCard ? "Collapse bank accounts" : "Expand bank accounts"}
          style={{
            background: "none", border: "none", padding: "8px 2px",
            cursor: "pointer", color: "oklch(0.44 0.045 155)",
            display: "inline-flex", alignItems: "center",
          }}
        >
          {/* Chevron matches the nav icons: one stroke weight, currentColor. */}
          <svg
            width={17} height={17} viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth={1.5}
            strokeLinecap="round" strokeLinejoin="round"
            aria-hidden focusable={false}
            style={{
              transform: openCard ? "rotate(180deg)" : "none",
              transition: "transform 140ms ease",
            }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </button>
      </CardHead>
      {!openCard ? null : (
      <>
      <div style={{ padding: "18px 24px", borderBottom: `1px solid ${color.hairlineSoft}`, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
        <Primary onClick={connect} style={{ opacity: busy === "connect" ? 0.7 : 1 }}>
          {busy === "connect" ? "Opening your bank…" : "Connect a bank account"}
        </Primary>
        {active.length ? (
          <TextButton onClick={sync}>{busy === "sync" ? "Syncing…" : "Sync now"}</TextButton>
        ) : null}
        <span style={{ fontSize: 13, color: color.inkQuaternary }}>
          Credentials are entered with your bank through Plaid — they never touch Unity Grid.
        </span>
      </div>

      {note ? (
        <div style={{ padding: "12px 24px", borderBottom: `1px solid ${color.hairlineSoft}`, fontSize: 14, color: color.accent }}>{note}</div>
      ) : null}
      {error ? (
        <div style={{ padding: "12px 24px", borderBottom: `1px solid ${color.hairlineSoft}` }}><ErrorLine>{error}</ErrorLine></div>
      ) : null}

      {s.bankAccounts.length === 0 ? (
        <Empty>
          No bank account linked yet. Connect the association&rsquo;s operating account and every
          transaction lands in the ledger on its own — categorized, deduplicated and stamped.
        </Empty>
      ) : s.bankAccounts.map((b) => (
        <React.Fragment key={b.id}>
          <Row>
            <RowMain label={`${b.institution || b.name}${b.mask ? ` ····${b.mask}` : ""}`}
              detail={`${b.name} · ${b.type}`} />
            <Mono size={15}>{b.balance}</Mono>
            <Mono size={12} style={{ color: color.inkQuaternary }}>
              {b.lastSync === "—" ? "Never synced" : `Synced ${b.lastSync}`}
            </Mono>
            <Status tone={b.status === "active" ? "positive" : "neutral"}>
              {b.status === "active" ? "Active" : "Disconnected"}
            </Status>
            {b.status === "active" ? (
              <TextButton tone="destructive" onClick={() => setConfirmDisconnect(b.id)}>Disconnect…</TextButton>
            ) : <span />}
          </Row>
          {confirmDisconnect === b.id ? (
            <ConfirmBar
              text={`Disconnect ${b.institution || b.name}${b.mask ? ` ····${b.mask}` : ""}? New transactions stop importing; everything already in the ledger stays.`}
              confirmLabel="Disconnect account"
              onCancel={() => setConfirmDisconnect(null)}
              onConfirm={() => disconnect(b)} />
          ) : null}
        </React.Fragment>
      ))}
      </>
      )}
    </Card>
  );
}
