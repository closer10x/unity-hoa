import { NextResponse } from "next/server";

import { getEmailBaseUrl } from "@/lib/email/link-base-url";
import { sendHouseholdInviteViaResend } from "@/lib/email/send-household-invite";
import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { requireServiceSupabase } from "@/lib/supabase/service";
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

  // An invite has to create the account it invites to — without this the
  // recipient lands on a sign-in page for an account that doesn't exist,
  // and "Forgot password?" has nothing to reset.
  const service = requireServiceSupabase();
  const { data: invited, error: inviteErr } = await service.auth.admin.generateLink({
    type: "invite",
    email,
    options: { data: { display_name: name } },
  });

  let hashedToken = invited?.properties?.hashed_token;
  if (inviteErr || !hashedToken) {
    // Already has an account (a second household, or a re-invite): send a
    // fresh sign-in link for the existing one rather than failing.
    const { data: link, error: linkErr } = await service.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkErr || !link?.properties?.hashed_token) {
      return NextResponse.json(
        { error: inviteErr?.message ?? "Could not create the invite." },
        { status: 502 },
      );
    }
    hashedToken = link.properties.hashed_token;
  } else {
    // New account: give it a resident profile so the portal guard admits it.
    await service
      .from("profiles")
      .upsert({ id: invited.user.id, role: "basic", display_name: name }, { onConflict: "id" });
  }

  // Never NEXT_PUBLIC_SITE_URL: that is localhost on a dev server, and the
  // recipient opens this on their own device. The token is verified by
  // /auth/confirm server-side, which then sends them to choose a password.
  const inviteUrl =
    `${getEmailBaseUrl()}/auth/confirm` +
    `?token_hash=${encodeURIComponent(hashedToken)}&type=invite&next=/portal`;

  const result = await sendHouseholdInviteViaResend({
    name,
    email,
    inviterName,
    property,
    access,
    portalUrl: inviteUrl,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
