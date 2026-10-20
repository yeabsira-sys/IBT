"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FcGoogle } from "react-icons/fc";
import { FiArrowRight, FiMail, FiMessageSquare, FiUser } from "react-icons/fi";
import { FaMobileScreenButton } from "react-icons/fa6";

import Button from "../ui/Button";
import Checkbox from "../ui/Checkbox";
import ChipGroup from "../ui/ChipGroup";
import PasswordField from "../ui/PasswordField";
import PhoneField from "../ui/PhoneField";
import SocialButton from "../ui/SocialButton";
import TextField from "../ui/TextField";
import { Card, Divider } from "../ui/Surface";
import { registerSchema } from "@/lib/schemas";
import { useToast } from "@/store/toastStore";
import { registerAction, socialSignInAction } from "@/actions/auth";
import { SESSION_KEY } from "@/hooks/useSession";
import { useSWRConfig } from "swr";

const DEFAULTS = {
  fullName: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
  preference: "all-heritage",
  agreed: false,
};

/**
 * RegisterForm — account creation. react-hook-form owns the field state and
 * zod (via zodResolver) owns the rules, so validation lives in one schema
 * (lib/schemas.js) instead of a hand-written validate() function.
 */
export default function RegisterForm({ dietaryOptions = [] }) {
  const router = useRouter();
  const toast = useToast();
  const { mutate } = useSWRConfig();

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerSchema), defaultValues: DEFAULTS, mode: "onTouched" });

  const finish = async (resultPromise) => {
    const result = await resultPromise;
    toast(result.message, result.ok ? "success" : "error");
    if (!result.ok) return;
    await mutate(SESSION_KEY);
    router.push("/account");
    router.refresh();
  };

  const onSubmit = (values) => finish(registerAction(values));

  return (
    <Card variant="raised" className="register" as="div">
      <div>
        <h2 className="register__title">Create Your Mesob House Account</h2>
        <p className="register__lede">Join our culinary heritage circle in less than a minute.</p>
      </div>

      <div className="register__social">
        <SocialButton
          logo={<FaMobileScreenButton color="var(--c-gold)" />}
          label="Telebirr Quick Sign"
          onClick={() => finish(socialSignInAction("Telebirr"))}
        />
        <SocialButton logo={<FcGoogle />} label="Continue with Google" onClick={() => finish(socialSignInAction("Google"))} />
      </div>

      <Divider>Or register with your details</Divider>

      <form className="register__fields" onSubmit={handleSubmit(onSubmit)} noValidate>
        <TextField
          label="Full Name"
          optionalText="(ሙሉ ስም)"
          icon={<FiUser />}
          placeholder="e.g. Abebe Bikila or Genet Tadesse"
          autoComplete="name"
          error={errors.fullName?.message}
          {...register("fullName")}
        />

        <PhoneField
          label="Ethiopian Mobile Number"
          optionalText="(ስልክ)"
          placeholder="911 234 567"
          hint="We'll send a 4-digit code to verify your Ethiopian mobile number."
          hintIcon={<FiMessageSquare />}
          autoComplete="tel-national"
          error={errors.phone?.message}
          {...register("phone")}
        />

        <TextField
          label="Email Address"
          icon={<FiMail />}
          type="email"
          placeholder="guest@mesobhouse.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <div className="register__row">
          <PasswordField
            label="Password"
            placeholder="Minimum 8 characters"
            showStrength
            strengthValue={watch("password")}
            autoComplete="new-password"
            error={errors.password?.message}
            {...register("password")}
          />
          <PasswordField
            label="Confirm Password"
            placeholder="Repeat password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
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
          <Controller
            name="preference"
            control={control}
            render={({ field }) => (
              <ChipGroup
                label="Primary Dining Preference"
                options={dietaryOptions}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
        </fieldset>

        <Controller
          name="agreed"
          control={control}
          render={({ field }) => (
            <Checkbox checked={field.value} onChange={field.onChange}>
              I agree to the <Link href="/terms">Mesob House Hospitality Terms</Link> and{" "}
              <Link href="/privacy">Privacy Guidelines</Link>.
              {errors.agreed && <span className="field__hint field__hint--error">{errors.agreed.message}</span>}
            </Checkbox>
          )}
        />

        <Button type="submit" variant="primary" size="lg" block rightIcon={<FiArrowRight />} disabled={isSubmitting}>
          Create Account &amp; Receive Welcome Gursha
        </Button>
      </form>

      <p className="register__footer">
        Already part of our dining family? <Link href="/sign-in">Sign in here</Link>
      </p>
    </Card>
  );
}
