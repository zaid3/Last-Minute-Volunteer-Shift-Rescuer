import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CoordinatorNav } from "@/components/CoordinatorNav";
import { StatusBadge } from "@/components/StatusBadge";
import { isCoordinatorAuthenticated } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const metadata: Metadata = { title: "Volunteers" };
export const dynamic = "force-dynamic";

export default async function VolunteersPage(props: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  if (!(await isCoordinatorAuthenticated())) redirect("/coordinator/login");
  const { message, error } = await props.searchParams;
  const { data: volunteers, error: dbError } = await getSupabaseAdmin()
    .from("volunteers")
    .select("id,name,email,active,created_at")
    .order("name");

  if (dbError) throw new Error(dbError.message);

  return (
    <main className="dashboard-main">
      <CoordinatorNav />
      <div className="page-heading">
        <div>
          <p className="eyebrow">Volunteer list</p>
          <h1>Manage volunteers</h1>
        </div>
      </div>

      {message && <p className="flash success-flash">{message}</p>}
      {error && <p className="flash error-flash">{error}</p>}

      <div className="split-layout">
        <section className="panel form-panel">
          <h2>Add volunteer</h2>
          <form action="/api/volunteers" method="post" className="stack-form">
            <input type="hidden" name="action" value="create" />
            <label>
              Full name
              <input name="name" type="text" maxLength={120} required />
            </label>
            <label>
              Email address
              <input name="email" type="email" maxLength={254} required />
            </label>
            <button className="button" type="submit">Add volunteer</button>
          </form>
        </section>

        <section className="panel">
          <h2>Current volunteers</h2>
          {!volunteers?.length ? (
            <p className="muted">No volunteers have been added.</p>
          ) : (
            <ul className="volunteer-list">
              {volunteers.map((volunteer) => (
                <li key={volunteer.id}>
                  <div>
                    <strong>{volunteer.name}</strong>
                    <span>{volunteer.email}</span>
                  </div>
                  <div className="row-actions">
                    <StatusBadge status={volunteer.active ? "active" : "inactive"} />
                    <form action="/api/volunteers" method="post">
                      <input type="hidden" name="action" value="toggle" />
                      <input type="hidden" name="volunteer_id" value={volunteer.id} />
                      <input type="hidden" name="active" value={volunteer.active ? "false" : "true"} />
                      <button className="small-button" type="submit">
                        {volunteer.active ? "Deactivate" : "Activate"}
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
