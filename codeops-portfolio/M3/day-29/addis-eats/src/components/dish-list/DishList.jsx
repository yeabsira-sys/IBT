import PropTypes from "prop-types";
import Dish from "../dish/Dish";
import "./dishList.css";

const DishList = ({ dishes, onAdd }) => {
  if (dishes.length === 0) {
    return <p className="empty-state">No dishes found.</p>;
  }

  return (
    <div className="dish-list">
      {dishes.map((dish) => (
        <Dish key={dish.id} {...dish} onAdd={onAdd} />
      ))}
    </div>
  );
};

DishList.propTypes = {
  dishes: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      name: PropTypes.string.isRequired,
      category: PropTypes.string.isRequired,
      price: PropTypes.number.isRequired,
      spicy: PropTypes.bool,
    }),
  ).isRequired,
  onAdd: PropTypes.func.isRequired,
};

export default DishList;
