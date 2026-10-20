import { Suspense } from "react";
import MenuBrowser from "@/components/menu/MenuBrowser";
import { CommunalBanner } from "@/components/menu/CommunalBanner";
import { communal } from "@/data/menu";
import { getMenu } from "@/lib/menu";

export const revalidate = 300;

export const metadata = {
  title: "Menu",
  description:
    "Browse every Mesob House dish: slow-cooked wats, tibs and grills, raw kitfo, fasting platters and house tej.",
  alternates: { canonical: "/menu" },
};

export default async function MenuPage() {
  const { dishes, source } = await getMenu();

  return (
    <div className="container menu-page">
      {/* useSearchParams() inside MenuBrowser requires a Suspense boundary on statically rendered pages. */}
      <Suspense fallback={<div className="skeleton-grid" aria-busy="true">{[0, 1, 2, 3].map((i) => <div key={i} className="skeleton skeleton--card" />)}</div>}>
        <MenuBrowser dishes={dishes} source={source} />
      </Suspense>
      <CommunalBanner {...communal} />
    </div>
  );
}
