/**
 * Client-safe landing paths for each role. Staff should land on their work
 * surface after sign-in, while customers keep the public shop as their home.
 */
export const roleHome = (role) => {
  if (role === "admin") return "/admin";
  if (role === "employee") return "/kitchen";
  return "/";
};

/**
 * Keep an explicit same-site destination (for example a private page the
 * visitor was bounced from), but replace the bare home page with the role's
 * portal. `requestedPath` is already sanitized by the sign-in page.
 */
export function postLoginPath(user, requestedPath = "/") {
  if (typeof requestedPath === "string" && requestedPath && requestedPath !== "/") {
    return requestedPath;
  }
  return roleHome(user?.role);
}
