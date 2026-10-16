import { requireSession } from "../../lib/auth";
import CheckoutClient from "../../components/CheckoutClient";

export default async function CheckoutPage() {
  // Verify the session on the server before rendering checkout.
  await requireSession();

  return <CheckoutClient />;
}
