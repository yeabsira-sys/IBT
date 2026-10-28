/**
 * Same-origin check for mutating API requests.
 *
 * Browsers send `Origin` for both same-origin and cross-site fetch requests.
 * Compare it with the public origin of the incoming request (including
 * Vercel's forwarded host) and, when configured, the canonical APP_ORIGIN.
 *
 * Requests without an Origin header stay allowed for server-to-server/curl
 * use, matching the previous behavior.
 */

function normalizeOrigin(value) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function requestOrigin(request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host =
    forwardedHost?.split(",")[0].trim() || request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol =
    forwardedProto?.split(",")[0].trim() ||
    (forwardedHost ? "https" : new URL(request.url).protocol.replace(":", ""));

  if (host) return normalizeOrigin(`${protocol}://${host}`);
  return normalizeOrigin(request.url);
}

export function isSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;

  const normalized = normalizeOrigin(origin);
  if (!normalized) return false;

  const allowed = new Set();

  for (const value of [process.env.APP_ORIGIN, process.env.NEXT_PUBLIC_SITE_URL]) {
    const candidate = normalizeOrigin(value);
    if (candidate) allowed.add(candidate);
  }

  const currentOrigin = requestOrigin(request);
  if (currentOrigin) allowed.add(currentOrigin);

  return allowed.has(normalized);
}
