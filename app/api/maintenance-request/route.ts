import { sendMaintenanceRequestViaResend } from "@/lib/email/send-maintenance-request-email";
import {
  MAINTENANCE_COMMUNITIES,
  MAINTENANCE_COMMON_AREAS,
} from "@/lib/maintenance-request/options";

const MAX = {
  street: 200,
  details: 4000,
  name: 120,
  phone: 40,
  email: 200,
};

function isAllowed(value: string, allowed: readonly { value: string }[]) {
  return allowed.some((a) => a.value === value);
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!json || typeof json !== "object") {
    return Response.json({ error: "Invalid payload." }, { status: 400 });
  }

  const body = json as Record<string, unknown>;

  if (typeof body.website === "string" && body.website.trim() !== "") {
    return Response.json({ ok: true });
  }

  const community = String(body.community ?? "").trim();
  const location = String(body.location ?? "").trim();
  const street = String(body.street ?? "").trim();
  const details = String(body.details ?? "").trim();
  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const email = String(body.email ?? "").trim();

  if (!community || !isAllowed(community, MAINTENANCE_COMMUNITIES)) {
    return Response.json({ error: "Please choose a community." }, { status: 400 });
  }
  if (!location || !isAllowed(location, MAINTENANCE_COMMON_AREAS)) {
    return Response.json({ error: "Please choose a location." }, { status: 400 });
  }
  if (!name) {
    return Response.json({ error: "Name is required." }, { status: 400 });
  }
  if (!phone) {
    return Response.json({ error: "Phone number is required." }, { status: 400 });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (street.length > MAX.street || details.length > MAX.details) {
    return Response.json({ error: "One or more fields are too long." }, { status: 400 });
  }
  if (name.length > MAX.name || phone.length > MAX.phone || email.length > MAX.email) {
    return Response.json({ error: "One or more fields are too long." }, { status: 400 });
  }

  const result = await sendMaintenanceRequestViaResend({
    community,
    location,
    street,
    details,
    name,
    phone,
    email,
  });

  if ("error" in result) {
    return Response.json({ error: result.error }, { status: 503 });
  }

  return Response.json({ ok: true });
}
