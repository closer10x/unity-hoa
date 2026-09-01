"use client";

import React, { useMemo, useState } from "react";

import { FINE_STEPS } from "@/lib/admin-portal/actions";
import { createFineNotice, discardFineDraft, sendFineNotice, setFineNoticeStatus } from "@/lib/admin-portal/fine-actions";
import { buildActionMenu, useSearchFilter, useStore } from "@/lib/admin-portal/store";
import { color, pad, radius } from "@/lib/admin-portal/tokens";
import type { Address, FineNotice, FineNoticeStatus, PendingConfirm, Violation } from "@/lib/admin-portal/types";
import { type ExhibitPhoto, printFineNotice, usd } from "../fine-letter";
import {
  ActionSelect, AddDrawer, Area, Card, CardHead, ConfirmBar, DateInput, Empty, ErrorLine,
  Eyebrow, Field, FieldGrid, FilterBar, HomePicker, Input, MailingAddress, Mono, Pill,
  Primary, Scroller, Select, TableHead, TableRow, TextButton,
} from "../ui";

/**
 * Fine notices — the letter the office sends, and the bill behind it.
 *
 * It sits under Violations because a fine is a rung on the notice ladder, not
 * a separate errand: the composer is seeded from the case file it was opened
 * from, and recording the notice as sent writes back to that case's mailing
 * record. The alternative — a standalone screen — meant retyping the address,
 * the inspector and the inspection date that the case already knew, which is
 * how a letter ends up quoting the wrong lot.
 *
 * Money is the invoice's job. Drafting bills nobody; recording the notice as
 * sent raises and issues the invoice, so the balance the owner sees matches
 * the letter in their hand. Nothing here carries its own paid flag.
 */

const LEVELS = ["1st notice", "2nd notice", "3rd notice", "Final notice"];

const DELIVERY = [
  "Certified mail", "Certified mail + return receipt", "First-class mail",
  "Email", "Email and certified mail", "Hand delivered", "Posted on the lot",
];

const FREQUENCIES = ["", "daily", "twice weekly", "weekly", "at all times"];

const FILTERS = ["All", "Drafted", "Sent", "Unpaid", "Cured", "Escalated", "Waived"];

const FINE_COLS = "132px minmax(220px, 2fr) 150px minmax(250px, auto)";

/** The office's own remittance details, offered as the default on the letter. */
const REMIT_DEFAULT = "7880 Morrison Road, Katy, Texas 77493";

const todayISO = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const addDays = (iso: string, n: number) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + n);
  return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

const blankAddress = (): Address => ({
  streetNo: "", street: "", unit: "", city: "Katy", state: "Texas", zip: "77493",
});

const flatten = (a: Address) =>
  [
    [a.streetNo, a.street, a.unit].filter(Boolean).join(" "),
    [a.city, [a.state, a.zip].filter(Boolean).join(" ")].filter(Boolean).join(", "),
  ].filter(Boolean).join("\n");

/** What the case file already knows, so the composer does not ask for it again. */
export type FineSeed = {
  violationId?: string;
  /** Free text off the violation row — matched against the roster, not trusted. */
  address?: string;
  violationType?: string;
  inspector?: string;
  observed?: string;
};

type ItemDraft = { key: string; feeId: string; description: string; observedOn: string; amount: string };

let itemSeq = 0;
const blankItem = (): ItemDraft => ({
  key: `fi${itemSeq++}`, feeId: "", description: "", observedOn: todayISO(), amount: "",
});

/* ═══ the composer ═══════════════════════════════════════════════════ */

export function FineComposer({
  seed, onSaved, onCancel,
}: {
  seed?: FineSeed;
  onSaved: (notice: FineNotice) => void;
  onCancel: () => void;
}) {
  const s = useStore();

  /* Fine amounts come from the posted schedule, never from a constant in the
     bundle: an amount a builder can argue with is one nobody can point at a
     board resolution for. The office edits them in Accounting → Fee schedule. */
  const fineFees = useMemo(
    () => s.fees.filter((f) => f.active && f.category === "Fines"),
    [s.fees],
  );

  /* The roster is the address of record. A violation row carries the address
     as it was typed; matching it back to a lot is what lets the fine be
     billed at all, so it is a suggestion the office confirms, not a guess
     the form acts on silently. */
  const seededHome = useMemo(() => {
    const typed = (seed?.address ?? "").trim().toLowerCase();
    if (!typed) return null;
    const hits = s.owners.filter((o) =>
      o.address.split("\n")[0].trim().toLowerCase() === typed,
    );
    return hits.length === 1 ? hits[0] : null;
  }, [seed?.address, s.owners]);

  const [home, setHome] = useState<{ id: string; label: string } | null>(
    seededHome ? { id: seededHome.id, label: `${seededHome.account} · ${seededHome.name}` } : null,
  );
  const picked = s.owners.find((o) => o.id === home?.id) ?? null;
  const pickedAddress = picked?.address.split("\n")[0] ?? "";
  const bookEntry = s.addressBook.find(
    (a) => `${a.streetNo} ${a.street}`.trim().toLowerCase() === pickedAddress.trim().toLowerCase(),
  );

  /* How far up the ladder this lot already is. Counted from notices that
     still stand — a waived fine is one the association took back, and making
     the next letter a "3rd notice" on the strength of it overstates the
     history the recipient can be held to. */
  const priorCount = useMemo(() => {
    const at = (pickedAddress || seed?.address || "").trim().toLowerCase();
    if (!at) return 0;
    return s.fineNotices.filter(
      (n) => n.address.trim().toLowerCase() === at && n.status !== "Waived",
    ).length;
  }, [pickedAddress, seed?.address, s.fineNotices]);

  const [recipient, setRecipient] = useState(
    seededHome && seededHome.name !== "Unassigned lot" ? seededHome.name : "",
  );
  const [email, setEmail] = useState("");
  const [sameAddress, setSameAddress] = useState(true);
  const [mailing, setMailing] = useState<Address>(blankAddress);

  /* A repeat offender is escalated by the count, not by whoever remembers.
     The office can still overrule it — and once it has, a later change of
     home stops overwriting the choice they made. */
  const suggestedLevel = LEVELS[Math.min(priorCount, LEVELS.length - 1)];
  const [level, setLevel] = useState(suggestedLevel);
  const [levelChosen, setLevelChosen] = useState(false);
  React.useEffect(() => {
    if (!levelChosen) setLevel(suggestedLevel);
  }, [suggestedLevel, levelChosen]);
  const [noticeDate, setNoticeDate] = useState(todayISO());
  const [delivery, setDelivery] = useState(DELIVERY[0]);
  const [inspectionDate, setInspectionDate] = useState(todayISO());
  const [inspector, setInspector] = useState(seed?.inspector ?? "");

  const [items, setItems] = useState<ItemDraft[]>(() => [blankItem()]);

  const [observed, setObserved] = useState(seed?.observed ?? "");
  const [section, setSection] = useState("");
  const [frequency, setFrequency] = useState("");

  const [cureDays, setCureDays] = useState("10");
  const [cureDate, setCureDate] = useState(addDays(todayISO(), 10));
  const [continuing, setContinuing] = useState("");
  const [continuingUnit, setContinuingUnit] = useState("day");
  const [adminFee, setAdminFee] = useState("");
  const [payDays, setPayDays] = useState("30");
  const [disputeDays, setDisputeDays] = useState("15");

  const [remitTo, setRemitTo] = useState(REMIT_DEFAULT);
  const [payLink, setPayLink] = useState("");
  const [copiesTo, setCopiesTo] = useState("Board of Directors, File");

  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  /* The letter quotes both the window and the date it lands on. Keeping them
     in step here means the office changes one number, not two, and the letter
     cannot go out saying "within 10 days" above a date three weeks out. */
  function setWindow(days: string) {
    setCureDays(days);
    const n = parseInt(days, 10);
    if (Number.isFinite(n) && n > 0) setCureDate(addDays(noticeDate, n));
  }
  function setLetterDate(iso: string) {
    setNoticeDate(iso);
    const n = parseInt(cureDays, 10);
    if (Number.isFinite(n) && n > 0) setCureDate(addDays(iso, n));
  }

  function patchItem(key: string, next: Partial<ItemDraft>) {
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, ...next } : i)));
  }

  function applyFee(key: string, feeId: string) {
    const fee = fineFees.find((f) => f.id === feeId);
    if (!fee) return patchItem(key, { feeId: "" });
    patchItem(key, {
      feeId,
      description: fee.name,
      amount: (fee.amountCents / 100).toFixed(2),
    });
  }

  const totalCents = items.reduce((sum, i) => {
    const n = Number(i.amount.replace(/[$,]/g, ""));
    return sum + (Number.isFinite(n) ? Math.round(n * 100) : 0);
  }, 0);

  async function save() {
    if (saving) return;
    if (!picked) return setError("Pick the home this fine is against — a fine that is not billed to a home is not billed.");
    setError("");
    setSaving(true);
    const res = await createFineNotice({
      violationId: seed?.violationId ?? "",
      lotId: picked.id,
      // The lot says which community it is in; the violation row does not.
      community: picked.scope ?? "",
      address: pickedAddress,
      lotNumber: bookEntry?.unit ?? "",
      block: bookEntry?.block ?? "",
      recipient: recipient.trim() || picked.name,
      recipientEmail: email,
      recipientAddress: sameAddress ? picked.address : flatten(mailing),
      delivery,
      level,
      noticeDate,
      inspectionDate,
      inspector,
      cureDate,
      observed,
      section,
      frequency,
      continuing,
      continuingUnit,
      adminFeePct: adminFee,
      payDays,
      disputeDays,
      remitTo,
      payLink,
      copiesTo,
      items: items.map((i) => ({
        description: i.description,
        observedOn: i.observedOn,
        level,
        amount: i.amount,
      })),
    });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    s.setFineNotices(res.notices);
    s.audit(`Fines: drafted ${res.notice.reference} for ${res.notice.address}`);
    onSaved(res.notice);
  }

  return (
    <div style={{ display: "grid", gap: 22 }}>
      <div style={{ display: "grid", gap: 14 }}>
        <Eyebrow>Who it goes to</Eyebrow>
        <HomePicker
          label="Fine this home"
          hint={
            seededHome
              ? "Matched from the violation's address — change it if the fine belongs elsewhere"
              : "Search by owner name, address or account number. The fine is billed to this home."
          }
          value={home}
          onChange={(v) => {
            setHome(v);
            const next = v ? s.owners.find((o) => o.id === v.id) : null;
            if (next && !recipient.trim() && next.name !== "Unassigned lot") setRecipient(next.name);
          }}
          homes={s.owners.map((o) => ({ id: o.id, name: o.name, address: o.address, account: o.account }))}
        />
        <FieldGrid>
          <Field
            label="Addressed to"
            hint="The owner of record, or the builder if the lot is still under construction"
          >
            <Input value={recipient} onChange={setRecipient} placeholder={picked?.name ?? "Name on the letter"} />
          </Field>
          <Field label="Email"><Input value={email} onChange={setEmail} placeholder="Optional — printed on the letter" /></Field>
        </FieldGrid>
        <MailingAddress
          same={sameAddress}
          onToggle={() => setSameAddress((v) => !v)}
          value={mailing}
          onChange={setMailing}
          propertyPreview={pickedAddress}
        />
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <Eyebrow>The notice</Eyebrow>
        <FieldGrid>
          <Field
            label="Which notice"
            hint={
              priorCount === 0
                ? "No fine notices on this address yet"
                : `${priorCount} notice${priorCount === 1 ? "" : "s"} already stand against this address`
            }
          >
            <Select
              value={level}
              onChange={(v) => { setLevel(v); setLevelChosen(true); }}
              options={LEVELS.map((l) => ({ id: l, label: l }))}
            />
          </Field>
          <Field label="Date on the letter"><DateInput value={noticeDate} onChange={setLetterDate} /></Field>
          <Field label="Delivered by">
            <Select value={delivery} onChange={setDelivery} options={DELIVERY.map((d) => ({ id: d, label: d }))} />
          </Field>
        </FieldGrid>
        <FieldGrid>
          <Field label="Inspected on"><DateInput value={inspectionDate} onChange={setInspectionDate} /></Field>
          <Field label="Inspected by">
            <Select
              value={inspector} onChange={setInspector} placeholder="Select the inspector…"
              options={s.staff.filter((p) => p.active).map((p) => ({ id: p.name, label: p.name }))}
            />
          </Field>
        </FieldGrid>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <Eyebrow>What is being fined</Eyebrow>
        {fineFees.length === 0 ? (
          <span style={{ fontSize: 13.5, color: color.attention, lineHeight: 1.55 }}>
            Nothing on the posted fine schedule yet. Amounts can be typed here, but a fine
            the board has not posted an amount for is one a recipient can argue with — add
            them under Accounting &rarr; Fee schedule, category &ldquo;Fines&rdquo;.
          </span>
        ) : null}

        {items.map((item) => (
          <div key={item.key} style={{
            border: `1px solid ${color.hairlineSoft}`, borderRadius: radius.md,
            padding: 14, display: "grid", gap: 12, background: color.surfaceSunken,
          }}>
            {fineFees.length > 0 ? (
              <Field label="From the posted schedule">
                <Select
                  value={item.feeId}
                  onChange={(v) => applyFee(item.key, v)}
                  placeholder="Pick a posted fine, or write your own below…"
                  options={fineFees.map((f) => ({ id: f.id, label: `${f.name} — ${f.amount}` }))}
                />
              </Field>
            ) : null}
            <Field label="As it reads on the letter">
              <Input
                value={item.description}
                onChange={(v) => patchItem(item.key, { description: v, feeId: "" })}
                placeholder="e.g. Trash and construction debris not contained on the lot"
              />
            </Field>
            <FieldGrid>
              <Field label="Observed on"><DateInput value={item.observedOn} onChange={(v) => patchItem(item.key, { observedOn: v })} /></Field>
              <Field label="Fine">
                <Input value={item.amount} onChange={(v) => patchItem(item.key, { amount: v, feeId: "" })} placeholder="$0.00" />
              </Field>
            </FieldGrid>
            {items.length > 1 ? (
              <TextButton tone="destructive" onClick={() => setItems((prev) => prev.filter((x) => x.key !== item.key))}>
                Remove this violation
              </TextButton>
            ) : null}
          </div>
        ))}

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <Pill onClick={() => setItems((prev) => [...prev, blankItem()])}>Add another violation</Pill>
          <Mono size={13} style={{ marginLeft: "auto", color: color.ink, fontWeight: 500 }}>
            Total on this notice {usd(totalCents)}
          </Mono>
        </div>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <Eyebrow>What was observed</Eyebrow>
        <Field label="In the letter's words">
          <Area
            value={observed} onChange={setObserved}
            placeholder="Loose construction debris left uncontained on the lot and blown onto the roadway; no covered receptacle on site."
          />
        </Field>
        <FieldGrid>
          <Field
            label="Governing section"
            hint="What makes the fine enforceable — the letter says so plainly if this is left blank"
          >
            <Input value={section} onChange={setSection} placeholder="e.g. Section 6.4 of the CC&amp;Rs" />
          </Field>
          <Field label="Required frequency" hint="Only if the section sets one">
            <Select
              value={frequency} onChange={setFrequency}
              options={FREQUENCIES.map((f) => ({ id: f, label: f || "Not applicable" }))}
            />
          </Field>
        </FieldGrid>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <Eyebrow>Deadline and escalation</Eyebrow>
        <FieldGrid>
          <Field label="Days to correct"><Input value={cureDays} onChange={setWindow} placeholder="10" /></Field>
          <Field label="Correct by"><DateInput value={cureDate} onChange={setCureDate} /></Field>
        </FieldGrid>
        <FieldGrid>
          <Field
            label="Continuing fine"
            hint="Only if the governing documents authorise one — left blank, the letter does not claim it"
          >
            <Input value={continuing} onChange={setContinuing} placeholder="$0.00" />
          </Field>
          <Field label="Charged per">
            <Select
              value={continuingUnit} onChange={setContinuingUnit}
              options={["day", "week", "occurrence"].map((u) => ({ id: u, label: u }))}
            />
          </Field>
          <Field label="Administrative fee %" hint="Added when the association has to clean up itself">
            <Input value={adminFee} onChange={setAdminFee} placeholder="e.g. 15" />
          </Field>
        </FieldGrid>
        <FieldGrid>
          <Field label="Days to pay"><Input value={payDays} onChange={setPayDays} placeholder="30" /></Field>
          <Field label="Days to dispute"><Input value={disputeDays} onChange={setDisputeDays} placeholder="15" /></Field>
        </FieldGrid>
      </div>

      <div style={{ display: "grid", gap: 14 }}>
        <Eyebrow>Payment and copies</Eyebrow>
        <FieldGrid>
          <Field label="Remit to"><Input value={remitTo} onChange={setRemitTo} /></Field>
          <Field label="Online payment link"><Input value={payLink} onChange={setPayLink} placeholder="Optional" /></Field>
          <Field label="Copies to"><Input value={copiesTo} onChange={setCopiesTo} /></Field>
        </FieldGrid>
      </div>

      {error ? <ErrorLine>{error}</ErrorLine> : null}

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
        <Primary onClick={save} style={saving ? { opacity: 0.6, pointerEvents: "none" } : undefined}>
          {saving ? "Saving…" : "Save the draft"}
        </Primary>
        <TextButton tone="muted" onClick={onCancel}>Cancel</TextButton>
        <span style={{ fontSize: 13.5, color: color.inkTertiary, flex: "1 1 260px", lineHeight: 1.55 }}>
          Saving writes the letter and nothing else — nobody is billed and nothing is mailed.
          Print it, then record it as sent when it goes out; that is what raises the invoice.
        </span>
      </div>
    </div>
  );
}

/* ═══ printing ═══════════════════════════════════════════════════════ */

function PrintPanel({ notice, onClose }: { notice: FineNotice; onClose: () => void }) {
  const s = useStore();
  const [photos, setPhotos] = useState<ExhibitPhoto[]>([
    { src: "", caption: "" }, { src: "", caption: "" },
    { src: "", caption: "" }, { src: "", caption: "" },
  ]);
  const [error, setError] = useState("");

  function readPhoto(i: number, file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () =>
      setPhotos((prev) => prev.map((p, idx) => (idx === i ? { ...p, src: String(reader.result) } : p)));
    reader.readAsDataURL(file);
  }

  return (
    <div style={{ padding: `4px ${pad.card} 22px`, borderBottom: `1px solid ${color.hairlineSoft}`, display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <Eyebrow>Photo exhibit</Eyebrow>
        <span style={{ fontSize: 13.5, color: color.inkTertiary, lineHeight: 1.55 }}>
          Up to four, printed on page two of the letter. They are read in this browser and
          are not stored on the case file — file upload is not wired up yet, so keep the
          originals wherever the inspector saved them.
        </span>
      </div>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
        {photos.map((p, i) => (
          <div key={i} style={{ display: "grid", gap: 8 }}>
            <Field label={`Photo ${i + 1}`}>
              <input
                type="file" accept="image/*"
                onChange={(e) => readPhoto(i, e.target.files?.[0])}
                style={{
                  width: "100%", font: "inherit", fontSize: 14,
                  border: `1px solid ${color.borderInput}`, borderRadius: radius.sm,
                  padding: "9px 10px", background: color.surface,
                }}
              />
            </Field>
            <Input
              value={p.caption}
              onChange={(v) => setPhotos((prev) => prev.map((x, idx) => (idx === i ? { ...x, caption: v } : x)))}
              placeholder="Caption — what it shows"
            />
          </div>
        ))}
      </div>

      {error ? <ErrorLine>{error}</ErrorLine> : null}

      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
        <Primary
          onClick={() => {
            const opened = printFineNotice(notice, {
              signer: s.currentUser,
              entities: s.entities,
              photos: photos.filter((p) => p.src),
            });
            if (!opened) {
              return setError("The browser blocked the print window. Allow pop-ups for this site and try again.");
            }
            setError("");
          }}
        >
          Open the letter to print
        </Primary>
        <TextButton tone="muted" onClick={onClose}>Close</TextButton>
        <span style={{ fontSize: 13.5, color: color.inkTertiary }}>
          Opens in a new window with the print dialog — choose &ldquo;Save as PDF&rdquo; to keep a copy.
        </span>
      </div>
    </div>
  );
}

/* ═══ recording it as sent ═══════════════════════════════════════════ */

function SendPanel({ notice, onDone, onCancel }: { notice: FineNotice; onDone: () => void; onCancel: () => void }) {
  const s = useStore();
  const [sentOn, setSentOn] = useState(todayISO());
  const [delivery, setDelivery] = useState(notice.delivery);
  const [tracking, setTracking] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function send() {
    if (saving) return;
    setSaving(true);
    setError("");
    const res = await sendFineNotice({ id: notice.id, sentOn, delivery, tracking });
    setSaving(false);
    if (!res.ok) return setError(res.error);
    s.setFineNotices(res.notices);
    s.setInvoices(res.invoices);
    /* The case file has to show the notice went out; the office reads the
       mailing record, not this list, when a fine is challenged. */
    if (res.violationId && res.mailing) {
      const mailing = res.mailing;
      const activity = res.activity;
      const nextStatus = res.violationStatus;
      s.setViolations((prev) =>
        prev.map((v): Violation =>
          v.id === res.violationId
            ? {
                ...v,
                mailings: [...v.mailings, mailing],
                activity: activity ? [...v.activity, activity] : v.activity,
                status: (nextStatus as Violation["status"]) ?? v.status,
              }
            : v,
        ),
      );
    }
    s.audit(
      `Fines: sent ${notice.reference} — ${notice.total}`
      + (res.invoiceNumber ? ` billed as ${res.invoiceNumber}` : ""),
    );
    onDone();
  }

  return (
    <div style={{ padding: `4px ${pad.card} 22px`, borderBottom: `1px solid ${color.hairlineSoft}`, display: "grid", gap: 16 }}>
      <Eyebrow>Record {notice.reference} as sent</Eyebrow>
      <FieldGrid>
        <Field label="Date it went out"><DateInput value={sentOn} onChange={setSentOn} /></Field>
        <Field label="Delivered by">
          <Select value={delivery} onChange={setDelivery} options={DELIVERY.map((d) => ({ id: d, label: d }))} />
        </Field>
        <Field label="Tracking no." hint="Certified mail only"><Input value={tracking} onChange={setTracking} /></Field>
      </FieldGrid>
      {error ? <ErrorLine>{error}</ErrorLine> : null}
      <span style={{ fontSize: 14, color: color.inkSecondary, lineHeight: 1.6 }}>
        This bills {notice.recipient} {notice.total}. An invoice is raised against the home
        and issued straight away, so the balance in their portal matches the letter in their
        hand. The mailing lands on the violation&rsquo;s case file, and the case moves to
        &ldquo;notice sent&rdquo; if it has not already.
      </span>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <Primary onClick={send} style={saving ? { opacity: 0.6, pointerEvents: "none" } : undefined}>
          {saving ? "Recording…" : `Yes, send it and bill ${notice.total}`}
        </Primary>
        <TextButton tone="muted" onClick={onCancel}>Not yet</TextButton>
      </div>
    </div>
  );
}

/* ═══ the list ═══════════════════════════════════════════════════════ */

export function FineNoticesCard({
  openDraft, seed, onCloseDraft, onOpenDraft,
}: {
  /** Driven from the case file, so a fine drafted there opens seeded. */
  openDraft: boolean;
  seed?: FineSeed;
  onCloseDraft: () => void;
  onOpenDraft: () => void;
}) {
  const s = useStore();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [pending, setPending] = useState<PendingConfirm | null>(null);
  const [printOpen, setPrintOpen] = useState("");
  const [sendOpen, setSendOpen] = useState("");
  const [waiveReason, setWaiveReason] = useState("");
  const [flowError, setFlowError] = useState("");
  const [discardId, setDiscardId] = useState("");

  const invoiceById = useMemo(
    () => new Map(s.invoices.map((i) => [i.id, i])),
    [s.invoices],
  );

  const visible = useSearchFilter(
    s.fineNotices, query, ["reference", "address", "recipient", "level", "status"],
    (n) => {
      if (filter === "All") return true;
      if (filter === "Unpaid") {
        const inv = n.invoiceId ? invoiceById.get(n.invoiceId) : null;
        return Boolean(inv && inv.status === "sent");
      }
      return n.status === filter;
    },
  );

  async function move(notice: FineNotice, next: FineNoticeStatus) {
    setPending(null);
    setFlowError("");
    const res = await setFineNoticeStatus({ id: notice.id, status: next, reason: waiveReason });
    if (!res.ok) return setFlowError(res.error);
    s.setFineNotices(res.notices);
    s.setInvoices(res.invoices);
    s.audit(`Fines: ${notice.reference} marked ${next.toLowerCase()}`);
    setWaiveReason("");
  }

  async function discard(notice: FineNotice) {
    setDiscardId("");
    setFlowError("");
    const res = await discardFineDraft(notice.id);
    if (!res.ok) return setFlowError(res.error);
    s.setFineNotices(res.notices);
    s.audit(`Fines: discarded draft ${notice.reference}`);
  }

  const drafted = s.fineNotices.filter((n) => n.status === "Drafted").length;

  return (
    <Card>
      <CardHead
        title="Fine notices"
        meta="The letter and the bill behind it. Drafting costs nobody anything; recording a notice as sent is what charges the home."
      >
        <Mono size={13} style={{ color: color.neutral }}>
          {s.fineNotices.length} on file{drafted ? ` · ${drafted} unsent` : ""}
        </Mono>
      </CardHead>

      <AddDrawer
        open={openDraft}
        onOpen={onOpenDraft}
        onCancel={onCloseDraft}
        openLabel="Draft a fine notice"
        title={seed?.violationType ? `Fine notice — ${seed.violationType}` : "Fine notice"}
        note="Seeded from a violation's case file when you start one there."
      >
        <FineComposer
          /* Remount when the case behind it changes: the composer seeds its
             fields once, and a drawer left open while another case file is
             opened would otherwise keep the first case's address. */
          key={seed?.violationId ?? "standalone"}
          seed={seed}
          onSaved={(notice) => {
            onCloseDraft();
            /* Straight to the print panel: the reason anyone drafts a notice
               is to put it in an envelope. */
            setPrintOpen(notice.id);
          }}
          onCancel={onCloseDraft}
        />
      </AddDrawer>

      <FilterBar
        query={query} onQuery={setQuery}
        placeholder="Search reference, address, recipient or notice level…"
        filters={FILTERS} active={filter} onFilter={setFilter}
      />

      {flowError ? <div style={{ padding: `12px ${pad.card} 0` }}><ErrorLine>{flowError}</ErrorLine></div> : null}

      {visible.length === 0 ? (
        <Empty>
          {s.fineNotices.length === 0
            ? "No fine notices yet. Open a violation's case file and draft one there — it comes through with the address, the inspector and the inspection date already filled in."
            : "No fine notices match that."}
        </Empty>
      ) : (
        <Scroller min={900}>
          <TableHead cols={FINE_COLS} labels={["Reference", "Notice", "Amount", ""]} align={[2]} />
          {visible.map((n) => {
            const inv = n.invoiceId ? invoiceById.get(n.invoiceId) : null;
            const menu = buildActionMenu(FINE_STEPS, n.status, n.id, n.reference, pending, setPending);
            const tone =
              n.status === "Waived" ? color.inkQuaternary
                : n.status === "Escalated" ? color.critical
                : n.status === "Cured" ? color.positive
                : n.status === "Drafted" ? color.attention
                : color.inkSecondary;
            return (
              <React.Fragment key={n.id}>
                <TableRow cols={FINE_COLS}>
                  <span>
                    <Mono size={13} style={{ display: "block", color: color.ink }}>{n.reference}</Mono>
                    <Mono size={11} style={{ display: "block", marginTop: 2, color: color.inkQuaternary }}>
                      {n.noticeDateLabel}
                    </Mono>
                  </span>

                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 600 }}>
                      {n.level} · {n.address}
                    </span>
                    <span style={{ display: "block", marginTop: 2, fontSize: 13, color: color.inkQuaternary }}>
                      {n.recipient} · {n.items.length} violation{n.items.length === 1 ? "" : "s"}
                      {n.sentOn ? ` · sent ${n.sentOn}` : ""}
                    </span>
                  </span>

                  {/* Amount over status in one track: a sixth cell wraps the
                      action cluster onto its own line at laptop width. */}
                  <span style={{ textAlign: "right", justifySelf: "end" }}>
                    <Mono size={14} style={{ display: "block", color: color.ink, fontWeight: 500 }}>{n.total}</Mono>
                    <Mono size={11} style={{ display: "block", marginTop: 3, color: tone, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {n.status}
                    </Mono>
                    {inv ? (
                      <Mono size={11} style={{ display: "block", marginTop: 2, color: inv.status === "paid" ? color.positive : inv.overdue ? color.critical : color.inkQuaternary }}>
                        {inv.number} · {inv.status === "sent" && inv.overdue ? "overdue" : inv.status}
                      </Mono>
                    ) : null}
                  </span>

                  <span style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    {/* One affordance for a status change everywhere in the
                        portal. A draft has exactly one next state, and it
                        needs a form rather than a one-line confirmation —
                        so the dropdown opens that form instead of a bar. */}
                    <ActionSelect
                      options={n.status === "Drafted" ? [{ id: "send", label: "Record it as sent" }] : menu.options}
                      onChoose={(id) => {
                        if (n.status === "Drafted") {
                          if (id !== "send") return;
                          setPrintOpen("");
                          setSendOpen(sendOpen === n.id ? "" : n.id);
                          return;
                        }
                        menu.onChoose(id);
                      }}
                    />
                    <TextButton onClick={() => { setPrintOpen(printOpen === n.id ? "" : n.id); setSendOpen(""); }}>
                      {printOpen === n.id ? "Close letter" : "Print the letter"}
                    </TextButton>
                    {n.status === "Drafted" ? (
                      <TextButton tone="destructive" onClick={() => setDiscardId(discardId === n.id ? "" : n.id)}>
                        Discard
                      </TextButton>
                    ) : null}
                  </span>
                </TableRow>

                {discardId === n.id ? (
                  <ConfirmBar
                    text={`Discard draft ${n.reference}? It has not been sent and nobody has been billed, so nothing is undone — but the reference number is spent and the next draft gets a new one.`}
                    confirmLabel="Yes, discard it"
                    onCancel={() => setDiscardId("")}
                    onConfirm={() => discard(n)}
                  />
                ) : null}

                {menu.confirming ? (
                  <>
                    {menu.nextValue === "Waived" ? (
                      <div style={{ padding: `12px ${pad.card} 0` }}>
                        <Field label="Why it is being waived" hint="Stays on the record and on the voided invoice">
                          <Input value={waiveReason} onChange={setWaiveReason} placeholder="e.g. Board voted to waive at the March meeting" />
                        </Field>
                      </div>
                    ) : null}
                    <ConfirmBar
                      text={menu.confirmText}
                      confirmLabel={menu.confirmLabel}
                      onCancel={() => { menu.cancel(); setWaiveReason(""); }}
                      onConfirm={() => move(n, menu.nextValue as FineNoticeStatus)}
                    />
                  </>
                ) : null}

                {sendOpen === n.id ? (
                  <SendPanel notice={n} onDone={() => setSendOpen("")} onCancel={() => setSendOpen("")} />
                ) : null}

                {printOpen === n.id ? (
                  <PrintPanel notice={n} onClose={() => setPrintOpen("")} />
                ) : null}
              </React.Fragment>
            );
          })}
        </Scroller>
      )}
    </Card>
  );
}
