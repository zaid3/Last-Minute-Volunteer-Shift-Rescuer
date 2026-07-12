import Link from "next/link";

export function CoordinatorNav() {
  return (
    <nav className="coordinator-nav" aria-label="Coordinator navigation">
      <Link href="/coordinator">Dashboard</Link>
      <Link href="/coordinator/shifts/new">New shift</Link>
      <Link href="/coordinator/volunteers">Volunteers</Link>
      <form action="/api/coordinator/logout" method="post">
        <button className="link-button" type="submit">Sign out</button>
      </form>
    </nav>
  );
}
