"use server";

import {
  createUser,
  findOrCreateSocialUser,
  findUserByIdentifier,
  toSafeUser,
  verifyPassword,
} from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { registerSchema, signInSchema } from "@/lib/schemas";

const invalid = {
  ok: false,
  message:
    "We couldn't match those sign-in details. Register first or try again.",
};

export async function signInAction(values) {
  const parsed = signInSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check your sign-in details.",
    };
  }

  const { method, email, mobile, password, keepSignedIn } = parsed.data;
  const identifier = method === "email" ? email : mobile;
  const user = await findUserByIdentifier(identifier);
  if (!user || !verifyPassword(password, user.passwordHash)) return invalid;

  await createSession(user.id, { remember: Boolean(keepSignedIn) });
  return {
    ok: true,
    message: `Welcome back, ${user.fullName.split(" ")[0]}.`,
    user: toSafeUser(user),
  };
}

export async function registerAction(values) {
  const parsed = registerSchema.safeParse(values);
  if (!parsed.success) {
    return {
      ok: false,
      message: parsed.error.issues[0]?.message ?? "Check your details.",
    };
  }

  const { fullName, phone, email, password, preference } = parsed.data;
  const created = await createUser({
    fullName,
    phone,
    email,
    password,
    preference,
    role: "customer",
    provider: "password",
  });
  if (!created.ok) return created;

  await createSession(created.user.id);
  return {
    ok: true,
    message: "Your Mesob House account is ready. Welcome to the table.",
    user: toSafeUser(created.user),
  };
}

/** Demo social buttons: they still create a real server session for a demo customer. */
export async function socialSignInAction(provider) {
  const allowed = ["Telebirr", "Google"];
  if (!allowed.includes(provider))
    return { ok: false, message: "Unknown sign-in provider." };
  const user = await findOrCreateSocialUser(provider);
  if (!user) return { ok: false, message: "Could not open a demo session." };
  await createSession(user.id);
  return {
    ok: true,
    message: `${provider} demo sign-in complete.`,
    user: toSafeUser(user),
  };
}

export async function signOutAction() {
  await destroySession();
  return { ok: true, message: "Signed out." };
}
