export const metadata = {
  title: "Privacy Policy",
  description: "How Mesob House handles account, order and session data.",
};

export default function PrivacyPage() {
  return (
    <div className="container legal">
      <h1>Privacy Policy</h1>
      <h2>What we keep</h2>
      <p>
        Your basket, saved dishes and checkout draft are stored in your browser&apos;s
        local storage on this device. Account details, sessions and orders are stored
        on the server so that only you (and authorised kitchen staff) can read your
        orders.
      </p>
      <h2>Cookies</h2>
      <p>
        A single httpOnly cookie carries an opaque session token so private pages can
        be protected. It contains no personal data. Signing out deletes both the cookie
        and the matching server session.
      </p>
      <h2>Contact</h2>
      <p>
        Questions about your data? Call the kitchen desk on +251 911 234 567.
      </p>
    </div>
  );
}
