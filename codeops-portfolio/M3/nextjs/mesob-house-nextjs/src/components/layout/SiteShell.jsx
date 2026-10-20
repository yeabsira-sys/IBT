import Footer from "./Footer";
import { footer } from "@/data/content";
import { dietaryColumn } from "@/data/home";

/**
 * SiteShell — the <main> landmark plus the footer. Shop pages and the 404 use
 * the "dietary traditions" footer column; account pages use the default one.
 */
export default function SiteShell({ children, variant = "shop" }) {
  const columns = variant === "shop" ? [footer.columns[0], dietaryColumn] : footer.columns;
  return (
    <>
      <main className="site-main" id="main">
        {children}
      </main>
      <Footer {...footer} columns={columns} />
    </>
  );
}
