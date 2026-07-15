import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getCoordinatorSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Register your charity" };
export const dynamic = "force-dynamic";

const errorMessages: Record<string, string> = {
  invalid: "Please check all fields. Passwords must be at least 10 characters.",
  email: "An account with this email address already exists.",
  failed: "The organisation could not be created. Please try again.",
};

export default async function RegisterPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await getCoordinatorSession()) redirect("/coordinator");
  const { error } = await props.searchParams;

  return (
    <main>
      <div className="card auth-card">
        <p className="eyebrow">Organisation setup</p>
        <h1>Register your charity</h1>
        <p className="muted">
          Create a private workspace for your coordinators, volunteers and urgent shifts.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {errorMessages[error] ?? errorMessages.failed}
          </p>
        )}
        <form action="/api/coordinator/register" method="post" className="stack-form">
          <label>
            Charity or organisation name
            <input name="organisation_name" type="text" maxLength={160} required />
          </label>
          <label>
            Your full name
            <input name="coordinator_name" type="text" maxLength={120} required />
          </label>
          <label>
            Work email address
            <input name="email" type="email" maxLength={254} autoComplete="email" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              minLength={10}
              maxLength={200}
              autoComplete="new-password"
              required
            />
          </label>
          <button className="button" type="submit">Create organisation</button>
        </form>
        <p className="muted">
          Already registered? <Link href="/coordinator/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
