import Link from "next/link";
import { requireRole } from "../../lib/auth";
import { signOut } from "../actions/auth";

export default async function KitchenPage() {
  const staff = await requireRole("staff");

  return (
    <main className="section">
      <div className="container">
        <div className="page-heading">
          <span className="eyebrow">Staff area</span>
          <h1>Kitchen dashboard</h1>
          <p>Welcome, {staff.name}.</p>
        </div>

        <p>This page is restricted to authenticated staff accounts.</p>

        <p>
          <Link href="/orders">Customer orders</Link>
        </p>

        <form action={signOut}>
          <button type="submit" className="btn btn-secondary">
            Sign out
          </button>
        </form>
      </div>
    </main>
  );
}
