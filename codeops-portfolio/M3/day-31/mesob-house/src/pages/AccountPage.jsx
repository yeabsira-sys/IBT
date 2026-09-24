import { Link, useNavigate } from "react-router-dom";
import { FiHeart, FiLogOut, FiX } from "react-icons/fi";
import Navbar from "../components/layout/Navbar";
import Breadcrumbs from "../components/layout/Breadcrumbs";
import Footer from "../components/layout/Footer";
import Button from "../components/ui/Button";
import { Card } from "../components/ui/Surface";
import { Avatar } from "../components/ui/Primitives";

import { dietaryOptions, footer, navLinks } from "../data/content";
import { useStore } from "../stores/useStores";
import { useToast } from "../context/ToastContext";
import useNavbarState from "../hooks/useNavbarState";

const accountBreadcrumbs = [{ label: "Home", to: "/" }, { label: "Account" }];

function preferenceLabel(value) {
  return (
    dietaryOptions.find((option) => option.value === value)?.label ?? value
  );
}

export default function AccountPage() {
  const navigate = useNavigate();
  // const { session, signOut, favorites, toggleFavorite } = useStore();
  const session = useStore((state) => state.session);
  const signOut = useStore((state) => state.signOut);
  const favorites = useStore((state) => state.favorites);
  const toggleFavorite = useStore((state) => state.toggleFavorite);
  const toast = useToast();
  const { cart: navCart, user: navUser } = useNavbarState();

  const handleSignOut = () => {
    signOut();
    toast("Signed out", "info");
    navigate("/");
  };

  return (
    <>
      <Navbar links={navLinks} cart={navCart} user={navUser} />

      <main className="container account-page-wrap">
        <Breadcrumbs items={accountBreadcrumbs} />

        {session ? (
          <div className="account-layout">
            <Card variant="raised" className="account-card">
              <div className="account-card__head">
                <Avatar name={session.name} size={56} />
                <div>
                  <h1>{session.name}</h1>
                  <p>Welcome back to Mesob House</p>
                </div>
              </div>

              <dl className="account-details">
                {session.email && (
                  <div>
                    <dt>Email</dt>
                    <dd>{session.email}</dd>
                  </div>
                )}
                {session.phone && (
                  <div>
                    <dt>Ethiopian Mobile</dt>
                    <dd>+251 {session.phone}</dd>
                  </div>
                )}
                {session.preference && (
                  <div>
                    <dt>Dining Preference</dt>
                    <dd>{preferenceLabel(session.preference)}</dd>
                  </div>
                )}
                {session.provider && (
                  <div>
                    <dt>Signed In Via</dt>
                    <dd>{session.provider}</dd>
                  </div>
                )}
              </dl>

              <Button
                variant="outline"
                leftIcon={<FiLogOut />}
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </Card>

            <Card variant="panel" className="account-favorites">
              <h2>
                <FiHeart aria-hidden="true" /> Your Favorites (
                {favorites.length})
              </h2>

              {favorites.length === 0 ? (
                <p className="account-favorites__empty">
                  Dishes you save from the menu will show up here — look for
                  "Save to Favorites" on any dish.
                </p>
              ) : (
                <ul className="account-favorites__list">
                  {favorites.map((dish) => (
                    <li key={dish.id}>
                      <Link to={`/dish/${dish.id}`}>{dish.name}</Link>
                      <button
                        type="button"
                        aria-label={`Remove ${dish.name} from favorites`}
                        onClick={() => toggleFavorite(dish)}
                      >
                        <FiX aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        ) : (
          <Card variant="raised" className="account-guest">
            <h1>You're Not Signed In</h1>
            <p>
              Sign in to see your details, saved favorites, and manage your
              feasts.
            </p>
            <div className="account-guest__actions">
              <Button as={Link} to="/sign-in" variant="primary">
                Sign In
              </Button>
              <Button as={Link} to="/register" variant="outline">
                Register
              </Button>
            </div>
          </Card>
        )}
      </main>

      <Footer {...footer} />
    </>
  );
}
