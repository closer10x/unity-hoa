import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import {
  ALL_SECTIONS,
  SECTION_ACCESS,
  canManageStaff,
  isStaffRole,
} from "@/lib/admin-portal/permissions";
import { ensureCrewLink, isFieldRole } from "@/lib/crew/links";
import { sendWelcomeEmailViaResend } from "@/lib/email/send-welcome-email";
import { sendSms } from "@/lib/sms/send-sms";
import { isSupabaseAuthConfigured } from "@/lib/supabase/keys";
import { requireServiceSupabase } from "@/lib/supabase/service";
import { createSupabaseServerClient } from "@/lib/supabase/server-user";

/**
 * Invite a team member: create their auth account with an auto-generated
 * temporary password, grant portal access, record them as an employee, and
 * email them their credentials. Admin-only.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateTempPassword(): string {
  // 12 chars, URL-safe alphabet — comfortably above GoTrue's minimum and
  // meant to be replaced at first sign-in.
  return randomBytes(9).toString("base64url");
}

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
  const tempPassword = generateTempPassword();

  const { data: created, error: createErr } =
    await service.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { display_name: name, staff_role: role },
    });
  if (createErr || !created?.user) {
    return NextResponse.json(
      { error: createErr?.message ?? "Could not create the account." },
      { status: 409 },
    );
  }

  // Portal access + display name + staff_role (drives section permissions)
  // + cell for SMS notifications.
  const { error: profileErr } = await service
    .from("profiles")
    .upsert({
      id: created.user.id,
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

  const { data: employee, error: employeeErr } = await service
    .from("employees")
    .insert({ name, email, role, active: true, communities, ...(phone ? { phone } : {}) })
    .select("id")
    .single();
  if (employeeErr) {
    return NextResponse.json(
      { error: `Account created but employee record failed: ${employeeErr.message}` },
      { status: 500 },
    );
  }

  // TODO: swap for the shared outbound-link base once fix/resident-signup
  // lands — on a dev server this is localhost, which is dead in a text.
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3001";

  // Product rule: a field employee always has a job board. Minting the link
  // here means a tech can never exist without somewhere to see their work,
  // and nobody has to remember a second step.
  let crewUrl: string | undefined;
  if (isFieldRole(role) && employee?.id) {
    const link = await ensureCrewLink(employee.id as string, created.user.id);
    if (link) crewUrl = `${siteUrl}/crew/${link.token}`;
  }

  const emailResult = await sendWelcomeEmailViaResend({
    name,
    email,
    role,
    tempPassword,
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
