import PropTypes from "prop-types";
import "./dish.css";

const Dish = ({ name, price, currency = "ETB", spicy = false, onAdd }) => {
  return (
    <div className="dish">
      <div className="dishimg-container">
        <img src="hero.png" alt={`${name} food`} />
      </div>

      <h4>
        {name} {spicy && <small> spicy</small>}
      </h4>

      <p>
        {price} {currency}
      </p>

      <button onClick={() => onAdd(price)}>Add to order</button>
    </div>
  );
};

Dish.propTypes = {
  name: PropTypes.string.isRequired,
  price: PropTypes.number.isRequired,
  currency: PropTypes.string,
  spicy: PropTypes.bool,
  onAdd: PropTypes.func.isRequired,
};

export default Dish;
