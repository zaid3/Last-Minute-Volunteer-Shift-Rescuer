import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CoordinatorNav } from "@/components/CoordinatorNav";
import { StatusBadge } from "@/components/StatusBadge";
import { getCoordinatorSession } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export const metadata: Metadata = { title: "Coordinator dashboard" };
export const dynamic = "force-dynamic";

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function CoordinatorDashboard(props: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const session = await getCoordinatorSession();
  if (!session) redirect("/coordinator/login");

  const { message, error } = await props.searchParams;
  const db = getSupabaseAdmin();
  const organisationId = session.organisationId;

  const [organisationResult, shiftResult, volunteerResult, openResult] = await Promise.all([
    db.from("organisations").select("name").eq("id", organisationId).single(),
    db
      .from("shifts")
      .select("id,title,location,starts_at,ends_at,status,claimed_at,volunteers(name,email)")
      .eq("organisation_id", organisationId)
      .order("starts_at", { ascending: false })
      .limit(20),
    db
      .from("volunteers")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .eq("active", true),
    db
      .from("shifts")
      .select("id", { count: "exact", head: true })
      .eq("organisation_id", organisationId)
      .eq("status", "open"),
  ]);

  if (organisationResult.error) throw new Error(organisationResult.error.message);
  if (shiftResult.error) throw new Error(shiftResult.error.message);
  const shifts = shiftResult.data ?? [];

  return (
    <main className="dashboard-main">
      <CoordinatorNav />
      <div className="page-heading">
        <div>
          <p className="eyebrow">{organisationResult.data.name}</p>
          <h1>Coordinator dashboard</h1>
        </div>
        <Link className="button" href="/coordinator/shifts/new">Create urgent shift</Link>
      </div>

      {message && <p className="flash success-flash">{message}</p>}
      {error && <p className="flash error-flash">{error}</p>}

      <section className="metric-grid" aria-label="Current summary">
        <article><strong>{openResult.count ?? 0}</strong><span>Open shifts</span></article>
        <article><strong>{volunteerResult.count ?? 0}</strong><span>Active volunteers</span></article>
        <article><strong>{shifts.filter((shift) => shift.status === "claimed").length}</strong><span>Recently covered</span></article>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Recent shifts</h2>
            <p className="muted">Broadcast open shifts and review assignment status.</p>
          </div>
        </div>

        {shifts.length === 0 ? (
          <div className="empty-state">
            <p>No shifts have been created for this organisation.</p>
            <Link href="/coordinator/shifts/new">Create the first shift</Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Shift</th>
                  <th>Starts</th>
                  <th>Status</th>
                  <th>Assigned volunteer</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((shift) => {
                  const relation = shift.volunteers as unknown;
                  const volunteer = Array.isArray(relation) ? relation[0] : relation as { name?: string; email?: string } | null;
                  return (
                    <tr key={shift.id}>
                      <td>
                        <strong>{shift.title}</strong>
                        <span className="table-subtext">{shift.location || "Location not specified"}</span>
                      </td>
                      <td>{formatDate(shift.starts_at)}</td>
                      <td><StatusBadge status={shift.status} /></td>
                      <td>{volunteer?.name || "—"}</td>
                      <td>
                        {shift.status === "open" && (
                          <div className="row-actions">
                            <form action="/api/broadcast" method="post">
                              <input type="hidden" name="shift_id" value={shift.id} />
                              <button className="small-button" type="submit">Broadcast</button>
                            </form>
                            <form action="/api/shifts" method="post">
                              <input type="hidden" name="action" value="cancel" />
                              <input type="hidden" name="shift_id" value={shift.id} />
                              <button className="small-button danger" type="submit">Cancel</button>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
