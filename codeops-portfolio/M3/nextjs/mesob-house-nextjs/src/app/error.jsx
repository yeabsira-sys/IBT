"use client";

import { useEffect } from "react";
import ErrorFallback from "@/components/error/ErrorFallback";

/**
 * Route-level error boundary: if anything below the root layout throws while
 * rendering, the navbar stays and this card replaces the page content.
 */
export default function RouteError({ error, reset, retry }) {
  useEffect(() => {
    console.error("[route error]", error);
  }, [error]);

  return (
    <main className="site-main">
      <ErrorFallback onRetry={retry ?? reset} />
    </main>
  );
}
