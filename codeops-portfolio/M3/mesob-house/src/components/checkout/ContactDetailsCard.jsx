import { FiMail } from "react-icons/fi";
import CheckoutSection from "./CheckoutSection";
import TextField from "../ui/TextField";
import PhoneField from "../ui/PhoneField";
import { FaShieldHeart } from "react-icons/fa6";
import { Tag } from "../ui/Primitives";

export default function ContactDetailsCard({ badge, values, onChange }) {
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
          value={values.name}
          onChange={(e) => onChange("name", e.target.value)}
        />
        <PhoneField
          label="Phone (Calls & Telegram SMS)"
          value={values.phone}
          onChange={(e) => onChange("phone", e.target.value)}
        />
      </div>
      <TextField
        label="Email for Digital Receipt"
        icon={<FiMail />}
        value={values.email}
        onChange={(e) => onChange("email", e.target.value)}
      />
    </CheckoutSection>
  );
}
