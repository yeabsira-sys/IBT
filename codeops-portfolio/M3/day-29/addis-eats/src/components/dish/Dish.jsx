import PropTypes from "prop-types";
import "./dish.css";

const Dish = ({ id, name, price, spicy = false, onAdd }) => {
  const dish = {
    id,
    name,
    price,
    spicy,
  };

  return (
    <div className="dish">
      <div className="dishimg-container">
        <img src="/hero.png" alt={`${name} food`} />
      </div>

      <h4>
        {name} {spicy && <small>🌶️ spicy</small>}
      </h4>

      <p>{price} ETB</p>

      <button onClick={() => onAdd(dish)}>Add to cart</button>
    </div>
  );
};

Dish.propTypes = {
  id: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired,
  price: PropTypes.number.isRequired,
  spicy: PropTypes.bool,
  onAdd: PropTypes.func.isRequired,
};

export default Dish;
