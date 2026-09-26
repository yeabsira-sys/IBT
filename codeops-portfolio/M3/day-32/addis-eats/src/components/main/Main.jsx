import Sidebar from "../sidebar/Sidebar";
import Menu from "../menu/Menu";
import Cart from "../cart/Cart";
import "./main.css";

const Main = ({ searchKey }) => {
  return (
    <div className="main-container">
      <Sidebar />

      <div>
        <Menu searchKey={searchKey} />
        <Cart />
      </div>
    </div>
  );
};

export default Main;
