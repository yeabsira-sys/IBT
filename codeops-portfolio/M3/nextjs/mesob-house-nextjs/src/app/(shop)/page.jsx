import { Suspense } from "react";
import AnnouncementBar from "@/components/layout/AnnouncementBar";
import Hero from "@/components/marketing/Hero";
import GurshaSection from "@/components/marketing/GurshaSection";
import ReflectionsSection from "@/components/marketing/ReflectionsSection";
import CtaBanner from "@/components/marketing/CtaBanner";
import SpecialsSection from "@/components/menu/SpecialsSection";
import FallbackNotice from "@/components/menu/FallbackNotice";
import { announcement, closingCta, gursha, hero, reflections, specials } from "@/data/home";
import { getSpecials } from "@/lib/menu";

// Incremental Static Regeneration: served as static HTML, rebuilt in the
// background at most every 5 minutes (and instantly via /api/revalidate).
export const revalidate = 300;

export const metadata = {
  title: { absolute: "Mesob House — Authentic Habesha Dining in Addis Ababa" },
  description:
    "Handcrafted wats, stone-ground teff injera and a daily jebena buna ceremony. Order for delivery across Addis Ababa or reserve a communal mesob.",
  alternates: { canonical: "/" },
};

function SpecialsSkeleton() {
  return (
    <section className="section" aria-busy="true" aria-label="Loading today's specials">
      <div className="skeleton skeleton--title" />
      <div className="skeleton-grid skeleton-grid--3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="skeleton skeleton--card" />
        ))}
      </div>
    </section>
  );
}

/** Server Component that does its own data fetching, so it can stream in behind a Suspense fallback. */
async function LiveSpecials() {
  const { dishes, source } = await getSpecials();
  return (
    <>
      {source === "fallback" && <FallbackNotice what="today's live specials" />}
      <SpecialsSection {...specials} dishes={dishes} />
    </>
  );
}

export default function HomePage() {
  return (
    <>
      <AnnouncementBar {...announcement} />

      <div className="container">
        <Hero {...hero} />
        <Suspense fallback={<SpecialsSkeleton />}>
          <LiveSpecials />
        </Suspense>
      </div>

      <GurshaSection {...gursha} />

      <div className="container">
        <ReflectionsSection {...reflections} />
      </div>

      <CtaBanner {...closingCta} />
    </>
  );
}
