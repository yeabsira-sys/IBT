import Breadcrumbs from "@/components/layout/Breadcrumbs";
import AccountView from "@/components/account/AccountView";
import { requirePageUser } from "@/lib/auth";
import { roleHome } from "@/lib/roleHome";

export const metadata = {
  title: "Your Account",
  description: "Your Mesob House profile, saved favorites and order history.",
  robots: { index: false, follow: false },
};

// Every signed-in role can open /account. Staff need it to sign out; the
// customer-only order and checkout pages remain blocked for them.
export default async function AccountPage() {
  const user = await requirePageUser("/account");
  const staff = user.role === "employee" || user.role === "admin";
  const breadcrumbItems = staff
    ? [{ label: user.role === "admin" ? "Admin" : "Kitchen", to: roleHome(user.role) }, { label: "Account" }]
    : [{ label: "Home", to: "/" }, { label: "Account" }];

  return (
    <div className="container account-page-wrap">
      <Breadcrumbs items={breadcrumbItems} />
      <AccountView user={user} />
    </div>
  );
}
