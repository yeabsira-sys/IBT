/**
 * API base URL and endpoints for the Addis Eats backend.
 * Centralized here so a future environment-variable swap
 * (e.g. import.meta.env.VITE_API_BASE_URL) only touches one file.
 */
export const API_BASE_URL = "https://addis-eats-backend.onrender.com";

export const API_ENDPOINTS = {
  /** Full dish catalog. */
  menu: `${API_BASE_URL}/menu`,
  /** Today's curated specials (one highlighted dish per category). */
  specials: `${API_BASE_URL}/menu/specials`,
};
