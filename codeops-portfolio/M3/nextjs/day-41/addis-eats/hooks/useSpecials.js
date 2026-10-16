"use client";

import useSWR from "swr";
import { fetcher } from "../lib/fetcher";

const SPECIALS_API = "https://addis-eats-backend.onrender.com/menu/specials";

export function useSpecials() {
  return useSWR(SPECIALS_API, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 2000,
    keepPreviousData: true,
  });
}
