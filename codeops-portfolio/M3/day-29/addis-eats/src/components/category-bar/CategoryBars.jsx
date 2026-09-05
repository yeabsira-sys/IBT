import PropTypes from "prop-types";
import "./categoryBar.css";

const categories = ["All", "Main", "Vegetarian", "Breakfast", "Side"];

const CategoryBar = ({ selected, onSelect }) => {
  return (
    <div className="category-bar">
      {categories.map((category) => (
        <button
          key={category}
          className={selected === category ? "active" : ""}
          onClick={() => onSelect(category)}
        >
          {category}
        </button>
      ))}
    </div>
  );
};

CategoryBar.propTypes = {
  selected: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
};

export default CategoryBar;
