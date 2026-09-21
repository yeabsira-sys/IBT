import { BrowserRouter, Route, Routes } from "react-router-dom";
import "./styles/theme.css";
import "./styles/components.css";
import "./styles/home.css";
import "./styles/basket.css";
import "./styles/dish.css";
import "./styles/menu.css";
import "./styles/auth.css";
import "./styles/checkout.css";
import "./styles/notfound.css";
import "./styles/account.css";

import HomePage from "./pages/HomePage";
import CreateAccountPage from "./pages/CreateAccountPage";
import BasketPage from "./pages/BasketPage";
import DishDetailPage from "./pages/DishDetailPage";
import MenuPage from "./pages/MenuPage";
import SignInPage from "./pages/SignInPage";
import CheckoutPage from "./pages/CheckoutPage";
import NotFoundPage from "./pages/NotFoundPage";
import AccountPage from "./pages/AccountPage";
import { DishesProvider } from "./context/DishesContext";
import { StoreProvider } from "./context/StoreContext";
import { ToastProvider } from "./context/ToastContext";

/**
 * App — top-level routes. DishesProvider sits above the router so every page
 * (home's specials, the menu grid, a dish detail page) shares one fetch of
 * the live menu instead of each page re-requesting it. StoreProvider holds
 * the cart, favorites, accounts/session and checkout state (persisted to
 * localStorage — see context/StoreContext.jsx). ToastProvider gives every
 * button a way to confirm what it just did.
 */
export default function App() {
  return (
    <DishesProvider>
      <StoreProvider>
        <ToastProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/menu" element={<MenuPage />} />
              <Route path="/dish/:dishId" element={<DishDetailPage />} />
              <Route path="/cart" element={<BasketPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/register" element={<CreateAccountPage />} />
              <Route path="/sign-in" element={<SignInPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </StoreProvider>
    </DishesProvider>
  );
}
