import SiteShell from "@/components/layout/SiteShell";

// Account pages are personal — keep them out of search results.
export const metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({ children }) {
  return <SiteShell variant="account">{children}</SiteShell>;
}
