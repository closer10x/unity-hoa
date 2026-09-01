/**
 * The fine notice, as a printed letter.
 *
 * Built as a standalone document in its own window rather than a hidden
 * region of the portal, the same way the financial statements are: the print
 * dialog then saves a clean PDF with no sidebar, no chrome and no dependence
 * on what the portal happens to be showing.
 *
 * Two rules the printed page has to keep that the screen does not:
 *
 *   * Hex, not oklch. Print pipelines still render oklch unreliably, and a
 *     letter that arrives with grey headings is a letter that looks unofficial.
 *     The values are the same olive tokens, written the long way.
 *
 *   * Say what is missing. A blank where the governing section should be is
 *     an unenforceable notice, so unfilled fields print as a visible
 *     placeholder rather than an empty space nobody notices.
 */

import type { BillingEntity, FineNotice } from "@/lib/admin-portal/types";

/** A photo for the exhibit page, read client-side. Never uploaded. */
export type ExhibitPhoto = { src: string; caption: string };

const MANAGER = {
  name: "Unity Grid Management",
  address: "7880 Morrison Road · Katy, Texas 77493",
  phone: "713-208-3539",
  email: "info@unitygridmanagement.com",
} as const;

const C = {
  ink: "#1C1E18",
  muted: "#595959",
  faint: "#8A938A",
  olive: "#333D26",
  tint: "#E9EBDD",
  line: "#D3D6CB",
} as const;

const escapeHtml = (v: string) =>
  v.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

/** A gap the office still has to fill, printed so it cannot be missed. */
const orGap = (v: string, gap: string) =>
  v.trim() ? escapeHtml(v.trim()) : `<span class="gap">[${escapeHtml(gap)}]</span>`;

export function longDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric", timeZone: "UTC",
  });
}

export function shortDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [y, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}/${y.slice(2)}`;
}

export const usd = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Legal name of the association the fine is levied for. */
function associationName(entities: BillingEntity[], key: string | null): string {
  const found = entities.find((e) => e.key === (key ?? "sofilakes"));
  return found?.legalName ?? "Sofi Lakes Residential Association Inc.";
}

export function fineNoticeHtml(
  notice: FineNotice,
  opts: { signer: string; entities: BillingEntity[]; photos: ExhibitPhoto[]; logoUrl: string },
): string {
  const association = associationName(opts.entities, notice.entity);
  const total = notice.items.reduce((s, i) => s + i.amountCents, 0);

  const lotLine = [
    notice.lotNumber ? `Lot ${notice.lotNumber}` : null,
    notice.block ? `Block ${notice.block}` : null,
    notice.address,
    association,
    `Ref. ${notice.reference}`,
  ].filter((v): v is string => Boolean(v)).map(escapeHtml).join(" &bull; ");

  const rows = notice.items.map((i) => `<tr>
    <td>${i.observedOn ? escapeHtml(shortDate(i.observedOn)) : "—"}</td>
    <td>${escapeHtml(i.description)}</td>
    <td>${escapeHtml(i.level || notice.level)}</td>
    <td class="num">${escapeHtml(usd(i.amountCents))}</td>
  </tr>`).join("");

  /* The continuing fine and the administrative fee only appear when the
     office entered them. An invented "$0 per day" in a demand letter is worse
     than no sentence at all — it reads as a fine of nothing. */
  const consequences = [
    notice.continuingCents
      ? `assess ${escapeHtml(usd(notice.continuingCents))} per ${escapeHtml(notice.continuingUnit || "day")} for as long as it continues`
      : null,
    notice.adminFeePct != null
      ? `correct the violation and bill the cost back to you plus a ${escapeHtml(String(notice.adminFeePct))}% administrative fee`
      : "correct the violation and bill the cost back to you",
    "suspend architectural approvals, permits and gate access",
    "record a lien for the amount owed, together with attorney&rsquo;s fees",
  ].filter(Boolean);

  const photos = opts.photos.filter((p) => p.src);

  return `<!doctype html><html><head><meta charset="utf-8">
<title>${escapeHtml(notice.reference)} — Notice of violation and assessment of fine</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  @page { size: letter; margin: 0.75in 0.8in; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { font: 11pt/1.5 'Instrument Sans', system-ui, sans-serif; color: ${C.ink};
         margin: 0; background: #EEF0E8; }
  .sheet { background: #fff; max-width: 7in; margin: 0 auto 26px; padding: 0.7in 0.75in 0.6in;
           box-shadow: 0 2px 14px rgba(0,0,0,.13); }
  p { margin: 0 0 10pt; }
  .meta { font-size: 9.5pt; color: ${C.muted}; }
  .mono { font-family: 'IBM Plex Mono', ui-monospace, monospace; }
  .gap { color: #A03B27; font-style: italic; }
  header img { width: 2.4in; display: block; }
  .rule { border-bottom: 1.5pt solid ${C.olive}; margin: 8pt 0 14pt; }
  .rule-thin { border-bottom: .75pt solid ${C.line}; margin: 14pt 0 8pt; }
  .re { font-weight: 700; margin-bottom: 3pt; letter-spacing: .01em; }
  table { width: 100%; border-collapse: collapse; margin: 12pt 0 13pt; font-size: 10pt; }
  th { background: ${C.olive}; color: #fff; text-align: left; padding: 6pt 8pt; font-weight: 600;
       font-family: 'IBM Plex Mono', ui-monospace, monospace; font-size: 8.5pt;
       letter-spacing: .08em; text-transform: uppercase; }
  td { padding: 6pt 8pt; border: .5pt solid ${C.line}; vertical-align: top; }
  .num { text-align: right; font-family: 'IBM Plex Mono', ui-monospace, monospace; white-space: nowrap; }
  tr.total td { background: ${C.tint}; font-weight: 700; }
  ul { margin: 0 0 10pt; padding-left: 16pt; }
  li { margin-bottom: 3pt; }
  .sig { margin-top: 26pt; }
  .sig b { display: block; }
  footer { text-align: center; font-size: 8pt; color: ${C.muted}; margin-top: 20pt; }
  h2 { font-size: 13pt; color: ${C.olive}; margin: 0 0 4pt; }
  .exhibit { display: grid; grid-template-columns: 1fr 1fr; gap: 14pt 16pt; margin-top: 14pt; }
  .frame { border: .75pt solid ${C.line}; background: #F5F6F2; height: 2.5in;
           display: flex; align-items: center; justify-content: center; overflow: hidden; }
  .frame img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .cap { margin: 5pt 0 0; font-size: 8.5pt; color: ${C.muted}; }
  .cap i { display: block; color: ${C.faint}; font-size: 8pt; font-style: normal; }
  @media print {
    body { background: #fff; }
    .sheet { box-shadow: none; margin: 0; padding: 0; max-width: none;
             page-break-after: always; }
    .sheet:last-child { page-break-after: auto; }
  }
</style></head><body>

<div class="sheet">
  <header>
    <img src="${escapeHtml(opts.logoUrl)}" alt="${MANAGER.name}" />
    <p class="meta" style="margin:5pt 0 0">Managing agent for ${escapeHtml(association)}<br>${MANAGER.address}</p>
  </header>
  <div class="rule"></div>

  <p>${escapeHtml(longDate(notice.noticeDate))}</p>

  <p style="margin-bottom:3pt"><b>${escapeHtml(notice.recipient)}</b></p>
  <p class="meta">${[
    notice.recipientAddress ? escapeHtml(notice.recipientAddress.replace(/\n/g, " &bull; ")) : null,
    notice.recipientEmail ? escapeHtml(notice.recipientEmail) : null,
    `Sent by ${escapeHtml(notice.delivery.toLowerCase())}`,
  ].filter(Boolean).join(" &bull; ")}</p>

  <p class="re">RE: NOTICE OF VIOLATION AND ASSESSMENT OF FINE — ${escapeHtml(notice.level.toUpperCase())}</p>
  <p class="meta mono" style="font-size:8.5pt">${lotLine}</p>

  <p>Dear ${escapeHtml(notice.recipient)}:</p>

  <p>${MANAGER.name} is the managing agent for ${escapeHtml(association)} (the
  &ldquo;Association&rdquo;) and is authorised to act on its behalf in matters of covenant
  enforcement. The property above was inspected
  ${notice.inspectionDate ? `on ${escapeHtml(longDate(notice.inspectionDate))}` : ""}
  ${notice.inspector ? `by ${escapeHtml(notice.inspector)}` : ""} and found in violation of
  the Association&rsquo;s governing documents. A fine has been assessed against the
  account for this property.</p>

  <table>
    <thead><tr>
      <th style="width:16%">Observed</th>
      <th style="width:46%">Violation</th>
      <th style="width:16%">Notice</th>
      <th style="width:22%" class="num">Fine</th>
    </tr></thead>
    <tbody>
      ${rows}
      <tr class="total"><td></td><td></td><td>TOTAL DUE</td><td class="num">${escapeHtml(usd(total))}</td></tr>
    </tbody>
  </table>

  <p>What was observed: ${orGap(notice.observed, "describe what was observed")}
  This violates ${orGap(notice.section, "governing section")}${
    notice.frequency ? `, which requires the lot and the areas adjoining it to be cleared ${escapeHtml(notice.frequency)}` : ""
  }.${photos.length ? " Photographs are attached." : ""}</p>

  <p><b>Correct this by ${escapeHtml(longDate(notice.cureDate)) || "<span class=\"gap\">[date]</span>"}.</b>
  If it is not corrected by that date, the Association may:</p>
  <ul>${consequences.map((c) => `<li>${c}</li>`).join("")}</ul>

  <p><b>Pay ${escapeHtml(usd(total))}${
    notice.payDays ? ` within ${notice.payDays} days` : ""
  }</b> to ${escapeHtml(association)}, c/o ${MANAGER.name}, ${orGap(notice.remitTo, "remittance address")}${
    notice.payLink ? `, or online at ${escapeHtml(notice.payLink)}` : ""
  }. Quote reference ${escapeHtml(notice.reference)} on your payment.
  ${
    notice.disputeDays
      ? `To dispute this fine or request a hearing before the Board, write to ${MANAGER.email} within ${notice.disputeDays} days of the date of this letter.`
      : `To dispute this fine or request a hearing before the Board, write to ${MANAGER.email}.`
  }
  Correcting the violation does not waive the fine unless the Association agrees in writing.</p>

  <p style="margin-top:18pt">Sincerely,</p>
  <div class="sig">
    <b>${escapeHtml(opts.signer)}</b>
    <span class="meta">${MANAGER.name}, on behalf of ${escapeHtml(association)}</span><br>
    <span class="meta">${MANAGER.phone} &nbsp;|&nbsp; ${MANAGER.email}</span>
  </div>

  <div class="rule-thin"></div>
  <p style="margin:0;font-size:8.5pt;color:${C.muted}">
    Enclosures: ${photos.length ? "Photo exhibit &bull; " : ""}${
      notice.section ? escapeHtml(notice.section) : "governing provision"
    }${notice.copiesTo ? ` &nbsp;&nbsp; cc: ${escapeHtml(notice.copiesTo)}` : ""}
  </p>
  <footer>${MANAGER.name} &bull; ${MANAGER.phone} &bull; ${MANAGER.email}</footer>
</div>

${photos.length === 0 ? "" : `<div class="sheet">
  <h2>Photo exhibit</h2>
  <p class="meta mono" style="font-size:8.5pt">${lotLine}${
    notice.inspectionDate ? ` &bull; Inspected ${escapeHtml(shortDate(notice.inspectionDate))}` : ""
  }${notice.inspector ? ` by ${escapeHtml(notice.inspector)}` : ""}</p>
  <div class="rule-thin"></div>
  <div class="exhibit">
    ${photos.map((p, i) => `<div>
      <div class="frame"><img src="${p.src}" alt=""></div>
      <p class="cap">Photo ${i + 1}: ${orGap(p.caption, "description")}
        <i>${notice.inspectionDate ? `Taken ${escapeHtml(shortDate(notice.inspectionDate))} — ` : ""}${escapeHtml(notice.address)}</i>
      </p>
    </div>`).join("")}
  </div>
  <footer>${MANAGER.name} &bull; ${MANAGER.phone} &bull; ${MANAGER.email}</footer>
</div>`}

<script>
  // Wait for the logo, the photos and the webfonts, so the PDF has all three.
  function go(){ setTimeout(function(){ window.focus(); window.print(); }, 400); }
  if (document.readyState === "complete") go(); else window.addEventListener("load", go);
</script>
</body></html>`;
}

/** Opens the letter in its own window and calls up the print dialog. */
export function printFineNotice(
  notice: FineNotice,
  opts: { signer: string; entities: BillingEntity[]; photos: ExhibitPhoto[] },
): boolean {
  const w = window.open("", "_blank", "width=920,height=1150");
  if (!w) return false;
  w.document.write(
    fineNoticeHtml(notice, {
      ...opts,
      // Absolute, so the logo resolves inside the about:blank print window.
      logoUrl: `${window.location.origin}/images/unitylogo.png`,
    }),
  );
  w.document.close();
  return true;
}
