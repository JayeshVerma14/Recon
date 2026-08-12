import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export function SavedAtIndicator({
  savedAt,
  className,
}: {
  savedAt: Date;
  className?: string;
}) {
  const time = savedAt.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <span className={cn("inline-flex items-center gap-1 text-helper text-muted-foreground", className)}>
      <Check className="h-3 w-3 text-success" aria-hidden />
      Saved {time}
    </span>
  );
}
