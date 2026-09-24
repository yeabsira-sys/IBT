import { FiMail } from "react-icons/fi";
import { FaShieldHeart } from "react-icons/fa6";

import CheckoutSection from "./CheckoutSection";
import TextField from "../ui/TextField";
import PhoneField from "../ui/PhoneField";
import { Tag } from "../ui/Primitives";

export default function ContactDetailsCard({ badge, register, errors }) {
  return (
    <CheckoutSection
      number={1}
      icon={<FaShieldHeart />}
      title="Contact & Guest Details"
      trailing={badge && <Tag tone="gold">{badge}</Tag>}
    >
      <div className="checkout-grid checkout-grid--2">
        <TextField
          label="Recipient Name"
          {...register("name")}
          error={errors.name?.message}
          autoComplete="name"
          placeholder="Abebe Kebede"
        />

        <PhoneField
          label="Phone (Calls & Telegram SMS)"
          {...register("phone")}
          error={errors.phone?.message}
          autoComplete="tel-national"
          placeholder="911234567"
        />
      </div>

      <TextField
        label="Email for Digital Receipt"
        icon={<FiMail />}
        type="email"
        {...register("email")}
        error={errors.email?.message}
        autoComplete="email"
        placeholder="example@email.com"
      />
    </CheckoutSection>
  );
}
