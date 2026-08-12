import type { LineItem, ReviewStatus, StatementId } from "@/lib/types";

/** The analyst's edit wins over the agent's extracted Document B value. */
export function effectiveValue(item: LineItem) {
  return item.editedValue ?? item.valueB;
}

export function difference(item: LineItem) {
  return Number((effectiveValue(item) - item.valueA).toFixed(2));
}

export function isResolved(item: LineItem) {
  return item.status === "approved" || item.status === "rejected";
}

export function isReviewed(item: LineItem) {
  return item.status === "approved" || item.status === "rejected" || item.status === "edited";
}

export const STATUS_LABEL: Record<ReviewStatus, string> = {
  matched: "Matched",
  mismatched: "Mismatched",
  needs_review: "Needs Review",
  approved: "Approved",
  rejected: "Rejected",
  edited: "Edited",
};

export const STATUS_ORDER: ReviewStatus[] = [
  "matched",
  "mismatched",
  "needs_review",
  "approved",
  "rejected",
  "edited",
];

export function statementProgress(items: LineItem[], statement: StatementId) {
  const rows = items.filter((i) => i.statement === statement);
  const reviewed = rows.filter(isReviewed).length;
  const unresolved = rows.filter(
    (i) => !isReviewed(i) && (i.status === "mismatched" || i.status === "needs_review")
  ).length;
  return { total: rows.length, reviewed, unresolved, pct: rows.length ? (reviewed / rows.length) * 100 : 0 };
}

export function countByStatus(items: LineItem[]) {
  return items.reduce(
    (acc, item) => {
      acc[item.status] = (acc[item.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<ReviewStatus, number>
  );
}

export function projectProgress(items: LineItem[]) {
  const reviewed = items.filter(isReviewed).length;
  return {
    total: items.length,
    reviewed,
    pct: items.length ? Math.round((reviewed / items.length) * 100) : 0,
  };
}

/* ---------------------------------- format --------------------------------- */

export function formatValue(value: number, unit: LineItem["unit"] = "currency") {
  if (unit === "ratio") return value.toFixed(2);
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(abs);
  return value < 0 ? `(${formatted})` : formatted;
}

export function formatDifference(value: number, unit: LineItem["unit"] = "currency") {
  if (value === 0) return "—";
  const sign = value > 0 ? "+" : "−";
  return `${sign}${formatValue(Math.abs(value), unit)}`;
}

export function relativeTime(iso: string, now: Date) {
  const then = new Date(iso).getTime();
  const diffMin = Math.round((now.getTime() - then) / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const hours = Math.round(diffMin / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toISOString().slice(0, 10);
}

export function isoDay(iso: string) {
  return new Date(iso).toISOString().slice(0, 10);
}
