import { requireServiceSupabase } from "@/lib/supabase/service";
import { runDueAnnouncements } from "@/lib/admin-portal/announcement-send";

/**
 * The scheduled-announcement sweep. Vercel Cron hits this on a timer (see
 * vercel.json) and it sends every announcement whose scheduled_for has passed.
 *
 * Vercel injects `Authorization: Bearer <CRON_SECRET>` on its cron requests
 * whenever a CRON_SECRET env var is set, so we require it — nothing else can
 * trigger a send by guessing the URL. Without the secret configured the route
 * refuses to run rather than sending unauthenticated.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return Response.json(
      { ok: false, error: "CRON_SECRET is not configured." },
      { status: 503 },
    );
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = requireServiceSupabase();
    const result = await runDueAnnouncements(db);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "The sweep failed." },
      { status: 500 },
    );
  }
}
