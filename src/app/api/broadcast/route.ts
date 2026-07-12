import { NextResponse } from "next/server";
import { Resend } from "resend";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

// Coordinator-only endpoint: broadcasts an open shift to all active
// volunteers, creating one single-use claim token per volunteer.
export async function POST(req: Request) {
  if (req.headers.get("x-manager-key") !== process.env.MANAGER_API_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { shift_id } = await req.json().catch(() => ({}) as { shift_id?: string });
  if (!shift_id) {
    return NextResponse.json({ error: "shift_id required" }, { status: 400 });
  }

  const { data: shift } = await supabaseAdmin
    .from("shifts")
    .select("*")
    .eq("id", shift_id)
    .maybeSingle();

  if (!shift) {
    return NextResponse.json({ error: "shift not found" }, { status: 404 });
  }
  if (shift.status !== "open") {
    return NextResponse.json({ error: `shift is ${shift.status}` }, { status: 409 });
  }

  const { data: volunteers, error: vErr } = await supabaseAdmin
    .from("volunteers")
    .select("id, name, email")
    .eq("active", true);

  if (vErr) return NextResponse.json({ error: vErr.message }, { status: 500 });
  if (!volunteers?.length) return NextResponse.json({ alerted: 0 });

  // One token per (shift, volunteer); re-broadcasting reuses existing tokens.
  const rows = volunteers.map((v) => ({
    shift_id,
    volunteer_id: v.id,
    expires_at: shift.starts_at,
  }));

  const { data: tokens, error: tErr } = await supabaseAdmin
    .from("claim_tokens")
    .upsert(rows, { onConflict: "shift_id,volunteer_id" })
    .select("token, volunteer_id");

  if (tErr) return NextResponse.json({ error: tErr.message }, { status: 500 });

  const tokenByVolunteer = new Map(tokens!.map((t) => [t.volunteer_id, t.token]));
  const resend = new Resend(process.env.RESEND_API_KEY);
  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;

  let sent = 0;
  const failures: string[] = [];

  for (const v of volunteers) {
    const token = tokenByVolunteer.get(v.id);
    if (!token) continue;
    const link = `${base}/claim/${token}`;
    const when = new Date(shift.starts_at).toLocaleString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });

    const { error } = await resend.emails.send({
      from: process.env.EMAIL_FROM!,
      to: v.email,
      subject: `Shift cover needed: ${shift.title} - ${when}`,
      text: [
        `Hi ${v.name},`,
        ``,
        `A last-minute gap has opened up and we need cover:`,
        ``,
        `  ${shift.title}`,
        `  ${when}${shift.location ? ` - ${shift.location}` : ""}`,
        ``,
        `First to confirm gets the shift. Claim it here:`,
        `  ${link}`,
        ``,
        `This link is unique to you and stops working once the shift is covered.`,
        `If you can't make it, no action is needed.`,
      ].join("\n"),
    });

    if (error) failures.push(v.email);
    else sent++;
  }

  return NextResponse.json({ alerted: sent, failed: failures.length });
}
