import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";
import NotFoundHero from "../components/notfound/NotFoundHero";
import SuggestedDishes from "../components/notfound/SuggestedDishes";
import ConciergeBanner from "../components/notfound/ConciergeBanner";

import { footer, navLinks } from "../data/content";
import { concierge, notFoundHero, suggested } from "../data/notfound";
import { useStore } from "../context/StoreContext";
import { useToast } from "../context/ToastContext";
import useNavbarState from "../hooks/useNavbarState";

/**
 * NotFoundPage — the 404. Keeps the guest inside the ordering flow instead
 * of dead-ending: quick exits, then a redirect toward dishes and concierge
 * contact rather than a bare error message.
 */
export default function NotFoundPage() {
  const { addToCart } = useStore();
  const toast = useToast();
  const { cart: navCart, user: navUser } = useNavbarState();

  const handleOrder = (dish) => {
    addToCart(dish);
    toast(`Added ${dish.name} to your basket`);
  };

  const handleReserve = () => {
    toast("Thanks! Our concierge will call you shortly to confirm your table.", "success");
  };

  return (
    <>
      <Navbar links={navLinks} cart={navCart} user={navUser} />

      <main className="container">
        <NotFoundHero {...notFoundHero} />
        <SuggestedDishes {...suggested} onOrder={handleOrder} />
        <ConciergeBanner {...concierge} onReserve={handleReserve} />
      </main>

      <Footer {...footer} />
    </>
  );
}
