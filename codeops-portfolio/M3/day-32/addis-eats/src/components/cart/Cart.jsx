import { useCart } from "../../context/CartContext";
import "./cart.css";

const Cart = () => {
  const { cart, total, dispatch } = useCart();

  if (cart.length === 0) {
    return (
      <section className="cart">
        <h2>Your Cart</h2>
        <p>Your cart is empty.</p>
      </section>
    );
  }

  return (
    <section className="cart">
      <h2>Your Cart</h2>

      {cart.map((item) => (
        <article className="cart-item" key={item.id}>
          <div>
            <h3>{item.name}</h3>
            <p>{item.price} ETB each</p>
          </div>

          <div className="cart-controls">
            <button
              onClick={() =>
                dispatch({
                  type: "DECREASE",
                  payload: item.id,
                })
              }
            >
              −
            </button>

            <span>{item.quantity}</span>

            <button
              onClick={() =>
                dispatch({
                  type: "INCREASE",
                  payload: item.id,
                })
              }
            >
              +
            </button>

            <button
              onClick={() =>
                dispatch({
                  type: "REMOVE_ITEM",
                  payload: item.id,
                })
              }
            >
              Remove
            </button>
          </div>
        </article>
      ))}

      <h3 className="cart-total">Total: {total} ETB</h3>

      <button
        className="clear-cart"
        onClick={() => dispatch({ type: "CLEAR_CART" })}
      >
        Clear Cart
      </button>
    </section>
  );
};

export default Cart;
