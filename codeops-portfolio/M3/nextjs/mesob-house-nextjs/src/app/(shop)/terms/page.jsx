export const metadata = {
  title: "Terms of Table",
  description: "Mesob House ordering, account and payment terms.",
};

export default function TermsPage() {
  return (
    <div className="container legal">
      <h1>Terms of Table</h1>
      <h2>Hospitality</h2>
      <p>
        Reservations and delivery orders are accepted at the discretion of the
        kitchen and confirmed by SMS or phone.
      </p>
      <h2>Orders and payment</h2>
      <p>
        Prices are in Ethiopian Birr and include VAT. Payment is taken by
        Telebirr, CBE Birr, card or cash on delivery.
      </p>
      <h2>Accounts</h2>
      <p>
        Keep your sign-in details private. Passwords are hashed on the server, and
        orders are only visible to the account that placed them and to authorised
        kitchen or admin staff. Demo seed accounts should be changed before any
        public deployment.
      </p>
    </div>
  );
}
