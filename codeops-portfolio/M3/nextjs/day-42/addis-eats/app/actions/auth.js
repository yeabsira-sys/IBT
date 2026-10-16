"use server";

import { redirect } from "next/navigation";
import { authenticateUser } from "../../lib/auth";
import { createSession, deleteSession } from "../../lib/session";

function getSafeDestination(value) {
  if (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("\\")
  ) {
    return value;
  }

  return "/";
}

export async function signIn(_previousState, formData) {
  const email = formData.get("email");
  const password = formData.get("password");
  const requestedNext = formData.get("next");

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    return { error: "Enter your email and password." };
  }

  const user = await authenticateUser(email, password);

  if (!user) {
    return { error: "Invalid email or password." };
  }

  await createSession(user);

  const destination = getSafeDestination(requestedNext);

  redirect(destination);
}

export async function signOut() {
  await deleteSession();
  redirect("/");
}
