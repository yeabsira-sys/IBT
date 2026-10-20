"use client";

import { useEffect } from "react";
import { useStore } from "@/store/appStore";

/** Loads the saved cart/favorites/checkout from localStorage right after the first client render. */
export default function StoreHydrator() {
  useEffect(() => {
    Promise.resolve(useStore.persist.rehydrate()).then(() => {
      // A corrupt saved payload leaves the store unhydrated, which would keep
      // the account/checkout guards on their loader forever. Start clean.
      if (useStore.persist.hasHydrated()) return;
      try {
        localStorage.removeItem("mesob-house-store");
      } catch {
        // storage unavailable — nothing more we can do
      }
      useStore.persist.rehydrate();
    });
  }, []);
  return null;
}
