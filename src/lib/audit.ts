import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function recordAuditEvent(input: {
  organisationId: string;
  eventType: string;
  shiftId?: string | null;
  volunteerId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await getSupabaseAdmin().from("audit_events").insert({
    organisation_id: input.organisationId,
    event_type: input.eventType,
    shift_id: input.shiftId ?? null,
    volunteer_id: input.volunteerId ?? null,
    metadata: input.metadata ?? {},
  });

  if (error) console.error("Failed to record audit event", error.message);
}
