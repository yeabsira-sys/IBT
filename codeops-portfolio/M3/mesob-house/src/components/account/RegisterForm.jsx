import { useState } from "react";
import { FcGoogle } from "react-icons/fc";
import { FiArrowRight, FiMail, FiMessageSquare, FiUser } from "react-icons/fi";
import { FaMobileScreenButton } from "react-icons/fa6";

import { Link } from "react-router-dom";
import Button from "../ui/Button";
import Checkbox from "../ui/Checkbox";
import ChipGroup from "../ui/ChipGroup";
import PasswordField from "../ui/PasswordField";
import PhoneField from "../ui/PhoneField";
import SocialButton from "../ui/SocialButton";
import TextField from "../ui/TextField";
import { Card, Divider } from "../ui/Surface";

const EMPTY = {
  fullName: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
  preference: "all-heritage",
  agreed: false,
};

function validate(values) {
  const errors = {};
  if (!values.fullName.trim()) errors.fullName = "Enter the name to reserve tables under.";
  if (!/^\d{9}$/.test(values.phone.replace(/\s/g, "")))
    errors.phone = "Enter 9 digits after +251, e.g. 911 234 567.";
  if (!/^\S+@\S+\.\S+$/.test(values.email)) errors.email = "Enter a valid email address.";
  if (values.password.length < 8) errors.password = "Use at least 8 characters.";
  if (values.confirmPassword !== values.password)
    errors.confirmPassword = "Both passwords must match.";
  if (!values.agreed) errors.agreed = "Accept the terms to continue.";
  return errors;
}

/**
 * RegisterForm — the account-creation card.
 * Props: dietaryOptions, onSubmit(values), onTelebirr, onGoogle, onSignIn.
 */
export default function RegisterForm({
  dietaryOptions = [],
  onSubmit,
  onTelebirr,
  onGoogle,
  onSignIn,
}) {
  const [values, setValues] = useState(EMPTY);
  const [errors, setErrors] = useState({});

  const set = (key) => (event) => {
    const value = event?.target ? event.target.value : event;
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const nextErrors = validate(values);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) onSubmit?.(values);
  };

  return (
    <Card variant="raised" className="register" as="div">
      <div>
        <h2 className="register__title">Create Your Mesob House Account</h2>
        <p className="register__lede">
          Join our culinary heritage circle in less than a minute.
        </p>
      </div>

      <div className="register__social">
        <SocialButton
          logo={<FaMobileScreenButton color="var(--c-gold)" />}
          label="Telebirr Quick Sign"
          onClick={onTelebirr}
        />
        <SocialButton logo={<FcGoogle />} label="Continue with Google" onClick={onGoogle} />
      </div>

      <Divider>Or register with your details</Divider>

      <form className="register__fields" onSubmit={handleSubmit} noValidate>
        <TextField
          label="Full Name"
          optionalText="(ሙሉ ስም)"
          icon={<FiUser />}
          placeholder="e.g. Abebe Bikila or Genet Tadesse"
          value={values.fullName}
          onChange={set("fullName")}
          error={errors.fullName}
          autoComplete="name"
        />

        <PhoneField
          label="Ethiopian Mobile Number"
          optionalText="(ስልክ)"
          placeholder="911 234 567"
          value={values.phone}
          onChange={set("phone")}
          error={errors.phone}
          hint="We'll send a 4-digit code to verify your Ethiopian mobile number."
          hintIcon={<FiMessageSquare />}
          autoComplete="tel-national"
        />

        <TextField
          label="Email Address"
          icon={<FiMail />}
          type="email"
          placeholder="guest@mesobhouse.com"
          value={values.email}
          onChange={set("email")}
          error={errors.email}
          autoComplete="email"
        />

        <div className="register__row">
          <PasswordField
            label="Password"
            placeholder="Minimum 8 characters"
            value={values.password}
            onChange={set("password")}
            error={errors.password}
            showStrength
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm Password"
            placeholder="Repeat password"
            value={values.confirmPassword}
            onChange={set("confirmPassword")}
            error={errors.confirmPassword}
            autoComplete="new-password"
          />
        </div>

        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="field__label" style={{ padding: 0 }}>
            Primary Dining Preference
            <span className="field__optional">(optional)</span>
          </legend>
          <p className="register__section-note">
            Helps our chefs tailor your banquet offerings and fasting recommendations.
          </p>
          <ChipGroup
            label="Primary Dining Preference"
            options={dietaryOptions}
            value={values.preference}
            onChange={set("preference")}
          />
        </fieldset>

        <Checkbox checked={values.agreed} onChange={set("agreed")}>
          I agree to the <Link to="/terms">Mesob House Hospitality Terms</Link> and{" "}
          <Link to="/privacy">Privacy Guidelines</Link>.
          {errors.agreed && (
            <span className="field__hint field__hint--error">{errors.agreed}</span>
          )}
        </Checkbox>

        <Button type="submit" variant="primary" size="lg" block rightIcon={<FiArrowRight />}>
          Create Account &amp; Receive Welcome Gursha
        </Button>
      </form>

      <p className="register__footer">
        Already part of our dining family?{" "}
        <Link to="/sign-in" onClick={onSignIn}>
          Sign in here
        </Link>
      </p>
    </Card>
  );
}
