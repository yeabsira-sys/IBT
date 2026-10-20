/** FulfillmentToggle — full-width "Delivery" / "Pickup" pill switch. */
export default function FulfillmentToggle({ options, value, onChange }) {
  return (
    <div className="fulfillment-toggle" role="tablist" aria-label="Fulfillment method">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={value === option.value}
          className={`fulfillment-toggle__tab${
            value === option.value ? " fulfillment-toggle__tab--active" : ""
          }`}
          onClick={() => onChange(option.value)}
        >
          <span aria-hidden="true">{option.icon}</span>
          {option.label}
        </button>
      ))}
    </div>
  );
}
