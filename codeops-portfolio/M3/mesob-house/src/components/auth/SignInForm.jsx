import { useState } from "react";
import { Link } from "react-router-dom";
import { FiArrowRight, FiLock, FiMail } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { FaMobileScreenButton } from "react-icons/fa6";

import Button from "../ui/Button";
import Checkbox from "../ui/Checkbox";
import PasswordField from "../ui/PasswordField";
import PhoneField from "../ui/PhoneField";
import SocialButton from "../ui/SocialButton";
import TextField from "../ui/TextField";
import { Card, Divider } from "../ui/Surface";
import { Segmented } from "../ui/OptionCard";

const METHODS = [
  { value: "mobile", label: "Ethiopian Mobile (+251)" },
  { value: "email", label: "Email Address" },
];

const EMPTY = {
  mobile: "",
  email: "",
  password: "",
  keepSignedIn: false,
  rememberAddress: false,
};

/**
 * SignInForm — the member portal card: social sign-in, phone/email toggle,
 * password, remember options, and the guest / register fallbacks.
 */
export default function SignInForm({
  onSubmit,
  onTelebirr,
  onGoogle,
  onForgotPassword,
}) {
  const [method, setMethod] = useState("mobile");
  const [values, setValues] = useState(EMPTY);

  const set = (key) => (event) => {
    const value = event?.target
      ? event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value
      : event;
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit?.({ method, ...values });
  };

  return (
    <Card variant="raised" className="sign-in">
      <div>
        <p className="sign-in__eyebrow">Member Portal</p>
        <h2 className="sign-in__title">Welcome to the Mesob Table</h2>
        <p className="sign-in__lede">
          Sign in to manage your feasts, Telebirr rewards, and reserved dining
          mesobs.
        </p>
      </div>

      <div className="sign-in__social">
        <SocialButton
          logo={<FaMobileScreenButton color="var(--c-gold)" />}
          label="Telebirr SuperApp"
          sub="Scan or Tap to Login"
          onClick={onTelebirr}
        />
        <SocialButton
          logo={<FcGoogle />}
          label="Google Sign-In"
          sub="Continue with Google"
          onClick={onGoogle}
        />
      </div>

      <Divider>Or with Phone / Email</Divider>

      <form className="sign-in__fields" onSubmit={handleSubmit} noValidate>
        <Segmented options={METHODS} value={method} onChange={setMethod} />

        {method === "mobile" ? (
          <PhoneField
            label="Ethiopian Mobile Number"
            hint="SMS OTP Supported"
            placeholder="091 123 4567"
            value={values.mobile}
            onChange={set("mobile")}
            autoComplete="tel-national"
          />
        ) : (
          <TextField
            label="Email Address"
            icon={<FiMail />}
            type="email"
            placeholder="guest@mesobhouse.com"
            value={values.email}
            onChange={set("email")}
            autoComplete="email"
          />
        )}

        <div className="sign-in__password-row">
          <label className="field__label" htmlFor="password">
            Password
          </label>
          <button
            type="button"
            className="link-quiet"
            onClick={onForgotPassword}
          >
            Forgot Password?
          </button>
        </div>
        <PasswordField
          id="password"
          icon={<FiLock />}
          placeholder="Enter your confidential password"
          value={values.password}
          onChange={set("password")}
          autoComplete="current-password"
        />

        <div className="sign-in__remember">
          <Checkbox
            checked={values.keepSignedIn}
            onChange={set("keepSignedIn")}
          >
            Keep me signed in on this device
          </Checkbox>
          <Checkbox
            checked={values.rememberAddress}
            onChange={set("rememberAddress")}
          >
            Remember Addis address
          </Checkbox>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          block
          rightIcon={<FiArrowRight />}
        >
          Sign In to Mesob House
        </Button>
      </form>

      <Divider />

      <div className="sign-in__footer">
        <p>
          New to our dining family?
          <br />
          <Link to="/register" className="sign-in__join">
            Join the Mesob Table &amp; Register ›
          </Link>
        </p>
        <Button as={Link} to="/" variant="soft" size="sm">
          Continue as Guest
        </Button>
      </div>
    </Card>
  );
}
