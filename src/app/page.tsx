import Link from "next/link";

export default function Home() {
  return (
    <main className="wide-main">
      <section className="hero">
        <p className="eyebrow">Built for charities and community organisations</p>
        <h1>Fill an urgent volunteer gap without creating rota confusion.</h1>
        <p className="lead">
          Alert active backup volunteers, give each person a secure claim link,
          and assign the first confirmed volunteer through one reliable workflow.
        </p>
        <div className="actions">
          <Link className="button" href="/coordinator/login">Coordinator sign in</Link>
          <a className="button secondary" href="https://github.com/zaid3/Last-Minute-Volunteer-Shift-Rescuer">
            View source
          </a>
        </div>
      </section>

      <section className="feature-grid" aria-label="How it works">
        <article className="feature-card">
          <span>01</span>
          <h2>Create the urgent shift</h2>
          <p>Record the time, location and service that needs replacement cover.</p>
        </article>
        <article className="feature-card">
          <span>02</span>
          <h2>Alert backup volunteers</h2>
          <p>Send personalised email links to every active volunteer in the list.</p>
        </article>
        <article className="feature-card">
          <span>03</span>
          <h2>Confirm one volunteer</h2>
          <p>The database safely assigns the first valid claimant and closes the shift to later responses.</p>
        </article>
      </section>

      <section className="plain-section">
        <h2>Designed around a real operational risk</h2>
        <p>
          When someone cancels at short notice, coordinators often call people individually or send several messages and then reconcile conflicting replies. Shift Rescuer creates one auditable path from vacancy to confirmed cover.
        </p>
      </section>
    </main>
  );
}
