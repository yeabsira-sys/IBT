"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

const MENU_API = "https://addis-eats-backend.onrender.com/menu";

export function useMenu() {
  return useSWR(MENU_API, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 2000,
    keepPreviousData: true,
  });
}
