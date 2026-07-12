import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  const { error } = await getSupabaseAdmin().from("shifts").select("id", { head: true, count: "exact" });

  return NextResponse.json(
    {
      status: error ? "degraded" : "ok",
      database: error ? "unavailable" : "available",
      response_ms: Date.now() - startedAt,
    },
    { status: error ? 503 : 200 }
  );
}
