import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: Request) {
  const form = await req.formData();
  const token = String(form.get("token") ?? "");

  if (!UUID_RE.test(token)) {
    return NextResponse.redirect(
      new URL("/claim/invalid?status=invalid_token", req.url),
      303
    );
  }

  const { data, error } = await supabaseAdmin.rpc("claim_shift", {
    p_token: token,
  });

  const status = error ? "error" : ((data?.status as string) ?? "error");
  return NextResponse.redirect(
    new URL(`/claim/${token}?status=${status}`, req.url),
    303
  );
}
