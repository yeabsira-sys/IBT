import Sidebar from "../sidebar/Sidebar";
import Menu from "../menu/Menu";

import "./main.css";

const Main = ({ searchKey }) => {
  return (
    <div className="main-container">
      <Sidebar />
      <Menu searchKey={searchKey} />
    </div>
  );
};

export default Main;
