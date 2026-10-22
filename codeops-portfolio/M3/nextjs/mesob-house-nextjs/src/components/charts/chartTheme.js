import { etb } from "@/lib/format";

/** Shared chart colours and formatters. Safe to import from client components. */

export const chartColors = {
  brand: "#8c2116",
  gold: "#a9761a",
  green: "#1e4634",
  inkMuted: "#8f7a6e",
  line: "#eed8c9",
  surface: "#ffffff",
};

export const chartAxisTick = {
  fill: chartColors.inkMuted,
  fontSize: 11,
};

export const chartTooltipStyle = {
  background: chartColors.surface,
  border: `1px solid ${chartColors.line}`,
  borderRadius: 10,
  boxShadow: "0 10px 24px -16px rgba(74, 34, 20, 0.35)",
  color: "#2f1e17",
  fontSize: 12,
};

export const formatETBCurrency = (value) => etb.format(Number(value) || 0);

export const formatCount = (value) => new Intl.NumberFormat("en-ET").format(Number(value) || 0);
