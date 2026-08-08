"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { requireServiceSupabase } from "@/lib/supabase/service";

import type { LegalCase, LegalStage } from "./types";

/**
 * Legal matters, persisted. Opening a matter and every stage change writes the
 * database and stamps the audit trail. Lien, suit and foreclosure carry real
 * consequences for an owner's title, so the stage change is refused unless the
 * board vote that authorized it is recorded on the row.
 */

type Fail = { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STAGES: LegalStage[] = [
  "Referred to counsel", "Lien filed", "Suit filed", "Judgment",
  "Foreclosure scheduled", "Payment plan", "Closed",
];

/** The stages LEGAL_STEPS describes as needing the board's authorization. */
const VOTE_REQUIRED: LegalStage[] = ["Lien filed", "Suit filed", "Foreclosure scheduled"];

async function legalContext() {
  const session = await requireAdminUser();
  if (session.profile.role !== "admin") {
    throw new Error("Only staff can manage legal matters.");
  }
  const db = requireServiceSupabase();
  const actorName =
    session.profile.display_name?.trim() || session.user.email || "Staff";
  const actorId = UUID_RE.test(session.user.id) ? session.user.id : null;
  return { db, actorName, actorId };
}

async function audit(
  db: ReturnType<typeof requireServiceSupabase>,
  actorName: string,
  actorId: string | null,
  action: string,
) {
  const { error } = await db.from("admin_audit_log").insert({
    action,
    actor_name: actorName,
    actor_user_id: actorId,
  });
  if (error) throw new Error(`Audit write failed: ${error.message}`);
}

type CaseRow = {
  id: string;
  owner_name: string;
  address: string | null;
  balance_cents: number | null;
  stage: string | null;
  counsel: string | null;
  board_vote_on: string | null;
};

const usdExact = (cents: number) =>
  (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

/** Same shape the loader produces, so the row re-renders identically. */
function toCase(c: CaseRow): LegalCase {
  return {
    id: c.id,
    owner: c.owner_name,
    address: c.address ?? "—",
    balance: usdExact(c.balance_cents ?? 0),
    stage: (STAGES.includes(c.stage as LegalStage) ? c.stage : "Referred to counsel") as LegalStage,
    counsel: c.counsel ?? "Not assigned",
    boardVoteOn: c.board_vote_on ?? null,
  };
}

const dateLabel = (d: string) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  });

export async function createLegalCase(input: {
  ownerName: string;
  address: string;
  /** Outstanding balance in cents; 0 opens the matter at nothing owed. */
  balanceCents: number;
  stage: string;
  counsel: string;
}): Promise<{ ok: true; legalCase: LegalCase } | Fail> {
  try {
    const { db, actorName, actorId } = await legalContext();

    const ownerName = input.ownerName.trim();
    if (!ownerName) return { ok: false, error: "Whose matter is this? Add the owner's name." };

    const stage = STAGES.find((st) => st === input.stage);
    if (!stage) return { ok: false, error: "Pick the stage this matter opens at." };

    // Opening straight into a lien, suit or foreclosure would skip the vote
    // check below; those stages are reached through the action dropdown.
    if (VOTE_REQUIRED.includes(stage)) {
      return {
        ok: false,
        error: `Open the matter first, then move it to "${stage}" from the action menu — that step needs the board vote date.`,
      };
    }

    const cents = Math.round(input.balanceCents);
    if (!Number.isFinite(cents) || cents < 0) {
      return { ok: false, error: "Enter the balance as a dollar amount, or leave it blank." };
    }

    const { data, error } = await db
      .from("legal_cases")
      .insert({
        owner_name: ownerName,
        address: input.address.trim() || null,
        balance_cents: cents,
        stage,
        counsel: input.counsel.trim() || null,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    await audit(
      db, actorName, actorId,
      `Legal: opened a matter for ${ownerName} at ${stage} — ${usdExact(cents)} outstanding`,
    );

    revalidatePath("/admin");
    return { ok: true, legalCase: toCase(data as CaseRow) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export async function setLegalStage(input: {
  id: string;
  stage: string;
  /** ISO date of the board vote; required for lien, suit and foreclosure. */
  boardVoteOn?: string;
}): Promise<{ ok: true; legalCase: LegalCase } | Fail> {
  try {
    const { db, actorName, actorId } = await legalContext();

    const stage = STAGES.find((st) => st === input.stage);
    if (!stage) return { ok: false, error: "That isn't a valid stage for a legal matter." };

    const { data: existing, error: getErr } = await db
      .from("legal_cases")
      .select("*")
      .eq("id", input.id)
      .maybeSingle();
    if (getErr) throw new Error(getErr.message);
    if (!existing) return { ok: false, error: "That matter no longer exists." };

    const update: Record<string, unknown> = { stage };

    if (VOTE_REQUIRED.includes(stage)) {
      const voted = (input.boardVoteOn ?? "").trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(voted)) {
        return {
          ok: false,
          error: `"${stage}" needs the date the board voted to authorize it. Add that date before you confirm — it goes on the record with this change.`,
        };
      }
      if (new Date(`${voted}T12:00:00Z`).getTime() > Date.now()) {
        return { ok: false, error: "The board vote date can't be in the future." };
      }
      update.board_vote_on = voted;
    }

    if (stage === "Closed") update.closed_on = new Date().toISOString().slice(0, 10);

    const { data, error } = await db
      .from("legal_cases")
      .update(update)
      .eq("id", input.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const voteNote = update.board_vote_on
      ? ` — board vote recorded ${dateLabel(update.board_vote_on as string)}`
      : "";
    await audit(
      db, actorName, actorId,
      `Legal: ${existing.owner_name} — ${existing.stage ?? "Referred to counsel"} → ${stage}${voteNote}`,
    );

    revalidatePath("/admin");
    return { ok: true, legalCase: toCase(data as CaseRow) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
