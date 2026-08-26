import "./dish.css";

const Dish = ({ name, price }) => {
  return (
    <div className="dish">
      <div className="dishimg-container">
        <img src="hero.png" alt="dish iamge" />
      </div>
      <h4>{name}</h4>
      <p>{price} ETB</p>
    </div>
  );
};

export default Dish;
