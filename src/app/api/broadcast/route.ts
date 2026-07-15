import { NextResponse } from "next/server";
import { getCoordinatorSession } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/audit";
import {
  sendShiftAlert,
  type OrganisationEmailDetails,
  type ShiftEmailDetails,
} from "@/lib/email";
import { hasManagerApiKey, isSameOrigin } from "@/lib/security";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { cleanText, isValidUuid } from "@/lib/validation";

function dashboardRedirect(req: Request, key: "message" | "error", value: string) {
  const url = new URL("/coordinator", req.url);
  url.searchParams.set(key, value);
  return NextResponse.redirect(url, 303);
}

export async function POST(req: Request) {
  const machineAccess = hasManagerApiKey(req);
  const session = await getCoordinatorSession();

  if (!machineAccess && !session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (session && !machineAccess && !isSameOrigin(req)) {
    return NextResponse.json({ error: "invalid origin" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  const isForm = contentType.includes("form");
  let shiftId = "";

  if (isForm) {
    const form = await req.formData();
    shiftId = cleanText(form.get("shift_id"), 40);
  } else {
    const body = await req.json().catch(() => ({})) as { shift_id?: unknown };
    shiftId = cleanText(body.shift_id, 40);
  }

  const organisationId = session?.organisationId
    ?? cleanText(req.headers.get("x-organisation-id"), 40);

  if (!isValidUuid(organisationId)) {
    return isForm
      ? dashboardRedirect(req, "error", "A valid organisation is required.")
      : NextResponse.json({ error: "valid x-organisation-id required" }, { status: 400 });
  }

  if (!isValidUuid(shiftId)) {
    return isForm
      ? dashboardRedirect(req, "error", "A valid shift is required.")
      : NextResponse.json({ error: "valid shift_id required" }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  const [organisationResult, shiftResult] = await Promise.all([
    db
      .from("organisations")
      .select("id,name,contact_email,status")
      .eq("id", organisationId)
      .maybeSingle(),
    db
      .from("shifts")
      .select("id,title,location,starts_at,ends_at,timezone,status")
      .eq("id", shiftId)
      .eq("organisation_id", organisationId)
      .maybeSingle(),
  ]);

  if (organisationResult.error || shiftResult.error) {
    const message = organisationResult.error?.message ?? shiftResult.error?.message ?? "Database error.";
    return isForm
      ? dashboardRedirect(req, "error", message)
      : NextResponse.json({ error: message }, { status: 500 });
  }

  const organisation = organisationResult.data;
  const shift = shiftResult.data;

  if (!organisation || organisation.status !== "active") {
    return isForm
      ? dashboardRedirect(req, "error", "Organisation is not active.")
      : NextResponse.json({ error: "organisation not active" }, { status: 403 });
  }
  if (!shift) {
    return isForm
      ? dashboardRedirect(req, "error", "Shift not found in your organisation.")
      : NextResponse.json({ error: "shift not found" }, { status: 404 });
  }
  if (shift.status !== "open") {
    return isForm
      ? dashboardRedirect(req, "error", `The shift is ${shift.status}.`)
      : NextResponse.json({ error: `shift is ${shift.status}` }, { status: 409 });
  }
  if (new Date(shift.starts_at) <= new Date()) {
    return isForm
      ? dashboardRedirect(req, "error", "The shift has already started.")
      : NextResponse.json({ error: "shift has already started" }, { status: 409 });
  }

  const { data: volunteers, error: volunteerError } = await db
    .from("volunteers")
    .select("id,name,email")
    .eq("organisation_id", organisationId)
    .eq("active", true)
    .order("created_at");

  if (volunteerError) {
    return isForm
      ? dashboardRedirect(req, "error", volunteerError.message)
      : NextResponse.json({ error: volunteerError.message }, { status: 500 });
  }
  if (!volunteers?.length) {
    return isForm
      ? dashboardRedirect(req, "error", "Add at least one active volunteer before broadcasting.")
      : NextResponse.json({ alerted: 0, failed: 0 });
  }

  const tokenRows = volunteers.map((volunteer) => ({
    organisation_id: organisationId,
    shift_id: shiftId,
    volunteer_id: volunteer.id,
    expires_at: shift.starts_at,
  }));

  const { data: tokens, error: tokenError } = await db
    .from("claim_tokens")
    .upsert(tokenRows, { onConflict: "shift_id,volunteer_id", ignoreDuplicates: false })
    .select("token,volunteer_id");

  if (tokenError || !tokens) {
    const message = tokenError?.message ?? "Could not create claim tokens.";
    return isForm
      ? dashboardRedirect(req, "error", message)
      : NextResponse.json({ error: message }, { status: 500 });
  }

  const tokenByVolunteer = new Map(tokens.map((token) => [token.volunteer_id, token.token]));
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? new URL(req.url).origin;
  let alerted = 0;
  let failed = 0;

  for (const volunteer of volunteers) {
    const token = tokenByVolunteer.get(volunteer.id);
    if (!token) {
      failed++;
      continue;
    }

    try {
      const sent = await sendShiftAlert({
        organisation: organisation as OrganisationEmailDetails,
        volunteer,
        shift: shift as ShiftEmailDetails,
        claimUrl: `${baseUrl}/claim/${token}`,
      });
      sent ? alerted++ : failed++;
    } catch (error) {
      console.error("Shift alert failed", error);
      failed++;
    }
  }

  await recordAuditEvent({
    organisationId,
    eventType: "shift_broadcast",
    shiftId,
    metadata: { active_volunteers: volunteers.length, alerted, failed },
  });

  if (isForm) {
    return dashboardRedirect(req, "message", `Broadcast complete: ${alerted} sent, ${failed} failed.`);
  }

  return NextResponse.json({ alerted, failed });
}
