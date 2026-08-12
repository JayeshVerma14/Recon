import { cn } from "@/lib/utils";

/** Pre-baked colour pairs. Background is the accent at 12%; text is the deep step. */
const PAIRS: Record<string, { bg: string; fg: string }> = {
  "Loan Tape": { bg: "rgba(70,100,220,0.12)", fg: "#2F45A8" },
  Servicing: { bg: "rgba(6,182,212,0.12)", fg: "#0E7490" },
  Ledger: { bg: "rgba(245,158,11,0.12)", fg: "#B45309" },
  Collateral: { bg: "rgba(139,92,246,0.12)", fg: "#6D28D9" },
  Analytics: { bg: "rgba(70,100,220,0.12)", fg: "#2F45A8" },
  Remittance: { bg: "rgba(16,185,129,0.12)", fg: "#047857" },
  Compliance: { bg: "rgba(220,38,38,0.12)", fg: "#B91C1C" },
  Escrow: { bg: "rgba(90,183,227,0.12)", fg: "#0369A1" },
};

const FALLBACK = { bg: "rgba(66,84,102,0.10)", fg: "#425466" };

export function CategoryTag({ label, className }: { label: string; className?: string }) {
  const pair = PAIRS[label] ?? FALLBACK;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        className
      )}
      style={{ background: pair.bg, color: pair.fg }}
    >
      {label}
    </span>
  );
}
