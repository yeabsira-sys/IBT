import Header from "./components/header/Header";
import Main from "./components/main/Main";
import Footer from "./components/footer/Footer";
import { useState } from "react";

const App = () => {
  let [searchKey, setSerchKey] = useState("");
  const handleSearchInput = (value) => {
    setSerchKey(value);
  };
  return (
    <div>
      <Header handleSearchInput={handleSearchInput} />
      <Main searchKey={searchKey} />
      <Footer />
    </div>
  );
};

export default App;
