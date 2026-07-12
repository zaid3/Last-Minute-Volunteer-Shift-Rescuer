import type { Metadata } from "next";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidUuid } from "@/lib/validation";

export const metadata: Metadata = { title: "Volunteer shift" };
export const dynamic = "force-dynamic";

function formatDate(value: string, timeZone: string) {
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

type ShiftRelation = {
  id: string;
  title: string;
  location: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  status: string;
};

export default async function ClaimPage(props: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { token } = await props.params;
  const { status } = await props.searchParams;

  if (status === "claimed") {
    return (
      <main>
        <div className="card result-card success-card">
          <p className="result-icon" aria-hidden="true">✓</p>
          <h1>You are confirmed</h1>
          <p>Your acceptance has been recorded and the shift is now covered.</p>
        </div>
      </main>
    );
  }

  if (status === "already_claimed" || status === "token_used") {
    return (
      <main>
        <div className="card result-card notice-card">
          <p className="result-icon" aria-hidden="true">i</p>
          <h1>The shift is already covered</h1>
          <p>Another volunteer confirmed first. Thank you for responding so quickly.</p>
        </div>
      </main>
    );
  }

  if (status === "expired" || status === "invalid_token" || status === "error") {
    return (
      <main>
        <div className="card result-card notice-card">
          <h1>This link is no longer valid</h1>
          <p>The claim window may have closed. Please contact the coordinator if you need help.</p>
        </div>
      </main>
    );
  }

  if (!isValidUuid(token)) {
    return (
      <main>
        <div className="card result-card notice-card">
          <h1>Invalid claim link</h1>
          <p>Please check the link in your email or contact the coordinator.</p>
        </div>
      </main>
    );
  }

  const { data: claimToken } = await getSupabaseAdmin()
    .from("claim_tokens")
    .select("token,used_at,expires_at,shifts(id,title,location,starts_at,ends_at,timezone,status)")
    .eq("token", token)
    .maybeSingle();

  const relation = claimToken?.shifts as unknown;
  const shift = (Array.isArray(relation) ? relation[0] : relation) as ShiftRelation | undefined;

  if (!claimToken || !shift) {
    return (
      <main>
        <div className="card result-card notice-card">
          <h1>Invalid claim link</h1>
          <p>Please contact the coordinator.</p>
        </div>
      </main>
    );
  }

  if (
    claimToken.used_at ||
    shift.status !== "open" ||
    new Date(claimToken.expires_at) <= new Date()
  ) {
    return (
      <main>
        <div className="card result-card notice-card">
          <h1>This shift is no longer available</h1>
          <p>Thank you for checking. The shift has been covered, cancelled or closed.</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="card claim-card">
        <p className="eyebrow">Urgent volunteer cover</p>
        <h1>{shift.title}</h1>
        <dl className="shift-details">
          <div>
            <dt>Starts</dt>
            <dd>{formatDate(shift.starts_at, shift.timezone)}</dd>
          </div>
          <div>
            <dt>Ends</dt>
            <dd>{formatDate(shift.ends_at, shift.timezone)}</dd>
          </div>
          <div>
            <dt>Location</dt>
            <dd>{shift.location || "Contact the coordinator"}</dd>
          </div>
        </dl>
        <p className="muted">
          Confirm only when you are available. The first volunteer to confirm will be assigned.
        </p>
        <form action="/api/claim" method="post">
          <input type="hidden" name="token" value={token} />
          <button className="button full-button" type="submit">Yes, I can cover this shift</button>
        </form>
      </div>
    </main>
  );
}
