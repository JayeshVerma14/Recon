import * as React from "react";

import { cn } from "@/lib/utils";

export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full border-collapse text-body", className)} {...props} />;
}

export function TableHeader({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        "sticky top-0 z-10 border-b border-border bg-[#F9FBFD] [&_th]:whitespace-nowrap",
        className
      )}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-border-subtle", className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "transition-colors duration-fast hover:bg-surface-secondary/60 data-[selected=true]:bg-[rgba(70,100,220,0.05)] data-[active=true]:bg-[rgba(70,100,220,0.07)]",
        className
      )}
      {...props}
    />
  );
}

export function TableHead({
  className,
  align,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  return (
    <th
      data-align={align}
      className={cn(
        "px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
        "data-[align=right]:text-right data-[align=center]:text-center",
        className
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  align,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { align?: "left" | "right" | "center" }) {
  return (
    <td
      data-align={align}
      className={cn(
        "px-3 py-2 align-middle text-body-sm",
        "data-[align=right]:text-right data-[align=center]:text-center",
        className
      )}
      {...props}
    />
  );
}
