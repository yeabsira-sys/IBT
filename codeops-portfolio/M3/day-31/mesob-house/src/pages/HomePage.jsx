import Navbar from "../components/layout/Navbar";
import AnnouncementBar from "../components/layout/AnnouncementBar";
import Footer from "../components/layout/Footer";
import Hero from "../components/marketing/Hero";
import SpecialsSection from "../components/menu/SpecialsSection";
import GurshaSection from "../components/marketing/GurshaSection";
import ReflectionsSection from "../components/marketing/ReflectionsSection";
import CtaBanner from "../components/marketing/CtaBanner";
import AsyncNotice from "../components/ui/AsyncNotice";

import { footer, navLinks } from "../data/content";
import { useEffect } from "react";

import {
  announcement,
  closingCta,
  dietaryColumn,
  gursha,
  hero,
  reflections,
} from "../data/home";

import { mapApiDishToCard } from "../lib/dishAdapters";

import { useStore } from "../stores/useStores";

import { useToast } from "../context/ToastContext";
import useNavbarState from "../hooks/useNavbarState";

export default function HomePage() {
  // ==========================================
  // DISHES
  // ==========================================

  const liveSpecials = useStore((state) => state.specials);
  const specialsLoading = useStore((state) => state.specialsLoading);
  const specialsError = useStore((state) => state.specialsError);
  const fetchSpecials = useStore((state) => state.fetchSpecials);
  const refetch = useStore((state) => state.refetchSpecials);

  useEffect(() => {
    fetchSpecials();
  }, [fetchSpecials]);

  // ==========================================
  // CART
  // ==========================================

  const addToCart = useStore((state) => state.addToCart);

  const toast = useToast();

  const { cart: navCart, user: navUser } = useNavbarState();

  // ==========================================
  // ADD TO CART
  // ==========================================

  const handleAdd = (item) => {
    addToCart(item);

    toast(`Added ${item.name} to your basket`);
  };

  // ==========================================
  // SPECIALS
  // ==========================================

  const specialsDishes = liveSpecials && liveSpecials.map(mapApiDishToCard);

  return (
    <>
      <Navbar links={navLinks} cart={navCart} user={navUser} />

      <AnnouncementBar {...announcement} />

      <main className="container">
        <Hero {...hero} />

        {specialsError && (
          <AsyncNotice
            variant="error"
            message="Couldn't load today's live specials — showing example dishes instead."
            onRetry={refetch}
          />
        )}

        {specialsLoading && liveSpecials.length === 0 && (
          <AsyncNotice variant="loading" message="Loading today's specials…" />
        )}

        <SpecialsSection
          {...liveSpecials}
          dishes={specialsDishes}
          onAdd={handleAdd}
        />
      </main>

      <GurshaSection {...gursha} onAdd={handleAdd} />

      <main className="container">
        <ReflectionsSection {...reflections} />
      </main>

      <CtaBanner {...closingCta} />

      <Footer {...footer} columns={[footer.columns[0], dietaryColumn]} />
    </>
  );
}
