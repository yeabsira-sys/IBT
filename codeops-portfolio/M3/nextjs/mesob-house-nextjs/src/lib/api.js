/**
 * Backend location. Read on the server only (Server Components, Route
 * Handlers, Server Actions), so the browser never calls this host directly —
 * which also means the backend's missing CORS headers no longer matter.
 */
export const API_BASE_URL =
  process.env.API_BASE_URL ?? "https://addis-eats-backend.onrender.com";

export const API_ENDPOINTS = {
  menu: `${API_BASE_URL}/menu`,
  specials: `${API_BASE_URL}/menu/specials`,
};

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
