import { ImageResponse } from "next/og";

export const alt = "Mesob House — Authentic Habesha Dining in Addis Ababa";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Generated at build time: the card shown when the site is shared on social media. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 90,
          background: "#fdf7f2",
          color: "#2f1e17",
        }}
      >
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, color: "#c08a2e", textTransform: "uppercase" }}>
          Traditional Habesha Hearth
        </div>
        <div style={{ display: "flex", fontSize: 108, fontWeight: 700, color: "#8c2116", marginTop: 18 }}>Mesob House</div>
        <div style={{ display: "flex", fontSize: 38, marginTop: 24, maxWidth: 900 }}>
          Slow-cooked wats, stone-ground teff injera and a daily coffee ceremony in Addis Ababa.
        </div>
      </div>
    ),
    size,
  );
}
