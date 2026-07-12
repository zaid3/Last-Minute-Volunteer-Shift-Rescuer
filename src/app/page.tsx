export default function Home() {
  return (
    <main>
      <div className="card">
        <h1>Last-Minute Volunteer Shift Rescuer</h1>
        <p className="muted">
          When a volunteer drops out, coordinators broadcast the open shift to
          backup volunteers. The first to confirm claims it &mdash; everyone
          else is politely told it&apos;s covered.
        </p>
        <p className="muted">
          Volunteers: check your email for a claim link. Coordinators: alerts
          are sent via the broadcast API (dashboard coming soon).
        </p>
      </div>
    </main>
  );
}
