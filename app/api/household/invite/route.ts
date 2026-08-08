import { NextResponse } from "next/server";

import { sendHouseholdInviteViaResend } from "@/lib/email/send-household-invite";
import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

/**
 * Emails a household-member invite. Gated to a signed-in resident: the
 * inviter is the session user, so a stranger can't spray invites, and the
 * "from whom" line can't be spoofed by the client.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  if (!isSupabaseAuthConfigured()) {
    return NextResponse.json(
      { error: "Email delivery isn't configured yet." },
      { status: 503 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 403 });
  }

  let body: {
    name?: string;
    email?: string;
    property?: string;
    access?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const property = body.property?.trim() || "your household";
  const access = body.access?.trim() || "Portal access";
  if (!name || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "A name and a valid email are required to send an invite." },
      { status: 400 },
    );
  }

  // The inviter's own name, read from their profile (fall back to their email).
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  const inviterName =
    profile?.display_name?.trim() || user.email || "A household member";

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3001";

  const result = await sendHouseholdInviteViaResend({
    name,
    email,
    inviterName,
    property,
    access,
    portalUrl: `${siteUrl}/portal/login`,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
