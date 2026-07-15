import { NextResponse } from "next/server";
import { getCoordinatorSession } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import { isSameOrigin } from "@/lib/security";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { cleanText, isValidUuid, validateShiftInput } from "@/lib/validation";

function redirectWith(req: Request, path: string, key: "message" | "error", value: string) {
  const url = new URL(path, req.url);
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

  if (action === "cancel") {
    const shiftId = cleanText(form.get("shift_id"), 40);
    if (!isValidUuid(shiftId)) return redirectWith(req, "/coordinator", "error", "Invalid shift reference.");

    const { data, error } = await db
      .from("shifts")
      .update({ status: "cancelled" })
      .eq("id", shiftId)
      .eq("organisation_id", organisationId)
      .eq("status", "open")
      .select("id")
      .maybeSingle();

    if (error) return redirectWith(req, "/coordinator", "error", error.message);
    if (!data) return redirectWith(req, "/coordinator", "error", "Only an open shift in your organisation can be cancelled.");

    await recordAuditEvent({ organisationId, eventType: "shift_cancelled", shiftId });
    return redirectWith(req, "/coordinator", "message", "Shift cancelled.");
  }

  const result = validateShiftInput({
    title: form.get("title"),
    location: form.get("location"),
    starts_at: form.get("starts_at"),
    ends_at: form.get("ends_at"),
    time_zone: form.get("time_zone"),
  });

  if (!result.ok) return redirectWith(req, "/coordinator/shifts/new", "error", result.error);

  const { data, error } = await db
    .from("shifts")
    .insert({
      organisation_id: organisationId,
      title: result.value.title,
      location: result.value.location,
      starts_at: result.value.startsAt,
      ends_at: result.value.endsAt,
      timezone: result.value.timeZone,
    })
    .select("id")
    .single();

  if (error) return redirectWith(req, "/coordinator/shifts/new", "error", error.message);

  await recordAuditEvent({ organisationId, eventType: "shift_created", shiftId: data.id });
  return redirectWith(req, "/coordinator", "message", "Urgent shift created.");
}
