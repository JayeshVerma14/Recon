import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/** Pill spec: 6px x-padding, 1.5px y-padding, 11px uppercase, 12% tinted fill. */
const tagVariants = cva(
  "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase leading-4 tracking-wider",
  {
    variants: {
      variant: {
        neutral: "bg-foreground/[0.06] text-muted-foreground",
        outline: "border border-border text-muted-foreground",
        brand: "bg-[rgba(70,100,220,0.12)] text-[#2F45A8]",
        success: "bg-[rgba(23,152,100,0.12)] text-[#0F7048]",
        warning: "bg-[rgba(245,158,11,0.12)] text-[#B45309]",
        critical: "bg-[rgba(220,38,38,0.12)] text-[#B91C1C]",
        violet: "bg-[rgba(139,92,246,0.12)] text-[#6D28D9]",
        cyan: "bg-[rgba(6,182,212,0.12)] text-[#0E7490]",
      },
    },
    defaultVariants: { variant: "neutral" },
  }
);

export interface TagProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof tagVariants> {}

export function Tag({ className, variant, ...props }: TagProps) {
  return <span className={cn(tagVariants({ variant }), className)} {...props} />;
}

/** Sentence-case counterpart for metadata that shouldn't shout. */
export function SoftTag({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border border-border-subtle bg-surface-secondary px-1.5 py-0.5 text-meta text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export { tagVariants };
