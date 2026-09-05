import { useState } from "react";
import "./orderForm.css";

const OrderForm = () => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    area: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  };

  const isValidTelebirr = /^(09\d{8}|\+2519\d{8})$/.test(form.phone);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!isValidTelebirr) {
      return;
    }

    alert(`Order submitted for ${form.name}`);
  };

  return (
    <form className="order-form" onSubmit={handleSubmit}>
      <h2>Delivery Information</h2>

      <div>
        <label htmlFor="name">Name</label>

        <input
          type="text"
          id="name"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Enter your name"
          required
        />
      </div>

      <div>
        <label htmlFor="phone">TeleBirr Number</label>

        <input
          type="tel"
          id="phone"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="0911223344"
          required
        />

        {form.phone && (
          <small className={isValidTelebirr ? "valid-phone" : "invalid-phone"}>
            {isValidTelebirr
              ? "Valid TeleBirr number"
              : "Enter a valid TeleBirr number"}
          </small>
        )}
      </div>

      <div>
        <label htmlFor="area">Delivery Area</label>

        <input
          type="text"
          id="area"
          name="area"
          value={form.area}
          onChange={handleChange}
          placeholder="e.g. Bole"
          required
        />
      </div>

      <button type="submit" disabled={!isValidTelebirr}>
        Place Order
      </button>
    </form>
  );
};

export default OrderForm;
