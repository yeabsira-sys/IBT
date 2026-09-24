import { Link } from "react-router-dom";
import { FiArrowRight, FiMail, FiLock } from "react-icons/fi";
import { FcGoogle } from "react-icons/fc";
import { FaMobileScreenButton } from "react-icons/fa6";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import Button from "../ui/Button";
import Checkbox from "../ui/Checkbox";
import PasswordField from "../ui/PasswordField";
import PhoneField from "../ui/PhoneField";
import SocialButton from "../ui/SocialButton";
import TextField from "../ui/TextField";
import { Card, Divider } from "../ui/Surface";
import { Segmented } from "../ui/OptionCard";

const METHODS = [
  {
    value: "mobile",
    label: "Ethiopian Mobile (+251)",
  },
  {
    value: "email",
    label: "Email Address",
  },
];

const signInSchema = z
  .object({
    method: z.enum(["mobile", "email"]),

    mobile: z.string(),

    email: z.string(),

    password: z.string().min(1, "Enter your password."),

    keepSignedIn: z.boolean(),

    rememberAddress: z.boolean(),
  })
  .superRefine((values, ctx) => {
    if (values.method === "mobile") {
      const mobile = values.mobile.replace(/\s/g, "");

      if (!mobile) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mobile"],
          message: "Enter your Ethiopian mobile number.",
        });
      } else if (!/^\d{9}$/.test(mobile)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["mobile"],
          message: "Enter 9 digits after +251, e.g. 911 234 567.",
        });
      }
    }

    if (values.method === "email") {
      if (!values.email.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: "Enter your email address.",
        });
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["email"],
          message: "Enter a valid email address.",
        });
      }
    }
  });

const DEFAULT_VALUES = {
  method: "mobile",
  mobile: "",
  email: "",
  password: "",
  keepSignedIn: false,
  rememberAddress: false,
};

export default function SignInForm({
  onSubmit,
  onTelebirr,
  onGoogle,
  onForgotPassword,
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signInSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
  });

  const method = watch("method");
  const password = watch("password");
  const keepSignedIn = watch("keepSignedIn");
  const rememberAddress = watch("rememberAddress");

  const submitForm = (values) => {
    onSubmit?.(values);
  };

  const handleMethodChange = (value) => {
    setValue("method", value, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleKeepSignedInChange = (event) => {
    const value = event?.target?.checked ?? Boolean(event);

    setValue("keepSignedIn", value, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleRememberAddressChange = (event) => {
    const value = event?.target?.checked ?? Boolean(event);

    setValue("rememberAddress", value, {
      shouldValidate: true,
      shouldDirty: true,
    });
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

      <form
        className="sign-in__fields"
        onSubmit={handleSubmit(submitForm)}
        noValidate
      >
        <Segmented
          options={METHODS}
          value={method}
          onChange={handleMethodChange}
        />

        {method === "mobile" ? (
          <PhoneField
            label="Ethiopian Mobile Number"
            hint="SMS OTP Supported"
            placeholder="091 123 4567"
            {...register("mobile")}
            error={errors.mobile?.message}
            autoComplete="tel-national"
          />
        ) : (
          <TextField
            label="Email Address"
            icon={<FiMail />}
            type="email"
            placeholder="guest@mesobhouse.com"
            {...register("email")}
            error={errors.email?.message}
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
          {...register("password")}
          passwordValue={password}
          error={errors.password?.message}
          autoComplete="current-password"
        />

        <div className="sign-in__remember">
          <Checkbox checked={keepSignedIn} onChange={handleKeepSignedInChange}>
            Keep me signed in on this device
          </Checkbox>

          <Checkbox
            checked={rememberAddress}
            onChange={handleRememberAddressChange}
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
