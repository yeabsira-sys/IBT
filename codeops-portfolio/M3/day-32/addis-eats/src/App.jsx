import { useState } from "react";
import Header from "./components/header/Header";
import Main from "./components/main/Main";
import Footer from "./components/footer/Footer";
import { CartProvider } from "./context/CartContext";

const App = () => {
  const [searchKey, setSearchKey] = useState("");

  const handleSearchInput = (value) => {
    setSearchKey(value);
  };

  return (
    <CartProvider>
      <div>
        <Header handleSearchInput={handleSearchInput} />

        <Main searchKey={searchKey} />

        <Footer />
      </div>
    </CartProvider>
  );
};

export default App;
