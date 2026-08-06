"use client";

import { useMemo, useState } from "react";

import {
  AddressFields,
  EMPTY_ADDRESS,
  isAddressComplete,
  type Address,
} from "@/components/site/AddressFields";
import { COMMUNITIES, generateAccountNumber } from "@/lib/accounts/account-number";

/**
 * Admin → People → Owners, per docs/design/handoff.md §3.
 *
 * FRONTEND ONLY — fixture data, no persistence. Per the handoff, the audit log
 * must be written server-side inside the mutation's transaction; the entries
 * shown here exist only to demonstrate the surface.
 */

type Status = "current" | "past_due" | "in_collections" | "closed";
type Occupancy = "Owner-occupied" | "Leased" | "Vacant";

type Owner = {
  id: string;
  accountNumber: string;
  name: string;
  coOwner: string;
  community: string;
  address: string;
  email: string;
  mobile: string;
  balanceCents: number;
  status: Status;
  occupancy: Occupancy;
};

const SEED: Owner[] = [
  {
    id: "1",
    accountNumber: "SL-104382",
    name: "Dana Whitfield",
    coOwner: "Marcus Whitfield",
    community: "sofi-lakes",
    address: "7880 Morrison Road, Katy, Texas 77493",
    email: "d.whitfield@example.com",
    mobile: "713-555-0148",
    balanceCents: 0,
    status: "current",
    occupancy: "Owner-occupied",
  },
  {
    id: "2",
    accountNumber: "SL-118204",
    name: "Priya Raman",
    coOwner: "",
    community: "sofi-lakes",
    address: "7912 Morrison Road, Lot 22, Katy, Texas 77493",
    email: "p.raman@example.com",
    mobile: "713-555-0192",
    balanceCents: 42500,
    status: "past_due",
    occupancy: "Leased",
  },
  {
    id: "3",
    accountNumber: "SL-540913",
    name: "Marcus Bell",
    coOwner: "",
    community: "sofi-lakes",
    address: "204 Lakebend Drive, Katy, Texas 77493",
    email: "mbell@example.com",
    mobile: "281-555-0119",
    balanceCents: 138000,
    status: "in_collections",
    occupancy: "Owner-occupied",
  },
];

const STATUS_LABEL: Record<Status, string> = {
  current: "Current",
  past_due: "Past due",
  in_collections: "In collections",
  closed: "Closed",
};

/** Colour carries the status — no icons, per the handoff. */
const STATUS_INK: Record<Status, string> = {
  current: "text-status-positive",
  past_due: "text-status-attention",
  in_collections: "text-status-critical",
  closed: "text-status-neutral",
};

const FILTERS: Array<{ value: Status | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "current", label: "Current" },
  { value: "past_due", label: "Past due" },
  { value: "in_collections", label: "In collections" },
  { value: "closed", label: "Closed" },
];

const OCCUPANCIES: Occupancy[] = ["Owner-occupied", "Leased", "Vacant"];

const FIELD =
  "w-full rounded-[10px] border border-outline-strong bg-surface px-3.5 py-2.5 text-base text-on-surface placeholder:text-outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";
const LABEL = "mb-2 block text-sm text-on-surface-variant";
const EYEBROW =
  "font-label text-[11px] uppercase tracking-[0.12em] text-outline";
/** Handoff: inline drawer field grids are auto-fit / minmax(180px, 1fr). */
const FIELD_GRID =
  "grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] justify-items-start gap-4";
const CHIP_ON =
  "rounded-full border border-chip-on-border bg-chip-on px-3.5 py-1.5 text-sm text-chip-on-ink cursor-pointer";
const CHIP_OFF =
  "rounded-full border border-outline-variant bg-surface-container-low px-3.5 py-1.5 text-sm text-on-surface-variant hover:border-outline cursor-pointer";

function usd(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function OwnersManager({ actingStaff }: { actingStaff: string }) {
  const [rows, setRows] = useState<Owner[]>(SEED);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | "all">("all");
  const [community, setCommunity] = useState("all");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audit, setAudit] = useState<string[]>([]);

  // Add-a-homeowner draft
  const [name, setName] = useState("");
  const [coOwner, setCoOwner] = useState("");
  const [formCommunity, setFormCommunity] = useState("");
  const [property, setProperty] = useState<Address>(EMPTY_ADDRESS);
  const [accountNumber, setAccountNumber] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [occupancy, setOccupancy] = useState<Occupancy>("Owner-occupied");
  const [openingBalance, setOpeningBalance] = useState("");
  const [mailingSame, setMailingSame] = useState(true);
  const [mailing, setMailing] = useState<Address>(EMPTY_ADDRESS);
  const [sendInvite, setSendInvite] = useState(true);
  const [mailPacket, setMailPacket] = useState(true);
  const [offerAutopay, setOfferAutopay] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (status !== "all" && r.status !== status) return false;
      if (community !== "all" && r.community !== community) return false;
      if (!q) return true;
      return [r.name, r.coOwner, r.email, r.accountNumber, r.address].some((v) =>
        v.toLowerCase().includes(q),
      );
    });
  }, [rows, query, status, community]);

  function resetForm() {
    setName("");
    setCoOwner("");
    setFormCommunity("");
    setProperty(EMPTY_ADDRESS);
    setAccountNumber("");
    setEmail("");
    setMobile("");
    setClosingDate("");
    setOccupancy("Owner-occupied");
    setOpeningBalance("");
    setMailingSame(true);
    setMailing(EMPTY_ADDRESS);
    setSendInvite(true);
    setMailPacket(true);
    setOfferAutopay(false);
    setError(null);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    // Validation names the fix, not the failure, one message at a time.
    if (!name.trim()) return setError("Add the owner's name.");
    if (!formCommunity) return setError("Choose the community this property is in.");
    if (!isAddressComplete(property))
      return setError("Complete the property address — street, city and ZIP.");
    if (!email.trim() && !mobile.trim())
      return setError("Add an email or a mobile — the portal invite needs one.");
    if (!mailingSame && !isAddressComplete(mailing))
      return setError(
        "Complete the mailing address, or switch it back to “Same as property”.",
      );

    const issued = accountNumber.trim() || generateAccountNumber(formCommunity) || "";
    const addr = [
      `${property.streetNumber} ${property.streetName}`.trim(),
      property.unit.trim(),
      property.city.trim(),
      `${property.state} ${property.zip}`.trim(),
    ]
      .filter(Boolean)
      .join(", ");

    setRows((prev) => [
      {
        id: issued,
        accountNumber: issued,
        name: name.trim(),
        coOwner: coOwner.trim(),
        community: formCommunity,
        address: addr,
        email: email.trim(),
        mobile: mobile.trim(),
        balanceCents: Math.round(Number(openingBalance || 0) * 100),
        status: Number(openingBalance || 0) > 0 ? "past_due" : "current",
        occupancy,
      },
      ...prev,
    ]);

    const flags = [
      sendInvite && "portal invite sent",
      mailPacket && "welcome packet mailed",
      offerAutopay && "autopay offered",
    ].filter(Boolean);
    setAudit((prev) => [
      `${actingStaff} added ${name.trim()} (${issued})${
        flags.length ? ` — ${flags.join(", ")}` : ""
      }`,
      ...prev,
    ]);

    resetForm();
    setAdding(false);
  }

  return (
    <section className="grid gap-6">
      {/* Rule 1 — the add-form sits at the top, collapsed to a single button. */}
      {adding ? (
        <form
          onSubmit={submit}
          className="rounded-xl border border-outline-variant bg-surface-container-low p-5 md:p-6"
        >
          <div className="mb-5 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[17px] font-semibold text-on-surface">
              Add a homeowner
            </h2>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setAdding(false);
              }}
              className="text-sm text-secondary hover:underline"
            >
              Cancel
            </button>
          </div>

          <div className="grid gap-6">
            <div className={FIELD_GRID}>
              <label className="block w-full">
                <span className={LABEL}>Owner name</span>
                <input
                  className={FIELD}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="block w-full">
                <span className={LABEL}>
                  Co-owner <span className="text-outline">(optional)</span>
                </span>
                <input
                  className={FIELD}
                  value={coOwner}
                  onChange={(e) => setCoOwner(e.target.value)}
                />
              </label>
              <label className="block w-full">
                <span className={LABEL}>Community</span>
                <select
                  className={`${FIELD} cursor-pointer appearance-none`}
                  value={formCommunity}
                  onChange={(e) => setFormCommunity(e.target.value)}
                >
                  <option value="">Select…</option>
                  {COMMUNITIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div>
              <p className={`${EYEBROW} mb-3`}>Property address</p>
              <AddressFields
                idPrefix="owner-property"
                value={property}
                onChange={setProperty}
                texasOnly
              />
            </div>

            <div className={FIELD_GRID}>
              <label className="block w-full">
                <span className={LABEL}>
                  Account number{" "}
                  <span className="text-outline">(auto-assigned if blank)</span>
                </span>
                <input
                  className={`${FIELD} font-label`}
                  placeholder="SL-______"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                />
              </label>
              <label className="block w-full">
                <span className={LABEL}>Email</span>
                <input
                  className={FIELD}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="block w-full">
                <span className={LABEL}>Mobile</span>
                <input
                  className={FIELD}
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
              </label>
            </div>

            <div className={FIELD_GRID}>
              <label className="block w-full">
                <span className={LABEL}>Closing / move-in date</span>
                <input
                  className={FIELD}
                  type="date"
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                />
              </label>
              <label className="block w-full">
                <span className={LABEL}>Occupancy</span>
                <select
                  className={`${FIELD} cursor-pointer appearance-none`}
                  value={occupancy}
                  onChange={(e) => setOccupancy(e.target.value as Occupancy)}
                >
                  {OCCUPANCIES.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block w-full">
                <span className={LABEL}>Opening balance</span>
                <input
                  className={`${FIELD} font-label`}
                  inputMode="decimal"
                  placeholder="0.00"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(e.target.value)}
                />
              </label>
            </div>

            <div>
              <p className={`${EYEBROW} mb-3`}>Mailing address</p>
              <div className="mb-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  className={mailingSame ? CHIP_ON : CHIP_OFF}
                  onClick={() => setMailingSame(true)}
                >
                  Same as property
                </button>
                <button
                  type="button"
                  className={!mailingSame ? CHIP_ON : CHIP_OFF}
                  onClick={() => setMailingSame(false)}
                >
                  Different address
                </button>
              </div>
              {!mailingSame ? (
                <AddressFields
                  idPrefix="owner-mailing"
                  value={mailing}
                  onChange={setMailing}
                />
              ) : null}
            </div>

            <div>
              <p className={`${EYEBROW} mb-3`}>On save</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={sendInvite ? CHIP_ON : CHIP_OFF}
                  onClick={() => setSendInvite((v) => !v)}
                >
                  Send portal invite
                </button>
                <button
                  type="button"
                  className={mailPacket ? CHIP_ON : CHIP_OFF}
                  onClick={() => setMailPacket((v) => !v)}
                >
                  Mail welcome packet
                </button>
                <button
                  type="button"
                  className={offerAutopay ? CHIP_ON : CHIP_OFF}
                  onClick={() => setOfferAutopay((v) => !v)}
                >
                  Offer autopay enrollment
                </button>
              </div>
            </div>

            {error ? (
              <p className="text-sm text-status-critical" role="alert">
                {error}
              </p>
            ) : null}

            <div>
              <button
                type="submit"
                className="rounded-[10px] bg-secondary px-5 py-3 text-base font-medium text-on-secondary hover:bg-secondary-hover"
              >
                Add homeowner
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="rounded-full bg-secondary px-5 py-2.5 text-[15px] font-medium text-on-secondary hover:bg-secondary-hover"
          >
            Add a homeowner
          </button>
          <button
            type="button"
            className="rounded-full border border-outline-strong px-5 py-2.5 text-[15px] text-on-surface hover:border-outline"
          >
            Import CSV roster
          </button>
        </div>
      )}

      {/* Rule 5 — search, status chips, community selector. */}
      <div className="grid gap-4">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] justify-items-start gap-3">
          <label className="block w-full">
            <span className={LABEL}>Search owners</span>
            <input
              className={FIELD}
              placeholder="Name, email, account number or address"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label className="block w-full">
            <span className={LABEL}>Community</span>
            <select
              className={`${FIELD} cursor-pointer appearance-none`}
              value={community}
              onChange={(e) => setCommunity(e.target.value)}
            >
              <option value="all">All communities</option>
              {COMMUNITIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              className={status === f.value ? CHIP_ON : CHIP_OFF}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-on-surface-variant">
          No owners match these filters.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface">
          {visible.map((r, i) => (
            <div
              key={r.id}
              className={`grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] items-baseline justify-items-start gap-x-[18px] gap-y-2 px-5 py-4 hover:bg-row-hover md:px-6 ${
                i > 0 ? "border-t border-hairline-soft" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="font-label text-xs text-status-neutral">
                  {r.accountNumber}
                </p>
                <p className="mt-1 text-base font-medium text-on-surface">
                  {r.name}
                </p>
                {r.coOwner ? (
                  <p className="text-sm text-on-surface-variant">
                    &amp; {r.coOwner}
                  </p>
                ) : null}
              </div>
              <p className="min-w-0 text-sm text-on-surface-variant">
                {r.address}
              </p>
              <div className="min-w-0">
                <p className="text-sm text-on-surface-variant">{r.email}</p>
                <p className="font-label text-xs text-status-neutral">
                  {r.mobile}
                </p>
              </div>
              <p className="font-label text-sm text-on-surface">
                {usd(r.balanceCents)}
              </p>
              <div className="min-w-0">
                <p className={`font-label text-xs ${STATUS_INK[r.status]}`}>
                  {STATUS_LABEL[r.status]}
                </p>
                <p className="mt-1 text-sm text-on-surface-variant">
                  {r.occupancy}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {audit.length > 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface-muted p-5">
          <p className={`${EYEBROW} mb-3`}>
            Audit trail — this session (demo only)
          </p>
          <ul className="grid gap-2">
            {audit.map((line, i) => (
              <li key={i} className="font-label text-xs text-status-neutral">
                {line}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-on-surface-variant">
            The real log is append-only and written server-side in the same
            transaction as the mutation. It lives at Team → Audit trail.
          </p>
        </div>
      ) : null}
    </section>
  );
}
