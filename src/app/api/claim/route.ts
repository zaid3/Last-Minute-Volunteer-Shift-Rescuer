import { NextResponse } from "next/server";
import { sendClaimNotifications, type ShiftEmailDetails } from "@/lib/email";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidUuid } from "@/lib/validation";

type ClaimResult = {
  status?: string;
  shift_id?: string;
  volunteer_id?: string;
};

export async function POST(req: Request) {
  const form = await req.formData();
  const token = String(form.get("token") ?? "");

  if (!isValidUuid(token)) {
    return NextResponse.redirect(new URL("/claim/invalid?status=invalid_token", req.url), 303);
  }

  const db = getSupabaseAdmin();
  const { data, error } = await db.rpc("claim_shift", { p_token: token });
  const result = (data ?? {}) as ClaimResult;
  const status = error ? "error" : result.status ?? "error";

  if (status === "claimed" && result.shift_id && result.volunteer_id) {
    const [shiftResult, volunteerResult] = await Promise.all([
      db
        .from("shifts")
        .select("id,title,location,starts_at,ends_at,timezone")
        .eq("id", result.shift_id)
        .single(),
      db
        .from("volunteers")
        .select("id,name,email")
        .eq("id", result.volunteer_id)
        .single(),
    ]);

    if (shiftResult.data && volunteerResult.data) {
      try {
        await sendClaimNotifications({
          shift: shiftResult.data as ShiftEmailDetails,
          volunteer: volunteerResult.data,
        });
      } catch (notificationError) {
        console.error("Claim notification failed", notificationError);
      }
    }
  }

  return NextResponse.redirect(new URL(`/claim/${token}?status=${status}`, req.url), 303);
}
