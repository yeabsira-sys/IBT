import Link from "next/link";

export default function NotFound() {
  return <main className="container section"><div className="empty-state"><span className="eyebrow">404 · Not found</span><h2>This page wandered off</h2><p>Let’s get you back to something delicious.</p><Link className="btn" href="/">Go home</Link></div></main>;
}
