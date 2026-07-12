import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isCoordinatorAuthenticated } from "@/lib/auth";

export const metadata: Metadata = { title: "Coordinator sign in" };
export const dynamic = "force-dynamic";

export default async function CoordinatorLoginPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isCoordinatorAuthenticated()) redirect("/coordinator");
  const { error } = await props.searchParams;

  return (
    <main>
      <div className="card auth-card">
        <p className="eyebrow">Coordinator access</p>
        <h1>Sign in</h1>
        <p className="muted">Use the coordinator password configured for this deployment.</p>
        {error && <p className="form-error" role="alert">The password was not accepted.</p>}
        <form action="/api/coordinator/login" method="post" className="stack-form">
          <label>
            Coordinator password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="button" type="submit">Sign in</button>
        </form>
      </div>
    </main>
  );
}
