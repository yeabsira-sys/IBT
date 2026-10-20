"use client";

/**
 * Last-resort boundary for errors in the root layout itself. It replaces the
 * whole document, so it carries its own <html>/<body> and inline styles.
 */
export default function GlobalError({ error, reset, retry }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "#fdf7f2",
          color: "#2f1e17",
          fontFamily: "system-ui, sans-serif",
          textAlign: "center",
          padding: 24,
        }}
      >
        <div>
          <h1 style={{ fontFamily: "Georgia, serif", color: "#8c2116" }}>Mesob House is having a moment</h1>
          <p>Something went wrong on our side. Please try again.</p>
          {error?.digest && <p style={{ fontSize: 12, opacity: 0.6 }}>Reference: {error.digest}</p>}
          <button
            onClick={() => (retry ?? reset)()}
            style={{ background: "#8c2116", color: "#fff", border: 0, padding: "10px 20px", borderRadius: 8, fontWeight: 700, cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
