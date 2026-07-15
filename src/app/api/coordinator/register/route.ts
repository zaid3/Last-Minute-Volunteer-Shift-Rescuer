import { NextResponse } from "next/server";
import {
  createSessionToken,
  hashPassword,
  SESSION_COOKIE,
  sessionCookieOptions,
} from "@/lib/auth";
import { isSameOrigin } from "@/lib/security";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value: FormDataEntryValue | null, maxLength: number): string {
  return String(value ?? "").trim().slice(0, maxLength);
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "invalid origin" }, { status: 403 });
  }

  const form = await req.formData();
  const organisationName = clean(form.get("organisation_name"), 160);
  const coordinatorName = clean(form.get("coordinator_name"), 120);
  const email = clean(form.get("email"), 254).toLowerCase();
  const password = String(form.get("password") ?? "");

  if (
    organisationName.length < 2 ||
    coordinatorName.length < 2 ||
    !EMAIL_PATTERN.test(email) ||
    password.length < 10 ||
    password.length > 200
  ) {
    return NextResponse.redirect(new URL("/coordinator/register?error=invalid", req.url), 303);
  }

  const { data, error } = await getSupabaseAdmin().rpc("register_organisation", {
    p_organisation_name: organisationName,
    p_contact_email: email,
    p_coordinator_name: coordinatorName,
    p_coordinator_email: email,
    p_password_hash: hashPassword(password),
  });

  const result = (data ?? {}) as {
    status?: string;
    organisation_id?: string;
    coordinator_id?: string;
    role?: "owner";
  };

  if (error || result.status !== "created" || !result.organisation_id || !result.coordinator_id) {
    const reason = result.status === "email_in_use" ? "email" : "failed";
    return NextResponse.redirect(new URL(`/coordinator/register?error=${reason}`, req.url), 303);
  }

  const response = NextResponse.redirect(new URL("/coordinator?message=Organisation created.", req.url), 303);
  response.cookies.set(
    SESSION_COOKIE,
    createSessionToken({
      coordinatorId: result.coordinator_id,
      organisationId: result.organisation_id,
      role: "owner",
    }),
    sessionCookieOptions,
  );
  return response;
}
