import Breadcrumbs from "@/components/layout/Breadcrumbs";
import AdminNav from "@/components/admin/AdminNav";
import AdminReviews from "@/components/admin/AdminReviews";
import { requirePageRole } from "@/lib/auth";
import { listReviews } from "@/lib/reviews";

export const metadata = {
  title: "Review moderation",
  description: "Approve, hide or remove verified guest reviews.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage() {
  await requirePageRole(["admin"], "/admin/reviews");
  const reviews = await listReviews();

  return (
    <div className="container portal-page portal-page--wide">
      <Breadcrumbs items={[{ label: "Admin", to: "/admin" }, { label: "Reviews" }]} />
      <header className="portal-head">
        <p className="portal-eyebrow">Guest voices</p>
        <h1>Review moderation</h1>
        <p>
          Reviews are submitted by customers with a completed order containing
          the dish. Approve them for the public dish page, hide them, or delete
          spam.
        </p>
      </header>
      <AdminNav />
      <AdminReviews initialReviews={reviews} />
    </div>
  );
}
