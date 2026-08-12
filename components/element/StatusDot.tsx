import { cn } from "@/lib/utils";

export type Severity = "success" | "warning" | "critical" | "fyi" | "neutral";

const SEVERITY_BG: Record<Severity, string> = {
  success: "bg-[#179864]",
  warning: "bg-[#F59E0B]",
  critical: "bg-[#DC2626]",
  fyi: "bg-[#4664DC]",
  neutral: "bg-[#94A3B8]",
};

export function StatusDot({
  severity = "neutral",
  pulse = false,
  className,
  label,
}: {
  severity?: Severity;
  pulse?: boolean;
  className?: string;
  label?: string;
}) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      className={cn(
        "inline-block h-2 w-2 shrink-0 rounded-full",
        SEVERITY_BG[severity],
        pulse && "animate-pulse",
        className
      )}
    />
  );
}
