import { useNavigate } from "react-router-dom";

import Navbar from "../components/layout/Navbar";
import Breadcrumbs from "../components/layout/Breadcrumbs";
import Footer from "../components/layout/Footer";
import MembershipPanel from "../components/marketing/MembershipPanel";
import RegisterForm from "../components/account/RegisterForm";

import {
  benefits,
  breadcrumbs,
  dietaryOptions,
  footer,
  navLinks,
  testimonial,
} from "../data/content";

import { useStore } from "../stores/useStores";
import { useToast } from "../context/ToastContext";
import useNavbarState from "../hooks/useNavbarState";

export default function CreateAccountPage() {
  const navigate = useNavigate();

  // Zustand store
  const register = useStore((state) => state.register);
  const socialSignIn = useStore((state) => state.socialSignIn);

  const toast = useToast();

  const { cart: navCart, user: navUser } = useNavbarState();

  const handleSubmit = (values) => {
    const result = register(values);

    toast(result.message, result.ok ? "success" : "error");

    if (result.ok) {
      navigate("/");
    }
  };

  const handleSocial = (provider) => {
    const result = socialSignIn(provider);

    toast(result.message, result.ok ? "success" : "error");

    if (result.ok) {
      navigate("/");
    }
  };

  return (
    <>
      <Navbar links={navLinks} cart={navCart} user={navUser} />

      <main className="container">
        <Breadcrumbs items={breadcrumbs} />

        <div className="account-page">
          <MembershipPanel
            badge="Member Circle"
            title="Become an Honored Table Guest"
            lede="Immerse yourself in authentic highland hospitality, where every shared meal honors community, connection, and craft."
            benefits={benefits}
            testimonial={testimonial}
          />

          <RegisterForm
            dietaryOptions={dietaryOptions}
            onSubmit={handleSubmit}
            onTelebirr={() => handleSocial("Telebirr")}
            onGoogle={() => handleSocial("Google")}
          />
        </div>
      </main>

      <Footer {...footer} />
    </>
  );
}
