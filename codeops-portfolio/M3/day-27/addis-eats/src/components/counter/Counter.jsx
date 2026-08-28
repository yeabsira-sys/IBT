import "./counter.css";
import { useState } from "react";

const Counter = () => {
  let [amount, setAmount] = useState(0);
  const handleClick = () => {
    setAmount(++amount);
  };
  return (
    <div className="add">
      <button onClick={handleClick}>add {amount && amount}</button>
    </div>
  );
};

export default Counter;
