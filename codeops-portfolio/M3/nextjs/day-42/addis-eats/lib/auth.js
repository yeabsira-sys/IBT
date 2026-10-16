import "server-only";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getSession } from "./session";

export async function authenticateUser(email, password) {
  const normalizedEmail = email.trim().toLowerCase();

  const accounts = [
    {
      id: "customer-1",
      name: "Addis Eats Customer",
      email: process.env.CUSTOMER_EMAIL?.trim().toLowerCase(),
      passwordHash: process.env.CUSTOMER_PASSWORD_HASH?.trim(),
      role: "customer",
    },
    {
      id: "staff-1",
      name: "Addis Eats Staff",
      email: process.env.STAFF_EMAIL?.trim().toLowerCase(),
      passwordHash: process.env.STAFF_PASSWORD_HASH?.trim(),
      role: "staff",
    },
  ];

  console.log("Authentication diagnostic:", {
    submittedEmail: normalizedEmail,
    customerEmailConfigured: Boolean(process.env.CUSTOMER_EMAIL),
    customerHashConfigured: Boolean(process.env.CUSTOMER_PASSWORD_HASH),
    staffEmailConfigured: Boolean(process.env.STAFF_EMAIL),
    staffHashConfigured: Boolean(process.env.STAFF_PASSWORD_HASH),
  });

  const account = accounts.find(
    (item) => item.email && item.passwordHash && item.email === normalizedEmail,
  );

  if (!account) {
    console.log(
      "Authentication failed: account not found or configuration missing.",
    );
    return null;
  }

  let passwordMatches;

  try {
    passwordMatches = await bcrypt.compare(password, account.passwordHash);
  } catch (error) {
    console.error("Password comparison failed:", error.message);
    return null;
  }

  console.log("Password matches:", passwordMatches);

  if (!passwordMatches) {
    return null;
  }

  return {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role,
  };
}

export async function requireSession() {
  const user = await getSession();

  if (!user) {
    redirect("/signin");
  }

  return user;
}

export async function requireRole(role) {
  const user = await requireSession();

  if (user.role !== role) {
    throw new Error("Forbidden: insufficient permissions.");
  }

  return user;
}
