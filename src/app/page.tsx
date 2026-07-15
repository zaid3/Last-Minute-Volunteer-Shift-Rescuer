import Link from "next/link";

export default function Home() {
  return (
    <main className="wide-main">
      <section className="hero">
        <p className="eyebrow">Built for charities and community organisations</p>
        <h1>Fill an urgent volunteer gap without creating rota confusion.</h1>
        <p className="lead">
          Each organisation gets its own private workspace to manage volunteers,
          send urgent shift alerts and confirm the first available person.
        </p>
        <div className="actions">
          <Link className="button" href="/coordinator/register">Register your charity</Link>
          <Link className="button secondary" href="/coordinator/login">Coordinator sign in</Link>
        </div>
      </section>

      <section className="feature-grid" aria-label="How it works">
        <article className="feature-card">
          <span>01</span>
          <h2>Create your organisation</h2>
          <p>Register a separate workspace so your charity&apos;s records stay isolated.</p>
        </article>
        <article className="feature-card">
          <span>02</span>
          <h2>Alert backup volunteers</h2>
          <p>Create an urgent shift and send personalised claim links to active volunteers.</p>
        </article>
        <article className="feature-card">
          <span>03</span>
          <h2>Confirm one volunteer</h2>
          <p>The database safely assigns the first valid claimant and closes the shift to later responses.</p>
        </article>
      </section>

      <section className="plain-section">
        <h2>One platform, separate charity workspaces</h2>
        <p>
          Coordinators only see the volunteers, shifts and records belonging to their own organisation. Volunteer claim links remain unique and the first valid confirmation is recorded through one auditable workflow.
        </p>
      </section>
    </main>
  );
}
