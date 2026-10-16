"use client";

export default function MenuError({ reset }) {
  return <main className="container section"><div className="error-panel"><h2>We couldn’t load the menu</h2><p>Please try again in a moment.</p><button className="btn" onClick={() => reset()}>Try again</button></div></main>;
}
