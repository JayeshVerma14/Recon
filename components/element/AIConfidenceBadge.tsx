import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

type Bucket = { label: string; className: string };

/** 0–100 confidence, bucketed into the four documented states. */
export function confidenceBucket(confidence: number | null): Bucket {
  if (confidence === null) {
    return { label: "Unmapped", className: "bg-foreground/[0.06] text-muted-foreground" };
  }
  if (confidence >= 90) {
    return { label: "High", className: "bg-[rgba(23,152,100,0.12)] text-[#0F7048]" };
  }
  if (confidence >= 70) {
    return { label: "Medium", className: "bg-[rgba(245,158,11,0.12)] text-[#B45309]" };
  }
  return { label: "Low", className: "bg-[rgba(220,38,38,0.12)] text-[#B91C1C]" };
}

export function AIConfidenceBadge({
  confidence,
  showValue = false,
  showIcon = true,
  valueOnly = false,
  className,
}: {
  confidence: number | null;
  showValue?: boolean;
  showIcon?: boolean;
  /** Renders just the tinted percentage — for dense table cells. */
  valueOnly?: boolean;
  className?: string;
}) {
  const bucket = confidenceBucket(confidence);

  if (valueOnly) {
    return (
      <span
        className={cn(
          "tabular inline-flex items-center rounded px-1.5 py-0.5 font-mono text-[11px] font-medium",
          bucket.className,
          className
        )}
      >
        {confidence === null ? "—" : `${confidence}%`}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase leading-4 tracking-wider",
        bucket.className,
        className
      )}
    >
      {showIcon && <Sparkles className="h-2.5 w-2.5" aria-hidden />}
      {bucket.label}
      {showValue && confidence !== null && (
        <span className="tabular font-mono normal-case tracking-normal opacity-70">
          {confidence}
        </span>
      )}
    </span>
  );
}
