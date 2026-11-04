import Link from "next/link";
import { notFound } from "next/navigation";
import { FiArrowRight } from "react-icons/fi";
import Breadcrumbs from "@/components/layout/Breadcrumbs";
import Button from "@/components/ui/Button";
import DishOrder from "@/components/dish/DishOrder";
import DishPairings from "@/components/dish/DishPairings";
import { HeritageNote, SpecSheet } from "@/components/dish/HeritageNote";
import DishReviews from "@/components/reviews/DishReviews";
import { closingBand, gallery, heritage, order, pairing } from "@/data/dish";
import { getSession } from "@/lib/auth";
import { getDish } from "@/lib/menu";
import { getReviewContext } from "@/lib/reviews";
import { SITE_URL } from "@/lib/api";

// The review form is personalised, so this route must not be shared from a
// static cache. The public dish data is still deduplicated per request by the
// menu layer.
export const dynamic = "force-dynamic";

/** Per-dish <title>, description and Open Graph card, built from the same fetched data. */
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const dish = await getDish(slug);
  // Metadata resolves before the page streams. Keeping the check here means
  // a future loading/Suspense boundary cannot silently turn this into a 200
  // soft 404.
  if (!dish) notFound();

  return {
    title: dish.name,
    description: `${dish.description} ETB ${dish.price}.`,
    alternates: { canonical: `/dish/${slug}` },
    openGraph: {
      title: `${dish.name} | Mesob House`,
      description: dish.description,
      images: [{ url: dish.image }],
    },
  };
}

export default async function DishPage({ params }) {
  const { slug } = await params;
  const dish = await getDish(slug);
  if (!dish) notFound();

  const session = await getSession();
  const reviewContext = await getReviewContext(slug, session?.id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MenuItem",
    name: dish.name,
    description: dish.description,
    image: dish.image,
    url: `${SITE_URL}/dish/${slug}`,
    offers: {
      "@type": "Offer",
      price: dish.price,
      priceCurrency: "ETB",
      availability: "https://schema.org/InStock",
    },
    ...(dish.reviewSummary?.count
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: dish.reviewSummary.average,
            reviewCount: dish.reviewSummary.count,
          },
        }
      : {}),
  };

  const config = {
    info: [
      {
        ...order.info[0],
        label: dish.servings || "House portion",
        sub: dish.servings ? "generously" : "prepared to order",
      },
      {
        ...order.info[1],
        label:
          dish.category === "drinks"
            ? "Served chilled or at room temperature"
            : dish.isSide
              ? "Side portion"
              : "Unlimited table injera refill",
        sub: "included",
      },
      { ...order.info[2], label: "Taxes", sub: "included", tone: "green" },
    ],
    groups: dish.optionGroups,
    defaults: dish.optionDefaults,
  };

  const imageSet = [
    dish.image,
    ...dish.pairings.map((item) => item.image),
    ...gallery.images,
  ].filter((src, index, all) => src && all.indexOf(src) === index);

  const galleryProps = {
    ...gallery,
    alt: dish.name,
    images: imageSet.slice(0, 4),
  };

  const heritageNote = {
    ...heritage,
    eyebrow: `Heritage & Lineage · ${dish.categoryLabel}`,
    title: dish.name,
    text: dish.longDescription || dish.description,
  };

  const specItems = [
    { label: "Preparation", value: dish.spiceLevel || "House preparation" },
    { label: "Origin", value: dish.categoryLabel },
    {
      label: "Allergens",
      value: dish.allergens?.length
        ? dish.allergens.join(", ")
        : "None declared",
    },
    { label: "Serves", value: dish.servings || "1" },
  ];

  return (
    <div className="container">
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Menu", to: "/menu" },
          {
            label: dish.categoryLabel,
            to: `/menu?category=${encodeURIComponent(dish.category)}`,
          },
          { label: dish.name },
        ]}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />

      <DishOrder dish={dish} config={config} galleryProps={galleryProps} />

      <HeritageNote {...heritageNote} />
      <SpecSheet items={specItems} />

      {dish.pairings.length > 0 && (
        <DishPairings
          {...pairing}
          title={`Pairs Wonderfully With ${dish.name}`}
          lede={
            dish.isFasting
              ? "Fasting plates pair beautifully with cooling salads, pure teff injera and jebena buna."
              : pairing.lede
          }
          items={dish.pairings}
        />
      )}

      <DishReviews
        dishId={dish.id}
        dishName={dish.name}
        summary={dish.reviewSummary}
        reviews={dish.reviews}
        existingReview={reviewContext.existingReview}
        canReview={reviewContext.canReview}
        isSignedIn={Boolean(session)}
        signInHref={`/sign-in?next=${encodeURIComponent(`/dish/${slug}`)}`}
      />

      <div className="closing-band">
        <span className="closing-band__icon" aria-hidden="true">
          {closingBand.icon}
        </span>
        <div className="closing-band__body">
          <h4>{closingBand.title}</h4>
          <p>{closingBand.text}</p>
        </div>
        <Button
          as={Link}
          href={closingBand.action.to}
          variant="outline"
          rightIcon={<FiArrowRight />}
        >
          {closingBand.action.label}
        </Button>
      </div>
    </div>
  );
}
