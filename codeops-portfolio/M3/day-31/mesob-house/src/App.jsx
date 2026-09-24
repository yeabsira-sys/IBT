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
import { ToastProvider } from "./context/ToastContext";

export default function App() {
  return (
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
  );
}
