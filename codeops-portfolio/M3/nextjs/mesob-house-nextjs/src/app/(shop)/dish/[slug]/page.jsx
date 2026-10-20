import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowRight } from "react-icons/fi";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import Button from "@/components/ui/Button";
import DishOrder from "@/components/dish/DishOrder";
import DishPairings from "@/components/dish/DishPairings";
import { HeritageNote, SpecSheet } from "@/components/dish/HeritageNote";
import FallbackNotice from "@/components/menu/FallbackNotice";
import { closingBand, gallery, heritage, order, pairing, specs } from "@/data/dish";
import { getAllDishes, getDish } from "@/lib/menu";
import { SITE_URL } from "@/lib/api";

export const revalidate = 300;
// Slugs we didn't pre-render are still rendered on first request (then cached),
// and anything the menu doesn't contain falls through to notFound().
export const dynamicParams = true;

/** Static Site Generation: pre-render one page per dish at build time. */
export async function generateStaticParams() {
  const { dishes } = await getAllDishes();
  return dishes.map((dish) => ({ slug: dish.id }));
}

/** Per-dish <title>, description and Open Graph card, built from the same fetched data. */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const dish = await getDish(slug);
  if (!dish) return { title: "Dish not found" };

  return {
    title: dish.name,
    description: `${dish.description} ETB ${dish.price}.`,
    alternates: { canonical: `/dish/${slug}` },
    openGraph: { title: `${dish.name} | Mesob House`, description: dish.description, images: [{ url: dish.image }] },
  };
}

export default async function DishPage({ params }) {
  const { slug } = await params;
  const dish = await getDish(slug);
  if (!dish) notFound();

  const { source } = await getAllDishes();

  // schema.org structured data: lets search engines show price and availability.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MenuItem",
    name: dish.name,
    description: dish.description,
    image: dish.image,
    url: `${SITE_URL}/dish/${slug}`,
    offers: { "@type": "Offer", price: dish.price, priceCurrency: "ETB", availability: "https://schema.org/InStock" },
  };

  const config = { info: order.info, groups: order.groups, defaults: order.defaults };
  const galleryProps = {
    ...gallery,
    alt: dish.name,
    images: [dish.image, ...gallery.images.filter((src) => src !== dish.image).slice(0, 3)],
  };

  return (
    <div className="container">
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Menu", to: "/menu" },
          { label: dish.category, to: `/menu?category=${encodeURIComponent(dish.category)}` },
          { label: dish.name },
        ]}
      />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />

      {source === "fallback" && <FallbackNotice what="live dish data" />}

      <DishOrder dish={dish} config={config} galleryProps={galleryProps} />

      <HeritageNote {...heritage} />
      <SpecSheet items={specs} />

      <DishPairings {...pairing} title={`Pairs Wonderfully With ${dish.name}`} />

      <div className="closing-band">
        <span className="closing-band__icon" aria-hidden="true">
          {closingBand.icon}
        </span>
        <div className="closing-band__body">
          <h4>{closingBand.title}</h4>
          <p>{closingBand.text}</p>
        </div>
        <Button as={Link} href={closingBand.action.to} variant="outline" rightIcon={<FiArrowRight />}>
          {closingBand.action.label}
        </Button>
      </div>
    </div>
  );
}
