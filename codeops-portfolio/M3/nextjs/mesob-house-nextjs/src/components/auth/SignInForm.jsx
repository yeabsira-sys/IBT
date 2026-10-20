"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { signInSchema } from "@/lib/schemas";
import { useToast } from "@/store/toastStore";
import { signInAction, socialSignInAction } from "@/actions/auth";
import { SESSION_KEY } from "@/hooks/useSession";
import { useSWRConfig } from "swr";

const METHODS = [
  { value: "mobile", label: "Ethiopian Mobile (+251)" },
  { value: "email", label: "Email Address" },
];

const DEFAULTS = { method: "mobile", mobile: "", email: "", password: "", keepSignedIn: false, rememberAddress: false };

/**
 * SignInForm — member portal card. `next` is the already-sanitised path the
 * proxy sent the guest here from (e.g. /account), so they land back there.
 */
export default function SignInForm({ next = "/" }) {
  const router = useRouter();
  const toast = useToast();
  const { mutate } = useSWRConfig();

  const {
    register,
    handleSubmit,
    control,
    watch,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(signInSchema), defaultValues: DEFAULTS, mode: "onTouched" });

  const method = watch("method");

  const finish = async (resultPromise) => {
    const result = await resultPromise;
    toast(result.message, result.ok ? "success" : "error");
    if (!result.ok) return;
    await mutate(SESSION_KEY);
    router.push(next);
    router.refresh();
  };

  return (
    <Card variant="raised" className="sign-in">
      <div>
        <p className="sign-in__eyebrow">Member Portal</p>
        <h2 className="sign-in__title">Welcome to the Mesob Table</h2>
        <p className="sign-in__lede">
          Sign in to manage your feasts, Telebirr rewards, and reserved dining mesobs.
        </p>
      </div>

      <div className="sign-in__social">
        <SocialButton
          logo={<FaMobileScreenButton color="var(--c-gold)" />}
          label="Telebirr SuperApp"
          sub="Scan or Tap to Login"
          onClick={() => finish(socialSignInAction("Telebirr"))}
        />
        <SocialButton
          logo={<FcGoogle />}
          label="Google Sign-In"
          sub="Continue with Google"
          onClick={() => finish(socialSignInAction("Google"))}
        />
      </div>

      <Divider>Or with Phone / Email</Divider>

      <form className="sign-in__fields" onSubmit={handleSubmit((values) => finish(signInAction(values)))} noValidate>
        <Controller
          name="method"
          control={control}
          render={({ field }) => (
            <Segmented
              options={METHODS}
              value={field.value}
              onChange={(value) => {
                clearErrors();
                field.onChange(value);
              }}
            />
          )}
        />

        {method === "mobile" ? (
          <PhoneField
            label="Ethiopian Mobile Number"
            hint="SMS OTP Supported"
            placeholder="091 123 4567"
            autoComplete="tel-national"
            error={errors.mobile?.message}
            {...register("mobile")}
          />
        ) : (
          <TextField
            label="Email Address"
            icon={<FiMail />}
            type="email"
            placeholder="guest@mesobhouse.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register("email")}
          />
        )}

        <div className="sign-in__password-row">
          <label className="field__label" htmlFor="password">
            Password
          </label>
          <button
            type="button"
            className="link-quiet"
            onClick={() => toast("Password reset isn't available in this demo — please contact the kitchen desk.", "info")}
          >
            Forgot Password?
          </button>
        </div>
        <PasswordField
          id="password"
          icon={<FiLock />}
          placeholder="Enter your confidential password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />

        <div className="sign-in__remember">
          <Controller
            name="keepSignedIn"
            control={control}
            render={({ field }) => (
              <Checkbox checked={field.value} onChange={field.onChange}>
                Keep me signed in on this device
              </Checkbox>
            )}
          />
          <Controller
            name="rememberAddress"
            control={control}
            render={({ field }) => (
              <Checkbox checked={field.value} onChange={field.onChange}>
                Remember Addis address
              </Checkbox>
            )}
          />
        </div>

        <Button type="submit" variant="primary" size="lg" block rightIcon={<FiArrowRight />} disabled={isSubmitting}>
          Sign In to Mesob House
        </Button>
      </form>

      <Divider />

      <div className="sign-in__footer">
        <p>
          New to our dining family?
          <br />
          <Link href="/register" className="sign-in__join">
            Join the Mesob Table &amp; Register ›
          </Link>
        </p>
        <Button as={Link} href="/" variant="soft" size="sm">
          Continue as Guest
        </Button>
      </div>
    </Card>
  );
}
