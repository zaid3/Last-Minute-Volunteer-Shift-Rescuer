import { NextResponse } from "next/server";
import { getCoordinatorSession } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { isSameOrigin } from "@/lib/security";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  cleanText,
  isValidUuid,
  parseBoolean,
  validateVolunteerInput,
} from "@/lib/validation";

function redirectWith(req: Request, key: "message" | "error", value: string) {
  const url = new URL("/coordinator/volunteers", req.url);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}

export async function POST(req: Request) {
  const session = await getCoordinatorSession();
  if (!session) {
    return NextResponse.redirect(new URL("/coordinator/login", req.url), 303);
  }
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "invalid origin" }, { status: 403 });
  }

  const form = await req.formData();
  const action = cleanText(form.get("action"), 20);
  const db = getSupabaseAdmin();
  const organisationId = session.organisationId;

  if (action === "toggle") {
    const volunteerId = cleanText(form.get("volunteer_id"), 40);
    const active = parseBoolean(form.get("active"));
    if (!isValidUuid(volunteerId)) return redirectWith(req, "error", "Invalid volunteer reference.");

    const { data, error } = await db
      .from("volunteers")
      .update({ active })
      .eq("id", volunteerId)
      .eq("organisation_id", organisationId)
      .select("id")
      .maybeSingle();

    if (error) return redirectWith(req, "error", error.message);
    if (!data) return redirectWith(req, "error", "Volunteer not found.");

    await recordAuditEvent({
      organisationId,
      eventType: active ? "volunteer_activated" : "volunteer_deactivated",
      volunteerId,
    });
    return redirectWith(req, "message", active ? "Volunteer activated." : "Volunteer deactivated.");
  }

  const result = validateVolunteerInput({
    name: form.get("name"),
    email: form.get("email"),
  });

  if (!result.ok) return redirectWith(req, "error", result.error);

  const { data, error } = await db
    .from("volunteers")
    .insert({ ...result.value, organisation_id: organisationId })
    .select("id")
    .single();

  if (error) {
    const message = error.code === "23505"
      ? "A volunteer with this email already exists in your organisation."
      : error.message;
    return redirectWith(req, "error", message);
  }

  await recordAuditEvent({ organisationId, eventType: "volunteer_created", volunteerId: data.id });
  return redirectWith(req, "message", "Volunteer added.");
}
