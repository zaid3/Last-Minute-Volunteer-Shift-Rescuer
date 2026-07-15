import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CoordinatorNav } from "@/components/CoordinatorNav";
import { getCoordinatorSession } from "@/lib/auth";

export const metadata: Metadata = { title: "Create shift" };
export const dynamic = "force-dynamic";

export default async function NewShiftPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!(await getCoordinatorSession())) redirect("/coordinator/login");
  const { error } = await props.searchParams;

  return (
    <main className="dashboard-main">
      <CoordinatorNav />
      <div className="page-heading">
        <div>
          <p className="eyebrow">Urgent cover</p>
          <h1>Create a shift</h1>
        </div>
      </div>

      <section className="panel form-panel">
        {error && <p className="form-error" role="alert">{error}</p>}
        <form action="/api/shifts" method="post" className="stack-form">
          <input type="hidden" name="action" value="create" />
          <label>
            Shift title
            <input name="title" type="text" maxLength={120} placeholder="Community food distribution" required />
          </label>
          <label>
            Location
            <input name="location" type="text" maxLength={180} placeholder="Community centre, High Street" />
          </label>
          <div className="two-column-form">
            <label>
              Starts
              <input name="starts_at" type="datetime-local" required />
            </label>
            <label>
              Ends
              <input name="ends_at" type="datetime-local" required />
            </label>
          </div>
          <label>
            Time zone
            <select name="time_zone" defaultValue="Europe/London">
              <option value="Europe/London">United Kingdom</option>
              <option value="Europe/Dublin">Ireland</option>
              <option value="Europe/Paris">Central Europe</option>
              <option value="America/New_York">US Eastern</option>
              <option value="America/Chicago">US Central</option>
              <option value="America/Denver">US Mountain</option>
              <option value="America/Los_Angeles">US Pacific</option>
            </select>
          </label>
          <button className="button" type="submit">Save shift</button>
        </form>
      </section>
    </main>
  );
}
