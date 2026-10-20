import SiteShell from "@/components/layout/SiteShell";
import NotFoundHero from "@/components/notfound/NotFoundHero";
import SuggestedDishes from "@/components/notfound/SuggestedDishes";
import ConciergeBanner from "@/components/notfound/ConciergeBanner";
import { concierge, notFoundHero, suggested } from "@/data/notfound";
import { getSpecials } from "@/lib/menu";

export const metadata = { title: "Page not found" };

/**
 * Rendered for any unknown URL AND whenever a page calls notFound() (e.g. an
 * unknown /dish/[slug]). Suggests three of today's real specials.
 */
export default async function NotFound() {
  const { dishes } = await getSpecials();
  const suggestions = dishes.slice(0, 3).map((dish) => ({ ...dish, note: dish.heat ?? dish.category }));

  return (
    <SiteShell variant="shop">
      <div className="container">
        <NotFoundHero {...notFoundHero} />
        <SuggestedDishes {...suggested} dishes={suggestions} />
        <ConciergeBanner {...concierge} />
      </div>
    </SiteShell>
  );
}
