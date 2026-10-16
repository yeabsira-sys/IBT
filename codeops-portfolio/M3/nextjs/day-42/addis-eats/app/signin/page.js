import Link from "next/link";
import SignInForm from "../../components/SignInForm";

export default async function SignInPage({ searchParams }) {
  const params = await searchParams;
  const next = typeof params?.next === "string" ? params.next : "/";

  return (
    <main className="section">
      <div className="container">
        <div className="page-heading">
          <span className="eyebrow">Welcome back</span>
          <h1>Sign in to Addis Eats</h1>
          <p>Sign in to access your orders and checkout.</p>
        </div>

        <SignInForm next={next} />

        <p style={{ marginTop: 24 }}>
          <Link href="/menu">Continue browsing the menu</Link>
        </p>
      </div>
    </main>
  );
}
