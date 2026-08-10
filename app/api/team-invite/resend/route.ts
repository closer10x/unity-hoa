import { NextResponse } from "next/server";

import { canManageStaff, isStaffRole } from "@/lib/admin-portal/permissions";
import { getEmailBaseUrl } from "@/lib/email/link-base-url";
import { buildConfirmUrl, mintSetPasswordUrl } from "@/lib/email/set-password-link";
import { sendWelcomeEmailViaResend } from "@/lib/email/send-welcome-email";
import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { requireServiceSupabase } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

/**
 * Resend a staff invitation: mint a fresh "choose your password" link and
 * email it again. Administrator-only, like the original invite.
 *
 * A resend is what an Administrator reaches for precisely when someone can't
 * get in — the link expired, the mail never arrived, the account predates
 * this flow — so it always sends a link that sets a password, never the
 * "your existing password still works" note. It changes nothing about the
 * account until the recipient follows the link.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function callerMayInvite(): Promise<boolean> {
  if (!isSupabaseAuthConfigured()) return false;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, staff_role")
    .eq("id", user.id)
    .maybeSingle();
  return (
    profile?.role === "admin" &&
    canManageStaff(profile.staff_role as string | null)
  );
}

export async function POST(req: Request) {
  if (!(await callerMayInvite())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase() ?? "";
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "A valid work email is required." },
      { status: 400 },
    );
  }

  const service = requireServiceSupabase();

  /* Name and role come from the roster, not the client: a resend shouldn't
     be able to rewrite who somebody is. */
  const { data: employee } = await service
    .from("employees")
    .select("name, role")
    .eq("email", email)
    .maybeSingle();
  const name = (employee?.name as string | undefined)?.trim() || "";
  const roleRaw = (employee?.role as string | undefined)?.trim() ?? "";
  const role = isStaffRole(roleRaw) ? roleRaw : "team member";

  let setPasswordUrl = await mintSetPasswordUrl(service, email, "admin");

  /* No account to recover — the roster row outlived the auth user, or the
     original invite never created one. Mint the account now so the resend
     does what it says rather than reporting a dead end. */
  if (!setPasswordUrl) {
    const { data: invited, error: inviteErr } =
      await service.auth.admin.generateLink({
        type: "invite",
        email,
        options: { data: { display_name: name, staff_role: roleRaw } },
      });
    const hashedToken = invited?.properties?.hashed_token;
    if (!invited?.user || !hashedToken) {
      return NextResponse.json(
        {
          error:
            inviteErr?.message ??
            "Could not create a sign-in link for that address.",
        },
        { status: 502 },
      );
    }
    setPasswordUrl = buildConfirmUrl(hashedToken, "invite", "admin");
    // A new auth user needs the profile row the admin guard reads, or the
    // link lands them on a portal that turns them away.
    await service.from("profiles").upsert(
      {
        id: invited.user.id,
        role: "admin",
        ...(isStaffRole(roleRaw) ? { staff_role: roleRaw } : {}),
        ...(name ? { display_name: name } : {}),
      },
      { onConflict: "id" },
    );
  }

  const result = await sendWelcomeEmailViaResend({
    name,
    email,
    role,
    setPasswordUrl,
    loginUrl: `${getEmailBaseUrl()}/admin/login`,
  });
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
