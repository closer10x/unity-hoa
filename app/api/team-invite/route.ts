import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { sendWelcomeEmailViaResend } from "@/lib/email/send-welcome-email";
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

async function callerIsAdmin(): Promise<boolean> {
  if (!isSupabaseAuthConfigured()) return false;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  return profile?.role === "admin";
}

export async function POST(req: Request) {
  if (!(await callerIsAdmin())) {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  let body: { name?: string; email?: string; role?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const role = body.role?.trim() ?? "";
  if (!name || !EMAIL_RE.test(email) || !role) {
    return NextResponse.json(
      { error: "Name, a valid work email and a role are required." },
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

  // Portal access + display name. Staff sign in through the admin portal, so
  // their profile role is "admin"; the finer staff role lives in employees.
  const { error: profileErr } = await service
    .from("profiles")
    .upsert({ id: created.user.id, role: "admin", display_name: name });
  if (profileErr) {
    return NextResponse.json(
      { error: `Account created but profile setup failed: ${profileErr.message}` },
      { status: 500 },
    );
  }

  const { error: employeeErr } = await service
    .from("employees")
    .insert({ name, email, role, active: true });
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

  if ("error" in emailResult) {
    // The account exists; surface the delivery failure so the admin can
    // resend or share credentials another way.
    return NextResponse.json({ ok: true, emailError: emailResult.error });
  }
  return NextResponse.json({ ok: true });
}
