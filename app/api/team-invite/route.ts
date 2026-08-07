import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { isStaffRole, canManageStaff } from "@/lib/admin-portal/permissions";
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

  let body: { name?: string; email?: string; role?: string; phone?: string };
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
      ...(phone ? { phone } : {}),
    });
  if (profileErr) {
    return NextResponse.json(
      { error: `Account created but profile setup failed: ${profileErr.message}` },
      { status: 500 },
    );
  }

  const { error: employeeErr } = await service
    .from("employees")
    .insert({ name, email, role, active: true, ...(phone ? { phone } : {}) });
  if (employeeErr) {
    return NextResponse.json(
      { error: `Account created but employee record failed: ${employeeErr.message}` },
      { status: 500 },
    );
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3001";
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
      `Unity Grid Management: your admin portal account is ready. Check ${email} for your sign-in details.`,
    );
    if ("error" in smsResult) smsError = smsResult.error;
  }

  const emailError = "error" in emailResult ? emailResult.error : undefined;
  // The account exists either way; surface delivery failures so the admin
  // can resend or share credentials another way.
  return NextResponse.json({
    ok: true,
    ...(emailError ? { emailError } : {}),
    ...(smsError ? { smsError } : {}),
  });
}
