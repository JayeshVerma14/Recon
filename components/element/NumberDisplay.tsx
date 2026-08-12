import { cn } from "@/lib/utils";

/** Tabular-mono data display — every number on a data surface goes through this. */
export function NumberDisplay({
  value,
  prefix,
  suffix,
  className,
  muted = false,
}: {
  value: string | number;
  prefix?: string;
  suffix?: string;
  className?: string;
  muted?: boolean;
}) {
  return (
    <span
      className={cn(
        "tabular font-mono text-body-sm",
        muted ? "text-muted-foreground" : "text-foreground",
        className
      )}
    >
      {prefix}
      {value}
      {suffix && <span className="text-muted-foreground">{suffix}</span>}
    </span>
  );
}
