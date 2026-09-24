import { lazy, Suspense } from "react";
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

const HomePage = lazy(() => import("./pages/HomePage"));
const CreateAccountPage = lazy(() => import("./pages/CreateAccountPage"));
const BasketPage = lazy(() => import("./pages/BasketPage"));
const DishDetailPage = lazy(() => import("./pages/DishDetailPage"));
const MenuPage = lazy(() => import("./pages/MenuPage"));
const SignInPage = lazy(() => import("./pages/SignInPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const AccountPage = lazy(() => import("./pages/AccountPage"));
import { ToastProvider } from "./context/ToastContext";
import ErrorBoundary from "./components/error/ErrorBoundary";
import PageLoader from "./components/ui/PageLoader";

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
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
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}
