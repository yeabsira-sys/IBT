export const API_BASE_URL = "https://addis-eats-backend.onrender.com";

export const API_ENDPOINTS = {
  /** Full dish catalog. */
  menu: `${API_BASE_URL}/menu`,
  //  Today's curated specials (one highlighted dish per category).
  specials: `${API_BASE_URL}/menu/specials`,
};
