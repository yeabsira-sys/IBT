/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // next/image only optimises hosts listed here.
  images: {
    // Set IMAGES_UNOPTIMIZED=true to serve images straight from their source
    // (e.g. static hosting without an image optimiser, or offline testing).
    unoptimized: process.env.IMAGES_UNOPTIMIZED === "true",
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "addis-eats-backend.onrender.com" },
    ],
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
