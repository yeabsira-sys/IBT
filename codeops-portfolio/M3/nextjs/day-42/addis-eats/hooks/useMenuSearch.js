"use client";

import { useMemo } from "react";
import { useMenu } from "./useMenu";
import { useDebounce } from "./useDebounce";

export function useMenuSearch(searchTerm) {
  const debouncedTerm = useDebounce(searchTerm, 400).trim();

  const { data, error, isLoading, isValidating, mutate } = useMenu();

  const dishes = useMemo(() => {
    const menu = Array.isArray(data) ? data : (data?.data ?? []);

    if (!debouncedTerm) {
      return menu;
    }

    const term = debouncedTerm.toLowerCase();

    return menu.filter((dish) => {
      const searchableText = [dish.name, dish.description, dish.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(term);
    });
  }, [data, debouncedTerm]);

  return {
    data: dishes,
    error,
    isLoading,
    isValidating,
    mutate,
    searchTerm: debouncedTerm,
  };
}
