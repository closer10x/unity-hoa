import "server-only";

import { randomBytes } from "node:crypto";

import {
  PROFILE_AVATARS_BUCKET,
  WORK_ORDER_IMAGES_BUCKET,
  createServiceClient,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

/**
 * Crew links: one tokenised, login-free job board per field employee.
 *
 * The token IS the credential, so it carries 32 bytes of entropy, is never
 * derived from the employee's name or id, and every read goes through
 * `resolveCrewLink` — which is the only place a token is exchanged for an
 * employee. Nothing else in the app should query `crew_links` by token.
 *
 * Access is deliberately narrow: a valid token exposes that one employee's
 * assigned work orders and nothing else. No owner records, no financials, no
 * portal.
 */

export type CrewJob = {
  id: string;
  ref: string;
  title: string;
  description: string | null;
  location: string | null;
  priority: string;
  status: string;
  dueAt: string | null;
  assignedAt: string | null;
  /** Set once the tech closes it; null while the job is still open. */
  completedAt: string | null;
  /** Closed jobs stay on the board briefly so the tech can see their work. */
  done: boolean;
  /** Set while the job is on hold — what the tech is waiting on. */
  pendingReason: string | null;
  /** Who put this job on the tech's list. */
  assignedBy: string | null;
  notes: { id: string; body: string; author: string; at: string }[];
  photoCount: number;
  /** Signed thumbnails, newest first — what's already been documented. */
  photos: { id: string; url: string; at: string }[];
};

/**
 * What a valid token found at the other end.
 *
 * "Switched off" is kept apart from "gone" because the two need different
 * answers. A tech holding a real link whose account was switched off used to
 * get the same 404 as somebody guessing tokens — so the tech reads it as a
 * broken link, calls the office, and the office reissues a link that 404s in
 * exactly the same way. Telling the holder of an already-valid token that
 * their account is off gives nothing away and ends that loop.
 */
export type CrewBoardResult =
  | { state: "ok"; board: CrewBoard }
  | { state: "switched-off"; name: string }
  | { state: "gone" };

export type CrewBoard = {
  employee: {
    id: string;
    name: string;
    role: string | null;
    /** Signed URL for their profile photo, when one is on file. */
    photoUrl: string | null;
  };
  jobs: CrewJob[];
};

const OPEN_STATUSES = ["open", "assigned", "in_progress", "pending"];
const DONE_STATUSES = ["completed", "cancelled"];

/** How long a finished job stays visible on the tech's list. */
const DONE_WINDOW_DAYS = 14;

/** 43 URL-safe characters. Long enough that guessing is not a threat model. */
export function newCrewToken(): string {
  return randomBytes(32).toString("base64url");
}

/* The roles that get a crew link the moment they exist. Defined in a
   client-safe module so the office screens can ask the same question, and
   re-exported here for everything that already imports it from the crew. */
export { FIELD_ROLES, isFieldRole } from "./roles";

/**
 * Product rule: a field employee always has a job board.
 *
 * Called wherever a field employee comes into existence, so a tech is never
 * created without somewhere to see their work. Idempotent — the table allows
 * one live link per employee, so a repeat call returns the existing token
 * rather than minting a second one.
 */
export async function ensureCrewLink(
  employeeId: string,
  createdBy?: string | null,
): Promise<{ token: string } | null> {
  if (!isSupabaseConfigured()) return null;
  const db = createServiceClient();

  const { data: existing } = await db
    .from("crew_links")
    .select("token")
    .eq("employee_id", employeeId)
    .is("revoked_at", null)
    .maybeSingle();
  if (existing?.token) return { token: existing.token as string };

  const token = newCrewToken();
  const { error } = await db
    .from("crew_links")
    .insert({ employee_id: employeeId, token, created_by: createdBy ?? null });
  // A race on the one-live-link index means someone else just made it.
  if (error) {
    const { data: raced } = await db
      .from("crew_links")
      .select("token")
      .eq("employee_id", employeeId)
      .is("revoked_at", null)
      .maybeSingle();
    return raced?.token ? { token: raced.token as string } : null;
  }
  return { token };
}

/**
 * Exchanges a token for its employee, or null. Rejects revoked and expired
 * links. Records `last_used_at` so a stale link can be spotted and pulled.
 */
export async function resolveCrewLink(
  token: string,
): Promise<{ id: string; employee_id: string } | null> {
  if (!isSupabaseConfigured()) return null;
  const clean = token.trim();
  // Cheap guard before touching the database.
  if (clean.length < 20 || clean.length > 200) return null;

  const db = createServiceClient();
  const { data, error } = await db
    .from("crew_links")
    .select("id, employee_id, revoked_at, expires_at")
    .eq("token", clean)
    .maybeSingle();

  if (error || !data) return null;
  if (data.revoked_at) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;

  await db
    .from("crew_links")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return { id: data.id, employee_id: data.employee_id };
}

/**
 * A signed URL for the tech's profile photo, or null.
 *
 * Staff photos live on profiles.avatar_path; employees carry no profile
 * link, so they are matched on the work email the account was invited with.
 * Any miss — no email, no account, no photo — is simply null, and the board
 * falls back to their initials.
 */
async function employeePhotoUrl(
  db: ReturnType<typeof createServiceClient>,
  email: string | null,
): Promise<string | null> {
  if (!email?.trim()) return null;
  try {
    const { data: page } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const account = page?.users?.find(
      (u) => u.email?.toLowerCase() === email.trim().toLowerCase(),
    );
    if (!account) return null;

    const { data: profile } = await db
      .from("profiles")
      .select("avatar_path")
      .eq("id", account.id)
      .maybeSingle();
    const path = profile?.avatar_path as string | null | undefined;
    if (!path) return null;

    const { data: signed } = await db.storage
      .from(PROFILE_AVATARS_BUCKET)
      .createSignedUrl(path, 60 * 60);
    return signed?.signedUrl ?? null;
  } catch {
    // A photo is decoration; never let it take the job list down.
    return null;
  }
}

/** The board for a resolved link: the employee plus their open jobs. */
export async function loadCrewBoard(employeeId: string): Promise<CrewBoardResult> {
  if (!isSupabaseConfigured()) return { state: "gone" };
  const db = createServiceClient();

  const { data: emp } = await db
    .from("employees")
    .select("id, name, role, email, active")
    .eq("id", employeeId)
    .maybeSingle();
  if (!emp) return { state: "gone" };
  if (emp.active === false) return { state: "switched-off", name: emp.name ?? "" };

  const { data: rows } = await db
    .from("work_orders")
    .select("*")
    .eq("assigned_to", employeeId)
    .order("due_at", { ascending: true, nullsFirst: false });

  // Open jobs, plus recently closed ones — a tech should be able to see
  // what they finished today, and when, not just what is left.
  const cutoff = Date.now() - DONE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const jobs = (rows ?? []).filter((w) => {
    if (OPEN_STATUSES.includes(w.status)) return true;
    if (!DONE_STATUSES.includes(w.status)) return false;
    const at = w.completed_at ?? w.updated_at;
    return at ? new Date(at).getTime() >= cutoff : false;
  });
  // Open work first (the query already ordered it by due date); finished
  // jobs fall to the bottom, most recently closed first.
  jobs.sort((a, b) => {
    const aDone = DONE_STATUSES.includes(a.status) ? 1 : 0;
    const bDone = DONE_STATUSES.includes(b.status) ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    if (!aDone) return 0;
    return String(b.completed_at ?? "").localeCompare(String(a.completed_at ?? ""));
  });

  const ids = jobs.map((w) => w.id);

  const [notesRes, attRes] = await Promise.all([
    ids.length
      ? db
          .from("work_order_notes")
          .select("*")
          .in("work_order_id", ids)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as unknown[] }),
    ids.length
      ? db
          .from("work_order_attachments")
          .select("id, work_order_id, storage_path, created_at")
          .in("work_order_id", ids)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const notesBy = new Map<string, CrewJob["notes"]>();
  for (const n of (notesRes.data ?? []) as {
    id: string;
    work_order_id: string;
    body: string;
    author_name: string;
    created_at: string;
  }[]) {
    const list = notesBy.get(n.work_order_id) ?? [];
    list.push({
      id: n.id,
      body: n.body,
      author: n.author_name,
      at: new Date(n.created_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
    });
    notesBy.set(n.work_order_id, list);
  }

  // Signed in one batch: the bucket is private, so a thumbnail needs a URL
  // the browser can actually fetch. A failure just means no thumbnail.
  const photosBy = new Map<string, CrewJob["photos"]>();
  const atts = (attRes.data ?? []) as {
    id: string;
    work_order_id: string;
    storage_path: string;
    created_at: string;
  }[];
  if (atts.length) {
    const { data: signed } = await db.storage
      .from(WORK_ORDER_IMAGES_BUCKET)
      .createSignedUrls(atts.map((a) => a.storage_path), 60 * 60);
    const urlByPath = new Map(
      (signed ?? []).map((r) => [r.path ?? "", r.signedUrl ?? ""]),
    );
    for (const a of atts) {
      const url = urlByPath.get(a.storage_path);
      if (!url) continue;
      const list = photosBy.get(a.work_order_id) ?? [];
      list.push({
        id: a.id,
        url,
        at: new Date(a.created_at).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }),
      });
      photosBy.set(a.work_order_id, list);
    }
  }

  return {
    state: "ok",
    board: {
    employee: {
      id: emp.id,
      name: emp.name,
      role: emp.role,
      photoUrl: await employeePhotoUrl(db, emp.email),
    },
    jobs: jobs.map((w) => ({
      id: w.id,
      ref: w.work_order_number ?? w.id.slice(0, 8),
      title: w.title ?? "Untitled",
      description: w.description ?? null,
      location: w.location ?? null,
      priority: w.priority ?? "normal",
      status: w.status ?? "open",
      dueAt: w.due_at ?? null,
      assignedAt: w.assigned_at ?? null,
      completedAt: w.completed_at ?? null,
      done: DONE_STATUSES.includes(w.status),
      pendingReason: w.pending_reason ?? null,
      // The portal stamps changes to the notification feed rather than the
      // work order, so there is no per-row "assigned by" column yet.
      assignedBy: null,
      notes: notesBy.get(w.id) ?? [],
      photos: photosBy.get(w.id) ?? [],
      photoCount: (photosBy.get(w.id) ?? []).length,
    })),
    },
  };
}
