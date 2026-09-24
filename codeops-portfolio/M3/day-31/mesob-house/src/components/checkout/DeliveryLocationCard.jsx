import { FaLocationDot } from "react-icons/fa6";

import { FiChevronDown, FiMapPin } from "react-icons/fi";

import CheckoutSection from "./CheckoutSection";
import TextField from "../ui/TextField";
import { OptionCard, OptionCardGroup } from "../ui/OptionCard";
import { Tag } from "../ui/Primitives";

export default function DeliveryLocationCard({
  badge,
  subCities,
  register,
  errors,
  timingOptions,
  timing,
  onTimingChange,
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
              {...register("subCity")}
            >
              <option value="">Select your sub-city</option>
              {subCities.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            <FiChevronDown aria-hidden="true" />
          </div>

          {errors.subCity && (
            <span className="field__hint field__hint--error">
              {errors.subCity.message}
            </span>
          )}
        </div>

        <TextField
          label="Street, Building, Flat No."
          placeholder="Behind Edna Mall, House No. 402, 3rd Floor"
          {...register("street")}
          error={errors.street?.message}
        />
      </div>

      <TextField
        label="Specific Landmark / Gate Instructions"
        placeholder="Opposite Boston Day Spa, dark green gate"
        icon={<FiMapPin />}
        {...register("landmark")}
        error={errors.landmark?.message}
      />

      <p className="checkout-subheading">Desired Dispatch Timing</p>

      <OptionCardGroup columns={2}>
        {timingOptions.map((option) => (
          <OptionCard
            key={option.value}
            title={option.title}
            description={option.description}
            selected={timing === option.value}
            onSelect={() => onTimingChange(option.value)}
          />
        ))}
      </OptionCardGroup>

      {errors.timing && (
        <p className="field__hint field__hint--error">
          {errors.timing.message}
        </p>
      )}

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
