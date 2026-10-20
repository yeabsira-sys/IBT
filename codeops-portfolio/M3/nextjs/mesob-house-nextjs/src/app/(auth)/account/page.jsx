import Breadcrumbs from "@/components/layout/Breadcrumbs";
import AccountView from "@/components/account/AccountView";
import { requirePageUser } from "@/lib/auth";

export const metadata = {
  title: "Your Account",
  description: "Your Mesob House profile, saved favorites and order history.",
  robots: { index: false, follow: false },
};

// Proxy checks for a cookie; this page verifies the session and loads the user.
export default async function AccountPage() {
  const user = await requirePageUser("/account");
  return (
    <div className="container account-page-wrap">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Account" }]} />
      <AccountView user={user} />
    </div>
  );
}
