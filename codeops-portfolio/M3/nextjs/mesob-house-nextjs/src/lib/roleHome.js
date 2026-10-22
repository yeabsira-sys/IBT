export const roleHome = (role) => {
  if (role === "admin") return "/admin";
  if (role === "employee") return "/kitchen";
  return "/";
};

export function postLoginPath(user, requestedPath = "/") {
  if (
    typeof requestedPath === "string" &&
    requestedPath &&
    requestedPath !== "/"
  ) {
    return requestedPath;
  }
  return roleHome(user?.role);
}
