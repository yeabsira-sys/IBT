import { useNavigate } from "react-router-dom";
import Navbar from "../components/layout/Navbar";
import Breadcrumbs from "../components/layout/Breadcrumbs";
import Footer from "../components/layout/Footer";
import AuthPanel from "../components/auth/AuthPanel";
import SignInForm from "../components/auth/SignInForm";
import TrustStrip from "../components/auth/TrustStrip";

import { footer, navLinks } from "../data/content";
import { signInBreadcrumbs, signInPanel, trust } from "../data/auth";
import { useStore } from "../context/StoreContext";
import { useToast } from "../context/ToastContext";
import useNavbarState from "../hooks/useNavbarState";

/**
 * SignInPage — member portal: perks panel on the left, the sign-in form on
 * the right, and a trust strip beneath both. Authenticates against accounts
 * created via the register page (both persisted in the shared store).
 */
export default function SignInPage() {
  const navigate = useNavigate();
  const { signIn, socialSignIn } = useStore();
  const toast = useToast();
  const { cart: navCart, user: navUser } = useNavbarState();

  const handleSubmit = (values) => {
    const result = signIn(values);
    toast(result.message, result.ok ? "success" : "error");
    if (result.ok) navigate("/");
  };

  const handleSocial = (provider) => {
    const result = socialSignIn(provider);
    toast(result.message, result.ok ? "success" : "error");
    if (result.ok) navigate("/");
  };

  const handleForgotPassword = () => {
    toast("Password reset isn't available in this demo — please contact the kitchen desk.", "info");
  };

  return (
    <>
      <Navbar links={navLinks} cart={navCart} user={navUser} />

      <main className="container">
        <Breadcrumbs
          items={signInBreadcrumbs}
          trailing={<span className="sign-in__banner">« ጉ ር ሻ » — Welcome Back to Our Table</span>}
        />

        <div className="sign-in-page">
          <AuthPanel {...signInPanel} />
          <SignInForm
            onSubmit={handleSubmit}
            onTelebirr={() => handleSocial("Telebirr")}
            onGoogle={() => handleSocial("Google")}
            onForgotPassword={handleForgotPassword}
          />
        </div>

        <TrustStrip items={trust} />
      </main>

      <Footer {...footer} />
    </>
  );
}
