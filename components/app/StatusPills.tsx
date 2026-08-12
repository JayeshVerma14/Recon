import { FileSpreadsheet, FileText } from "lucide-react";

import { Tag, StatusDot } from "@/components/element";
import { STATUS_LABEL } from "@/lib/derive";
import type { DocumentMeta, ProjectStatus, ReviewStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const REVIEW_VARIANT: Record<ReviewStatus, React.ComponentProps<typeof Tag>["variant"]> = {
  matched: "success",
  mismatched: "critical",
  needs_review: "warning",
  approved: "brand",
  rejected: "neutral",
  edited: "violet",
};

export function ReviewStatusTag({
  status,
  className,
}: {
  status: ReviewStatus;
  className?: string;
}) {
  return (
    <Tag variant={REVIEW_VARIANT[status]} className={className}>
      {STATUS_LABEL[status]}
    </Tag>
  );
}

const PROJECT_STATUS: Record<
  ProjectStatus,
  { label: string; dot: React.ComponentProps<typeof StatusDot>["severity"] }
> = {
  draft: { label: "Draft", dot: "neutral" },
  running: { label: "Running", dot: "fyi" },
  in_review: { label: "In Review", dot: "warning" },
  completed: { label: "Completed", dot: "success" },
};

export function ProjectStatusTag({ status }: { status: ProjectStatus }) {
  const config = PROJECT_STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-body-sm">
      <StatusDot severity={config.dot} pulse={status === "running"} />
      {config.label}
    </span>
  );
}

export function DocChip({
  doc,
  className,
  showMeta = false,
}: {
  doc: DocumentMeta;
  className?: string;
  showMeta?: boolean;
}) {
  const Icon = doc.kind === "pdf" ? FileText : FileSpreadsheet;
  const tint = doc.kind === "pdf" ? "#DC2626" : "#179864";
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md border border-border-subtle bg-surface-secondary px-1.5 py-0.5",
        className
      )}
    >
      <Icon className="h-3 w-3 shrink-0" style={{ color: tint }} aria-hidden />
      <span className="truncate text-helper text-foreground">{doc.fileName}</span>
      {showMeta && (
        <span className="shrink-0 text-meta text-muted-foreground">
          {doc.kind === "pdf" ? `${doc.pages}p` : `${doc.sheets?.length} sheets`}
        </span>
      )}
    </span>
  );
}
