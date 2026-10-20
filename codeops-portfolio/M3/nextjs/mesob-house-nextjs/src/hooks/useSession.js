"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";

export const SESSION_KEY = "/api/auth/session";

/**
 * Session as a cached client query. The navbar uses this instead of reading
 * cookies (httpOnly) or making every page dynamic just to render the header.
 */
export default function useSession() {
  const { data, error, isLoading, mutate } = useSWR(SESSION_KEY, fetcher, {
    revalidateOnFocus: true,
    shouldRetryOnError: false,
  });

  return {
    user: data?.user ?? null,
    isLoading,
    error,
    mutate,
  };
}
