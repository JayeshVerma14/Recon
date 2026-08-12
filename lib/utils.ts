import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMoney(n: number, compact = false) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(n);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

/** Rates carry exactly one decimal. */
export function formatRate(n: number) {
  return `${n.toFixed(1)}%`;
}

/** ISO on data surfaces. */
export function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}
