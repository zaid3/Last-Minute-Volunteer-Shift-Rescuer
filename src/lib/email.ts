import { Resend } from "resend";
import { getEmailEnv } from "@/lib/env";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export type ShiftEmailDetails = {
  id: string;
  title: string;
  location: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
};

export type OrganisationEmailDetails = {
  id: string;
  name: string;
  contact_email: string;
};

let resend: Resend | undefined;

function getResend(): Resend {
  if (!resend) resend = new Resend(getEmailEnv().resendApiKey);
  return resend;
}

function formatDate(value: string, timeZone: string): string {
  return new Date(value).toLocaleString("en-GB", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function recordNotification(input: {
  organisationId: string;
  shiftId: string;
  volunteerId?: string | null;
  recipient: string;
  kind: string;
  status: "sent" | "failed";
  providerId?: string | null;
  error?: string | null;
}) {
  const { error } = await getSupabaseAdmin().from("notification_log").insert({
    organisation_id: input.organisationId,
    shift_id: input.shiftId,
    volunteer_id: input.volunteerId ?? null,
    recipient: input.recipient,
    notification_type: input.kind,
    delivery_status: input.status,
    provider_message_id: input.providerId ?? null,
    error_message: input.error?.slice(0, 500) ?? null,
  });

  if (error) console.error("Failed to record notification", error.message);
}

export async function sendShiftAlert(input: {
  organisation: OrganisationEmailDetails;
  volunteer: { id: string; name: string; email: string };
  shift: ShiftEmailDetails;
  claimUrl: string;
}): Promise<boolean> {
  const env = getEmailEnv();
  const { data, error } = await getResend().emails.send({
    from: env.from,
    to: input.volunteer.email,
    subject: `${input.organisation.name}: urgent volunteer cover for ${input.shift.title}`,
    text: [
      `Hi ${input.volunteer.name},`,
      "",
      `${input.organisation.name} needs last-minute volunteer cover:`,
      "",
      input.shift.title,
      formatDate(input.shift.starts_at, input.shift.timezone),
      input.shift.location ?? "Location to be confirmed",
      "",
      "Review the shift and confirm availability:",
      input.claimUrl,
      "",
      "The first volunteer to confirm will be assigned. If you are unavailable, no action is required.",
    ].join("\n"),
  });

  await recordNotification({
    organisationId: input.organisation.id,
    shiftId: input.shift.id,
    volunteerId: input.volunteer.id,
    recipient: input.volunteer.email,
    kind: "shift_alert",
    status: error ? "failed" : "sent",
    providerId: data?.id,
    error: error?.message,
  });

  return !error;
}

export async function sendClaimNotifications(input: {
  organisation: OrganisationEmailDetails;
  volunteer: { id: string; name: string; email: string };
  shift: ShiftEmailDetails;
}): Promise<void> {
  const env = getEmailEnv();
  const when = formatDate(input.shift.starts_at, input.shift.timezone);
  const location = input.shift.location ?? "Location to be confirmed";

  const volunteerResult = await getResend().emails.send({
    from: env.from,
    to: input.volunteer.email,
    subject: `${input.organisation.name}: confirmed for ${input.shift.title}`,
    text: [
      `Hi ${input.volunteer.name},`,
      "",
      `Thank you. You are confirmed for this ${input.organisation.name} volunteer shift:`,
      "",
      input.shift.title,
      when,
      location,
      "",
      "Please contact the organisation if your availability changes.",
    ].join("\n"),
  });

  await recordNotification({
    organisationId: input.organisation.id,
    shiftId: input.shift.id,
    volunteerId: input.volunteer.id,
    recipient: input.volunteer.email,
    kind: "claim_confirmation",
    status: volunteerResult.error ? "failed" : "sent",
    providerId: volunteerResult.data?.id,
    error: volunteerResult.error?.message,
  });

  const coordinatorResult = await getResend().emails.send({
    from: env.from,
    to: input.organisation.contact_email,
    subject: `Shift covered: ${input.shift.title}`,
    text: [
      `${input.organisation.name}'s urgent shift has been covered.`,
      "",
      `Volunteer: ${input.volunteer.name} <${input.volunteer.email}>`,
      `Shift: ${input.shift.title}`,
      `Time: ${when}`,
      `Location: ${location}`,
    ].join("\n"),
  });

  await recordNotification({
    organisationId: input.organisation.id,
    shiftId: input.shift.id,
    volunteerId: input.volunteer.id,
    recipient: input.organisation.contact_email,
    kind: "coordinator_claim_notice",
    status: coordinatorResult.error ? "failed" : "sent",
    providerId: coordinatorResult.data?.id,
    error: coordinatorResult.error?.message,
  });
}
