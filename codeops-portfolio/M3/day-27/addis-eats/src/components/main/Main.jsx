import Sidebar from "../sidebar/Sidebar";
import Menu from "../menu/Menu";
import "./main.css";

const Main = () => {
  return (
    <div className="main-container">
      <Sidebar />
      <Menu />
    </div>
  );
};

export default Main;
