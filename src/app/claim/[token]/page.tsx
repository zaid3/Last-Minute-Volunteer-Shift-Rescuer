import { supabaseAdmin } from "@/lib/supabaseAdmin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fmt(d: string) {
  return new Date(d).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function ClaimPage(props: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { token } = await props.params;
  const { status } = await props.searchParams;

  // Post-claim result states (redirected back from /api/claim)
  if (status === "claimed") {
    return (
      <main>
        <div className="card success">
          <h1>You&apos;re on the rota</h1>
          <p>Thank you &mdash; this shift is now yours. Your coordinator has been notified.</p>
        </div>
      </main>
    );
  }
  if (status === "already_claimed" || status === "token_used") {
    return (
      <main>
        <div className="card notice">
          <h1>Already covered</h1>
          <p>
            Another volunteer got there first &mdash; thank you so much for
            offering. We&apos;ll be in touch about the next one.
          </p>
        </div>
      </main>
    );
  }
  if (status === "expired" || status === "invalid_token" || status === "error") {
    return (
      <main>
        <div className="card notice">
          <h1>This link is no longer valid</h1>
          <p>The claim window may have closed. Please contact your coordinator.</p>
        </div>
      </main>
    );
  }

  // Initial GET: validate the token and show a confirmation form.
  // Deliberately NO side effects here - email scanners prefetch links.
  if (!UUID_RE.test(token)) {
    return (
      <main>
        <div className="card notice">
          <h1>Invalid link</h1>
          <p>Please contact your coordinator.</p>
        </div>
      </main>
    );
  }

  const { data: t } = await supabaseAdmin
    .from("claim_tokens")
    .select(
      "token, used_at, expires_at, shifts ( title, location, starts_at, ends_at, status )"
    )
    .eq("token", token)
    .maybeSingle();

  const shift = (t as { shifts?: Record<string, string> } | null)?.shifts;

  if (!t || !shift) {
    return (
      <main>
        <div className="card notice">
          <h1>Invalid link</h1>
          <p>Please contact your coordinator.</p>
        </div>
      </main>
    );
  }

  if (
    t.used_at ||
    shift.status !== "open" ||
    new Date(t.expires_at) < new Date()
  ) {
    return (
      <main>
        <div className="card notice">
          <h1>Already covered or closed</h1>
          <p>This shift is no longer available &mdash; thank you for checking.</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <div className="card">
        <h1>{shift.title}</h1>
        <ul className="shift-meta">
          <li>
            {fmt(shift.starts_at)} &rarr; {fmt(shift.ends_at)}
          </li>
          {shift.location && <li>{shift.location}</li>}
        </ul>
        <p className="muted">First to confirm gets the shift.</p>
        <form action="/api/claim" method="post">
          <input type="hidden" name="token" value={token} />
          <button className="claim" type="submit">
            Yes, I&apos;ll take this shift
          </button>
        </form>
      </div>
    </main>
  );
}
