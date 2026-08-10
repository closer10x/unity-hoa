import { NextResponse } from "next/server";

import {
  ALL_SECTIONS,
  SECTION_ACCESS,
  canManageStaff,
  isStaffRole,
} from "@/lib/admin-portal/permissions";
import { ensureCrewLink, isFieldRole } from "@/lib/crew/links";
import { getEmailBaseUrl } from "@/lib/email/link-base-url";
import { buildConfirmUrl, mintSetPasswordUrl } from "@/lib/email/set-password-link";
import { sendStaffAccessEmail } from "@/lib/email/send-staff-access-email";
import { sendWelcomeEmailViaResend } from "@/lib/email/send-welcome-email";
import { sendSms } from "@/lib/sms/send-sms";
import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { requireServiceSupabase } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

/**
 * Invite a team member: create their auth account, grant portal access,
 * record them as an employee, and email them a one-time link that lands on
 * "choose your password". Admin-only.
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
  // Portal access plus the Administrator staff role (only Administrators
  // manage staff accounts). Null staff_role = account predating roles.
  return (
    profile?.role === "admin" &&
    canManageStaff(profile.staff_role as string | null)
  );
}

export async function POST(req: Request) {
  if (!(await callerMayInvite())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: {
    name?: string;
    email?: string;
    role?: string;
    phone?: string;
    sections?: string[];
    communities?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const role = body.role?.trim() ?? "";
  const phone = body.phone?.trim() ?? "";
  if (!name || !EMAIL_RE.test(email) || !isStaffRole(role)) {
    return NextResponse.json(
      { error: "Name, a valid work email and a valid role are required." },
      { status: 400 },
    );
  }
  if (phone && !/^[\d\s()+.-]{7,20}$/.test(phone)) {
    return NextResponse.json(
      { error: "The cell number doesn't look like a phone number." },
      { status: 400 },
    );
  }

  // Custom section access: keep only known ids, and store null when the
  // checked set matches the role's default so the role stays the source of
  // truth until someone deliberately customizes.
  const requested = (body.sections ?? []).filter((s) =>
    (ALL_SECTIONS as readonly string[]).includes(s),
  );
  const roleDefault = isStaffRole(role) ? SECTION_ACCESS[role] : [];
  const isDefault =
    requested.length === roleDefault.length &&
    roleDefault.every((s) => requested.includes(s));
  const sectionAccess = requested.length && !isDefault ? requested : null;
  const communities = (body.communities ?? []).filter(
    (c) => typeof c === "string" && c.length < 80,
  );

  const service = requireServiceSupabase();

  /* The address may already have an account — a resident, or someone on a
     household — and being given office access should promote that account,
     not collide with it.

     A genuinely new account is created by the invite link itself, so the new
     hire never receives a password somebody else generated: they follow the
     link and choose one in the browser. */
  let userId: string | null = null;
  let setPasswordUrl: string | null = null;

  const { data: invited, error: inviteErr } =
    await service.auth.admin.generateLink({
      type: "invite",
      email,
      options: { data: { display_name: name, staff_role: role } },
    });

  const invitedHash = invited?.properties?.hashed_token;
  if (invited?.user && invitedHash) {
    userId = invited.user.id;
    setPasswordUrl = buildConfirmUrl(invitedHash, "invite", "admin");
  } else {
    const { data: existing } = await service.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const prior = existing?.users.find((u) => u.email?.toLowerCase() === email);
    userId = prior?.id ?? null;
    if (!userId) {
      return NextResponse.json(
        { error: inviteErr?.message ?? "Could not create the account." },
        { status: 409 },
      );
    }
    await service.auth.admin.updateUserById(userId, {
      user_metadata: { display_name: name, staff_role: role },
    });
    /* An existing account gets a set-password link too, not a note saying
       their old password still works. Being invited is the moment someone
       expects to be let in, and the address is usually one that already has
       a half-finished account — a resident invite never completed, or one
       minted by the old temporary-password flow — so "use the password you
       already have" points at a password nobody knows. The link is optional
       to follow: ignore it and the existing password still works. */
    setPasswordUrl = await mintSetPasswordUrl(service, email, "admin");
  }

  // Portal access + display name + staff_role (drives section permissions)
  // + cell for SMS notifications.
  const { error: profileErr } = await service
    .from("profiles")
    .upsert({
      id: userId,
      role: "admin",
      staff_role: role,
      display_name: name,
      section_access: sectionAccess,
      communities,
      ...(phone ? { phone } : {}),
    });
  if (profileErr) {
    return NextResponse.json(
      { error: `Account created but profile setup failed: ${profileErr.message}` },
      { status: 500 },
    );
  }

  /* Re-inviting someone already on the roster updates their record rather
     than adding a second row for the same person. */
  const { data: priorEmployee } = await service
    .from("employees")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  const { data: employee, error: employeeErr } = priorEmployee
    ? await service
        .from("employees")
        .update({ name, role, active: true, communities, ...(phone ? { phone } : {}) })
        .eq("id", priorEmployee.id)
        .select("id")
        .single()
    : await service
        .from("employees")
        .insert({ name, email, role, active: true, communities, ...(phone ? { phone } : {}) })
        .select("id")
        .single();
  if (employeeErr) {
    return NextResponse.json(
      { error: `Account ready but the roster record failed: ${employeeErr.message}` },
      { status: 500 },
    );
  }

  // The recipient opens both of these on their own device, so they must
  // never carry a dev server's localhost.
  const siteUrl = getEmailBaseUrl();

  // Product rule: a field employee always has a job board. Minting the link
  // here means a tech can never exist without somewhere to see their work,
  // and nobody has to remember a second step.
  let crewUrl: string | undefined;
  if (isFieldRole(role) && employee?.id) {
    const link = await ensureCrewLink(employee.id as string, userId);
    if (link) crewUrl = `${siteUrl}/crew/${link.token}`;
  }

  /* Someone who already signs in keeps their password, so the email tells
     them what changed rather than sending them to reset something that
     works. Everyone else gets the link that lets them pick one. */
  const emailResult = setPasswordUrl
    ? await sendWelcomeEmailViaResend({
        name,
        email,
        role,
        setPasswordUrl,
        loginUrl: `${siteUrl}/admin/login`,
      })
    : await sendStaffAccessEmail({
        name,
        email,
        role,
        loginUrl: `${siteUrl}/admin/login`,
      });

  // Heads-up text when a cell was given. Credentials stay email-only; the
  // SMS just points at the inbox. Failures never block the invite.
  let smsError: string | undefined;
  if (phone) {
    const smsResult = await sendSms(
      phone,
      crewUrl
        ? `Unity Grid Management: your job board is ${crewUrl} — open it on your phone, no sign-in needed. Portal sign-in details are in your email at ${email}.`
        : `Unity Grid Management: your admin portal account is ready. Check ${email} for your sign-in details.`,
    );
    if ("error" in smsResult) smsError = smsResult.error;
  }

  const emailError = "error" in emailResult ? emailResult.error : undefined;
  // The account exists either way; surface delivery failures so the admin
  // can resend or share credentials another way.
  return NextResponse.json({
    ok: true,
    // Returned so the Team screen can show and copy it — a tech without a
    // phone on file still needs the office to be able to hand it over.
    ...(crewUrl ? { crewUrl } : {}),
    ...(emailError ? { emailError } : {}),
    ...(smsError ? { smsError } : {}),
  });
}
