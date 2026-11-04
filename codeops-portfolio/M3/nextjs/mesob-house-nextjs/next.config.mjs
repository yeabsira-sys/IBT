/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // The repository root also has a package-lock.json, so pin Turbopack to this
  // app instead of letting Next infer the parent workspace.
  turbopack: { root: import.meta.dirname },

  // next/image only optimises hosts listed here.
  images: {
    // Set IMAGES_UNOPTIMIZED=true to serve images straight from their source
    // (e.g. static hosting without an image optimiser, or offline testing).
    unoptimized: process.env.IMAGES_UNOPTIMIZED === "true",
    // Catalogue images are admin-owned. Allow HTTPS URLs so an editor can
    // paste a CDN URL, not only the Unsplash images used by the seed data.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },

  async redirects() {
    return [
      // The nav's old "Featured Dish" URL, and a friendlier alias for dish pages.
      { source: "/featured", destination: "/dish/doro-wat", permanent: false },
      { source: "/menu/:slug", destination: "/dish/:slug", permanent: true },
      // The assessment uses /signin?next=...; keep the query string while
      // sending it to the canonical route.
      { source: "/signin", destination: "/sign-in", permanent: false },
    ];
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
