import { redirect } from "next/navigation";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import MembershipPanel from "@/components/marketing/MembershipPanel";
import RegisterForm from "@/components/account/RegisterForm";
import { benefits, breadcrumbs, dietaryOptions, testimonial } from "@/data/content";
import { getSession } from "@/lib/auth";
import { roleHome } from "@/lib/roleHome";

export const metadata = {
  title: "Join the Mesob Family",
  description: "Create your Mesob House account for loyalty gursha points, fasting alerts and express Addis delivery.",
};

export default async function RegisterPage() {
  const user = await getSession();
  if (user) redirect(user.role === "customer" ? "/account" : roleHome(user.role));

  return (
    <div className="container">
      <Breadcrumbs items={breadcrumbs} />
      <div className="account-page">
        <MembershipPanel
          badge="Member Circle"
          title="Become an Honored Table Guest"
          lede="Immerse yourself in authentic highland hospitality, where every shared meal honors community, connection, and craft."
          benefits={benefits}
          testimonial={testimonial}
        />
        <RegisterForm dietaryOptions={dietaryOptions} />
      </div>
    </div>
  );
}
