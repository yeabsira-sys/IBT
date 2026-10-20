import { redirect } from "next/navigation";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import AuthPanel from "@/components/auth/AuthPanel";
import SignInForm from "@/components/auth/SignInForm";
import TrustStrip from "@/components/auth/TrustStrip";
import { signInBreadcrumbs, signInPanel, trust } from "@/data/auth";
import { getSession } from "@/lib/auth";

export const metadata = { title: "Sign In", description: "Sign in to manage your feasts and rewards." };

/**
 * Only same-site relative paths may be used as a post-login destination.
 * Absolute URLs, protocol-relative URLs, backslash tricks and the auth pages
 * themselves are rejected, which is the check the open-redirect attack targets.
 */
function safeNext(value) {
  if (typeof value !== "string") return "/";
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  if (value.startsWith("/sign-in") || value.startsWith("/signin") || value.startsWith("/register")) return "/";
  return value;
}

export default async function SignInPage({ searchParams }) {
  const { next } = await searchParams; // set by src/proxy.js when it bounces a guest from a private route
  const destination = safeNext(next);
  const user = await getSession();
  if (user) redirect(destination);

  return (
    <div className="container">
      <Breadcrumbs
        items={signInBreadcrumbs}
        trailing={<span className="sign-in__banner">« ጉ ር ሻ » — Welcome Back to Our Table</span>}
      />
      <div className="sign-in-page">
        <AuthPanel {...signInPanel} />
        <SignInForm next={destination} />
      </div>
      <TrustStrip items={trust} />
    </div>
  );
}
