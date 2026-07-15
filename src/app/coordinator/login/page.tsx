import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCoordinatorSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Coordinator sign in" };
export const dynamic = "force-dynamic";

export default async function CoordinatorLoginPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCoordinatorSession()) redirect("/coordinator");
  const { error } = await props.searchParams;

  return (
    <main>
      <div className="card auth-card">
        <p className="eyebrow">Coordinator access</p>
        <h1>Sign in</h1>
        <p className="muted">Use the email and password registered for your organisation.</p>
        {error && <p className="form-error" role="alert">The email or password was not accepted.</p>}
        <form action="/api/coordinator/login" method="post" className="stack-form">
          <label>
            Email address
            <input name="email" type="email" maxLength={254} autoComplete="email" required />
          </label>
          <label>
            Password
            <input name="password" type="password" maxLength={200} autoComplete="current-password" required />
          </label>
          <button className="button" type="submit">Sign in</button>
        </form>
        <p className="muted">
          New organisation? <Link href="/coordinator/register">Register your charity</Link>
        </p>
      </div>
    </main>
  );
}
