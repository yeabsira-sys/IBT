import { z } from "zod";

const ethiopianMobile = z
  .string()
  .refine(
    (v) => /^\d{9}$/.test(v.replace(/\s/g, "")),
    "Enter 9 digits after +251, e.g. 911 234 567.",
  );

/** Register form — validated in the browser by react-hook-form via zodResolver. */
export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter the name to reserve tables under."),
    phone: ethiopianMobile,
    email: z.string().trim().email("Enter a valid email address."),
    password: z.string().min(8, "Use at least 8 characters."),
    confirmPassword: z.string(),
    preference: z.string().nullable().optional(),
    agreed: z
      .boolean()
      .refine((v) => v === true, "Accept the terms to continue."),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Both passwords must match.",
  });

/** Sign-in form — which identifier is required depends on the chosen method. */
export const signInSchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("mobile"),
    mobile: ethiopianMobile,
    password: z.string().min(1, "Enter your password."),
    keepSignedIn: z.boolean().optional(),
    rememberAddress: z.boolean().optional(),
  }),
  z.object({
    method: z.literal("email"),
    email: z.string().trim().email("Enter a valid email address."),
    password: z.string().min(1, "Enter your password."),
    keepSignedIn: z.boolean().optional(),
    rememberAddress: z.boolean().optional(),
  }),
]);

/** Checkout payload — validated client-side first, then again on the server. */
export const checkoutSchema = z
  .object({
    fulfillment: z.enum(["delivery", "pickup"]),
    contact: z.object({
      name: z.string().trim().min(2, "Enter the recipient's name."),
      phone: ethiopianMobile,
      email: z.string().trim().email("Enter a valid email for the receipt."),
    }),
    delivery: z.object({
      subCity: z.string().min(1, "Choose a sub-city."),
      street: z.string().trim(),
      landmark: z.string().optional(),
      timing: z.enum(["immediate", "scheduled"]),
    }),
    method: z.string().min(1, "Choose a payment method."),
    couponCode: z.string().optional(),
    note: z
      .string()
      .max(500, "Keep the kitchen note under 500 characters.")
      .optional(),
    items: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          price: z.union([z.string(), z.number()]),
          quantity: z.number().int().min(1).max(50),
        }),
      )
      .min(1, "Your basket is empty. Add dishes before confirming an order."),
  })
  .superRefine((value, ctx) => {
    if (value.fulfillment === "delivery" && value.delivery.street.length < 3) {
      ctx.addIssue({
        code: "custom",
        path: ["delivery", "street"],
        message: "Enter your street, building and flat number for delivery.",
      });
    }
  });
