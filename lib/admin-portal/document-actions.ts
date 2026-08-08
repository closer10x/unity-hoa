"use server";

import { revalidatePath } from "next/cache";

import { requireAdminUser } from "@/lib/auth/require-admin";
import { requireServiceSupabase } from "@/lib/supabase/service";

/**
 * Publishing is what decides whether residents can see a document, so it is
 * carried by the access level the resident portal actually reads — not by a
 * badge in the office UI. Published means residents (or the public) can open
 * it; a draft is manager-only.
 */

type Fail = { ok: false; error: string };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function officeContext() {
  const session = await requireAdminUser();
  if (session.profile.role !== "admin") {
    throw new Error("Only staff can change documents.");
  }
  const db = requireServiceSupabase();
  const actorName =
    session.profile.display_name?.trim() || session.user.email || "Staff";
  const actorId = UUID_RE.test(session.user.id) ? session.user.id : null;
  return { db, actorName, actorId };
}

export async function setDocumentPublished(input: {
  id: string;
  title: string;
  published: boolean;
}): Promise<{ ok: true; published: boolean } | Fail> {
  try {
    const { db, actorName, actorId } = await officeContext();

    const { data: current, error: readErr } = await db
      .from("documents")
      .select("access_level")
      .eq("id", input.id)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!current) return { ok: false, error: "That document is no longer on file." };

    // A document already public to the world stays public when republished;
    // everything else lands at resident level.
    const nextAccess = input.published
      ? current.access_level === "public"
        ? "public"
        : "resident"
      : "manager_only";

    const { error } = await db
      .from("documents")
      .update({ access_level: nextAccess, is_archived: false })
      .eq("id", input.id);
    if (error) throw new Error(error.message);

    const { error: auditErr } = await db.from("admin_audit_log").insert({
      action: `Documents: ${input.published ? "published" : "unpublished"} ${input.title}${
        input.published ? ` (${nextAccess === "public" ? "public" : "residents"})` : ""
      }`,
      actor_name: actorName,
      actor_user_id: actorId,
    });
    if (auditErr) throw new Error(`Audit write failed: ${auditErr.message}`);

    revalidatePath("/admin");
    revalidatePath("/portal");
    return { ok: true, published: input.published };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Something went wrong." };
  }
}
