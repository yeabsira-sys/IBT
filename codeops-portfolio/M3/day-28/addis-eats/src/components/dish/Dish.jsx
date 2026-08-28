import PropTypes from "prop-types";
import Counter from "../counter/Counter";
import "./dish.css";

const Dish = ({ name, price, currency = "ETB", spicy = false }) => {
  return (
    <div className="dish">
      <div className="dishimg-container">
        <img src="hero.png" alt="food image" />
      </div>
      <h4>
        {name} {spicy && <small> spicy</small>}
      </h4>
      <p>{price + " " + currency} </p>
      <Counter />
    </div>
  );
};

Dish.propTypes = {
  name: PropTypes.string.isRequired,
  price: PropTypes.number.isRequired,
  spicy: PropTypes.bool,
};

export default Dish;
