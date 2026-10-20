"use client";

import { create } from "zustand";

let nextId = 1;

export const useToastStore = create((set, get) => ({
  toasts: [],
  addToast: (message, tone = "success", duration = 3200) => {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }));
    setTimeout(() => get().dismissToast(id), duration);
    return id;
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

/** useToast — returns `toast(message, tone?, duration?)`. tone: "success" | "error" | "info". */
export function useToast() {
  return useToastStore((state) => state.addToast);
}
