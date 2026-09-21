import { FaLocationDot } from "react-icons/fa6";
import { FiChevronDown, FiMapPin } from "react-icons/fi";
import CheckoutSection from "./CheckoutSection";
import TextField from "../ui/TextField";
import { OptionCard, OptionCardGroup } from "../ui/OptionCard";
import { Tag } from "../ui/Primitives";

export default function DeliveryLocationCard({
  badge,
  subCities,
  values,
  onChange,
  timingOptions,
  route,
}) {
  return (
    <CheckoutSection
      number={2}
      icon={<FaLocationDot />}
      title="Delivery Location in Addis Ababa"
      trailing={
        badge && (
          <span className="checkout-card__link">
            <span aria-hidden="true">{badge.icon}</span>
            {badge.label}
          </span>
        )
      }
    >
      <div className="checkout-grid checkout-grid--2">
        <div className="field">
          <label className="field__label" htmlFor="sub-city">
            Sub-City / Neighborhood
          </label>
          <div className="field__control select-field">
            <select
              id="sub-city"
              className="field__input"
              value={values.subCity}
              onChange={(e) => onChange("subCity", e.target.value)}
            >
              {subCities.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
            <FiChevronDown aria-hidden="true" />
          </div>
        </div>

        <TextField
          label="Street, Building, Flat No."
          value={values.street}
          onChange={(e) => onChange("street", e.target.value)}
        />
      </div>

      <TextField
        label="Specific Landmark / Gate Instructions"
        icon={<FiMapPin />}
        value={values.landmark}
        onChange={(e) => onChange("landmark", e.target.value)}
      />

      <p className="checkout-subheading">Desired Dispatch Timing</p>
      <OptionCardGroup columns={2}>
        {timingOptions.map((option) => (
          <OptionCard
            key={option.value}
            title={option.title}
            description={option.description}
            selected={values.timing === option.value}
            onSelect={() => onChange("timing", option.value)}
          />
        ))}
      </OptionCardGroup>

      {route && (
        <div className="route-note">
          <span className="route-note__icon" aria-hidden="true">
            {route.icon}
          </span>
          <div className="route-note__body">
            <h4>{route.title}</h4>
            <p>{route.text}</p>
          </div>
          <Tag tone="green">{route.badge}</Tag>
        </div>
      )}
    </CheckoutSection>
  );
}
