import { FcGoogle } from "react-icons/fc";

import { FiArrowRight, FiMail, FiMessageSquare, FiUser } from "react-icons/fi";

import { FaMobileScreenButton } from "react-icons/fa6";

import { Link } from "react-router-dom";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import Button from "../ui/Button";
import Checkbox from "../ui/Checkbox";
import ChipGroup from "../ui/ChipGroup";
import PasswordField from "../ui/PasswordField";
import PhoneField from "../ui/PhoneField";
import SocialButton from "../ui/SocialButton";
import TextField from "../ui/TextField";

import { Card, Divider } from "../ui/Surface";

const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter the name to reserve tables under."),

    phone: z
      .string()
      .transform((value) => value.replace(/\s/g, ""))
      .refine(
        (value) => /^\d{9}$/.test(value),
        "Enter 9 digits after +251, e.g. 911 234 567.",
      ),

    email: z.string().trim().email("Enter a valid email address."),

    password: z.string().min(8, "Use at least 8 characters."),

    confirmPassword: z.string().min(1, "Confirm your password."),

    preference: z.string(),

    agreed: z
      .boolean()
      .refine((value) => value === true, "Accept the terms to continue."),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Both passwords must match.",
    path: ["confirmPassword"],
  });

const DEFAULT_VALUES = {
  fullName: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
  preference: "all-heritage",
  agreed: false,
};

export default function RegisterForm({
  dietaryOptions = [],
  onSubmit,
  onTelebirr,
  onGoogle,
  onSignIn,
}) {
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
  });

  const preference = watch("preference");
  const agreed = watch("agreed");
  const password = watch("password");
  const confirmPassword = watch("confirmPassword");

  const submitForm = (values) => {
    onSubmit?.(values);
  };

  const handlePreferenceChange = (value) => {
    setValue("preference", value, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const handleAgreedChange = (event) => {
    const value = event?.target?.checked ?? Boolean(event);

    setValue("agreed", value, {
      shouldValidate: true,
      shouldDirty: true,
    });
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

        <SocialButton
          logo={<FcGoogle />}
          label="Continue with Google"
          onClick={onGoogle}
        />
      </div>

      <Divider>Or register with your details</Divider>

      <form
        className="register__fields"
        onSubmit={handleSubmit(submitForm)}
        noValidate
      >
        <TextField
          label="Full Name"
          optionalText="(ሙሉ ስም)"
          icon={<FiUser />}
          placeholder="e.g. Abebe Bikila or Genet Tadesse"
          {...register("fullName")}
          error={errors.fullName?.message}
          autoComplete="name"
        />

        <PhoneField
          label="Ethiopian Mobile Number"
          optionalText="(ስልክ)"
          placeholder="911 234 567"
          {...register("phone")}
          error={errors.phone?.message}
          hint="We'll send a 4-digit code to verify your Ethiopian mobile number."
          hintIcon={<FiMessageSquare />}
          autoComplete="tel-national"
        />

        <TextField
          label="Email Address"
          icon={<FiMail />}
          type="email"
          placeholder="guest@mesobhouse.com"
          {...register("email")}
          error={errors.email?.message}
          autoComplete="email"
        />

        <div className="register__row">
          <PasswordField
            label="Password"
            placeholder="Minimum 8 characters"
            {...register("password")}
            passwordValue={password}
            error={errors.password?.message}
            showStrength
            autoComplete="new-password"
          />

          <PasswordField
            label="Confirm Password"
            placeholder="Repeat password"
            {...register("confirmPassword")}
            passwordValue={confirmPassword}
            error={errors.confirmPassword?.message}
            autoComplete="new-password"
          />
        </div>

        <fieldset
          style={{
            border: 0,
            padding: 0,
            margin: 0,
          }}
        >
          <legend className="field__label" style={{ padding: 0 }}>
            Primary Dining Preference{" "}
            <span className="field__optional">(optional)</span>
          </legend>

          <p className="register__section-note">
            Helps our chefs tailor your banquet offerings and fasting
            recommendations.
          </p>

          <ChipGroup
            label="Primary Dining Preference"
            options={dietaryOptions}
            value={preference}
            onChange={handlePreferenceChange}
          />
        </fieldset>

        <Checkbox checked={agreed} onChange={handleAgreedChange}>
          I agree to the <Link to="/terms">Mesob House Hospitality Terms</Link>{" "}
          and <Link to="/privacy">Privacy Guidelines</Link>.
          {errors.agreed && (
            <span className="field__hint field__hint--error">
              {errors.agreed.message}
            </span>
          )}
        </Checkbox>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          block
          rightIcon={<FiArrowRight />}
        >
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
