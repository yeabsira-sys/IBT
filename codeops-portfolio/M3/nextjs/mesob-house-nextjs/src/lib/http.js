/** True when a mutating API request came from this same origin (or a server). */
export function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true; // curl, health checks, server-to-server

  const parsedOrigin = new URL(origin).origin;
  const requestOrigin = new URL(request.url).origin;
  try {
    console.log("Same-origin check:", {
      origin: parsedOrigin,
      requestOrigin,
      matches: parsedOrigin === requestOrigin,
    });
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
