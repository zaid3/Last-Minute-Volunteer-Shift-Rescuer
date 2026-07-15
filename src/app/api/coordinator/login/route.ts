import { NextResponse } from "next/server";
import {
  createSessionToken,
  type CoordinatorRole,
  SESSION_COOKIE,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/auth";
import { isSameOrigin } from "@/lib/security";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "invalid origin" }, { status: 403 });
  }

  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  const password = String(form.get("password") ?? "");
  const db = getSupabaseAdmin();

  const { data: coordinator, error } = await db
    .from("coordinators")
    .select("id,organisation_id,password_hash,role,active")
    .eq("email", email)
    .maybeSingle();

  if (
    error ||
    !coordinator ||
    !coordinator.active ||
    !verifyPassword(password, coordinator.password_hash)
  ) {
    return NextResponse.redirect(new URL("/coordinator/login?error=invalid", req.url), 303);
  }

  const { data: organisation } = await db
    .from("organisations")
    .select("status")
    .eq("id", coordinator.organisation_id)
    .maybeSingle();

  if (!organisation || organisation.status !== "active") {
    return NextResponse.redirect(new URL("/coordinator/login?error=invalid", req.url), 303);
  }

  const response = NextResponse.redirect(new URL("/coordinator", req.url), 303);
  response.cookies.set(
    SESSION_COOKIE,
    createSessionToken({
      coordinatorId: coordinator.id,
      organisationId: coordinator.organisation_id,
      role: coordinator.role as CoordinatorRole,
    }),
    sessionCookieOptions,
  );
  return response;
}
