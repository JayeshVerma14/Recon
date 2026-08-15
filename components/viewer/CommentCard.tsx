"use client";

import * as React from "react";
import {
  Check,
  ChevronDown,
  CornerUpLeft,
  FileSpreadsheet,
  FileText,
  Flag,
  GitCompareArrows,
  Hash,
  Sigma,
  X,
} from "lucide-react";

import { Button, Tooltip } from "@/components/element";
import { formatDifference, formatValue } from "@/lib/derive";
import { statementLabel } from "@/lib/mock";
import { SHAPE_META, SIDE_META, wordDiff, type Issue } from "@/lib/issues";
import type { Disposition } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { LineItem, Project } from "@/lib/types";

const KIND_META = {
  value: { label: "Value", icon: Sigma, className: "text-[#B91C1C]" },
  formula: { label: "Formula", icon: Hash, className: "text-[#B45309]" },
  text: { label: "Text", icon: FileText, className: "text-[#6D28D9]" },
} as const;

const SIDE_ICON = {
  pdf: FileText,
  excel: FileSpreadsheet,
  both: GitCompareArrows,
} as const;

const DISPOSITION_META: Record<
  Disposition,
  { label: string; className: string; icon: typeof Check }
> = {
  resolved: { label: "Resolved", className: "bg-success", icon: Check },
  flagged: { label: "Flagged for the preparer", className: "bg-warning", icon: Flag },
  dismissed: { label: "Dismissed", className: "bg-[#94A3B8]", icon: X },
};

export function CommentCard({
  issue,
  item,
  project,
  number,
  disposition,
  focused,
  hovered,
  onFocus,
  onHover,
  onDispose,
  onReopen,
}: {
  issue: Issue;
  item?: LineItem;
  project: Project;
  number: number;
  disposition?: Disposition;
  focused: boolean;
  hovered: boolean;
  onFocus: () => void;
  onHover: (itemId: string | null) => void;
  onDispose: (disposition: Disposition) => void;
  onReopen: () => void;
}) {
  const meta = KIND_META[issue.kind];
  const shape = SHAPE_META[issue.shape];
  const ShapeIcon = issue.shape === "single" ? Flag : issue.shape === "consensus" ? Sigma : GitCompareArrows;
  const outlierNames = issue.readings.filter((r) => !r.agrees).map((r) => r.label);
  const closed = disposition !== undefined;

  return (
    <li
      onMouseEnter={() => onHover(issue.itemId ?? null)}
      onMouseLeave={() => onHover(null)}
      onClick={onFocus}
      className={cn(
        "cursor-pointer rounded-lg border bg-surface transition-colors duration-fast",
        closed ? "border-border-subtle" : "border-border",
        (focused || hovered) && "border-brand/50 shadow-card-hover",
        closed && "opacity-70 hover:opacity-100"
      )}
    >
      <div className="flex items-start gap-2 px-2.5 pt-2.5">
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white",
            closed ? DISPOSITION_META[disposition].className : "bg-critical"
          )}
        >
          {closed ? React.createElement(DISPOSITION_META[disposition].icon, { className: "h-3 w-3", strokeWidth: 3 }) : number}
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="text-body-sm font-medium leading-5">{issue.title}</span>
          <div className="flex flex-wrap items-center gap-1">
            <span
              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-meta font-semibold uppercase tracking-wider"
              style={{ background: shape.tint, color: shape.fg }}
              title={shape.hint}
            >
              <ShapeIcon className="h-2.5 w-2.5" />
              {issue.shape === "single" && outlierNames.length === 1
                ? `${outlierNames[0]} is out`
                : shape.label}
            </span>
            <span className="inline-flex items-center gap-1 text-meta uppercase tracking-wider text-muted-foreground">
              <meta.icon className={cn("h-3 w-3", meta.className)} />
              {meta.label}
              {issue.kind === "formula" && issue.sheet ? (
                <span className="font-mono normal-case tracking-normal">
                  · {issue.sheet}!{issue.cell}
                </span>
              ) : (
                <>· {statementLabel(issue.statement).replace(" Statement", "")}</>
              )}
            </span>
          </div>
        </div>

        <span className="tabular shrink-0 rounded bg-surface-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
          {issue.confidence}%
        </span>
      </div>

      {/* ------------------------------- evidence ------------------------------- */}
      {issue.kind === "text" ? (
        <TextEvidence issue={issue} project={project} />
      ) : (
        <div className="mx-2.5 mt-2.5 flex flex-col gap-2">
          {issue.kind === "formula" && (
            <div className="flex flex-col gap-1 rounded-md border border-[#E0A800]/40 bg-[rgba(245,196,49,0.14)] p-2">
              <span className="text-meta uppercase tracking-wider text-[#8A5B00]">{issue.defect}</span>
              <code className="block truncate font-mono text-[11px] text-[#8A5B00]">
                {issue.cell} {issue.formula}
              </code>
              {issue.expectedFormula && (
                <code className="block truncate font-mono text-[11px] text-[#0F7048]">
                  expected {issue.expectedFormula}
                </code>
              )}
            </div>
          )}

          {item && <SourceLedger issue={issue} item={item} project={project} />}
        </div>
      )}

      <p className="px-2.5 py-2 text-helper text-muted-foreground">{issue.explanation}</p>

      {/* ------------------------------ disposition ----------------------------- */}
      {closed ? (
        <div className="flex items-center gap-2 border-t border-border-subtle px-2.5 py-2">
          <span className="truncate text-meta text-muted-foreground">
            {DISPOSITION_META[disposition].label} · {item?.reviewer ?? "you"}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReopen();
            }}
            className="ml-auto inline-flex items-center gap-1 text-helper text-brand transition-colors duration-fast hover:underline"
          >
            <CornerUpLeft className="h-3 w-3" />
            Reopen
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border-subtle px-2.5 py-2">
          <Tooltip content="Checked and agreed — the reconciled figure stands">
            <span>
              <Button
                variant="successSoft"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onDispose("resolved");
                }}
              >
                <Check />
                Resolve
              </Button>
            </span>
          </Tooltip>

          <Tooltip
            content={
              outlierNames.length === 1
                ? `Send back to the preparer — ${outlierNames[0]} needs correcting`
                : outlierNames.length > 1
                  ? `Send back to the preparer — ${outlierNames.join(", ")} need bringing into line`
                  : "Send back to the preparer — the sources need to be brought into line"
            }
          >
            <span>
              <Button
                variant="outline"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onDispose("flagged");
                }}
              >
                <Flag />
                Flag source
              </Button>
            </span>
          </Tooltip>

          <Tooltip content="Close without action — immaterial to the reconciliation">
            <span>
              <Button
                variant="ghost"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onDispose("dismissed");
                }}
              >
                Dismiss
              </Button>
            </span>
          </Tooltip>
        </div>
      )}
    </li>
  );
}

/**
 * All three figures at once, with a verdict against each source — so the odd
 * one out is visible without arithmetic.
 */
/**
 * Every source read against the reconciled figure. Outliers are listed; the
 * sources that agree collapse into a single line, because at five or fifteen
 * sources the interesting fact is who is out, not who is in.
 */
function SourceLedger({
  issue,
  item,
  project,
}: {
  issue: Issue;
  item: LineItem;
  project: Project;
}) {
  const [expanded, setExpanded] = React.useState(false);

  const working = issue.workingValue ?? item.valueB;
  const outliers = issue.readings.filter((r) => !r.agrees);
  const agreeing = issue.readings.filter((r) => r.agrees);

  /* how far apart the sources are from each other, not from the output */
  const distinct = Array.from(new Set(issue.readings.map((r) => r.value ?? working)));
  const spread =
    distinct.length > 1 ? Math.max(...distinct) - Math.min(...distinct) : 0;

  return (
    <div className="overflow-hidden rounded-md border border-border-subtle">
      <div className="flex items-center gap-2 bg-surface-secondary/70 px-2.5 py-1.5">
        <span className="truncate text-meta font-semibold uppercase tracking-wider text-foreground">
          Reconciled
        </span>
        <span className="tabular ml-auto font-mono text-body-sm font-medium">
          {formatValue(working, item.unit)}
        </span>
      </div>

      {outliers.map((row) => (
        <div
          key={row.docId}
          className="flex items-center gap-2 border-t border-border-subtle bg-[rgba(220,38,38,0.05)] px-2.5 py-1.5"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {row.kind === "pdf" ? (
              <FileText className="h-3 w-3 shrink-0 text-critical" />
            ) : (
              <FileSpreadsheet className="h-3 w-3 shrink-0 text-critical" />
            )}
            <span className="truncate text-meta uppercase tracking-wider text-muted-foreground">
              {row.label}
            </span>
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-1.5">
            <span className="tabular font-mono text-meta text-critical">
              {formatDifference(row.delta, item.unit)}
            </span>
            <span className="tabular font-mono text-body-sm text-critical">
              {formatValue(row.value ?? working, item.unit)}
            </span>
          </span>
        </div>
      ))}

      {agreeing.length > 0 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
            className="flex w-full items-center gap-2 border-t border-border-subtle px-2.5 py-1.5 text-left transition-colors duration-fast hover:bg-surface-secondary/60"
          >
            <Check className="h-3 w-3 shrink-0 text-success" strokeWidth={3} />
            <span className="text-meta uppercase tracking-wider text-success">
              {agreeing.length} {agreeing.length === 1 ? "source agrees" : "sources agree"}
            </span>
            <ChevronDown
              className={cn(
                "ml-auto h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-fast",
                expanded && "rotate-180"
              )}
            />
          </button>

          {expanded &&
            agreeing.map((row) => (
              <div
                key={row.docId}
                className="flex items-center gap-2 border-t border-border-subtle px-2.5 py-1 pl-7"
              >
                <span className="truncate text-meta uppercase tracking-wider text-muted-foreground">
                  {row.label}
                </span>
                <span className="tabular ml-auto font-mono text-helper text-muted-foreground">
                  {formatValue(row.value ?? working, item.unit)}
                </span>
              </div>
            ))}
        </>
      )}

      {/* no source is presumed right — say how far apart they are */}
      {spread > 0 && outliers.length > 0 && (
        <div className="flex items-center gap-2 border-t border-border-subtle bg-[rgba(139,92,246,0.06)] px-2.5 py-1.5">
          <GitCompareArrows className="h-3 w-3 shrink-0 text-[#6D28D9]" />
          <span className="text-meta uppercase tracking-wider text-[#6D28D9]">
            {distinct.length} distinct values · spread
          </span>
          <span className="tabular ml-auto font-mono text-body-sm text-[#6D28D9]">
            {formatValue(spread, item.unit)}
          </span>
        </div>
      )}
    </div>
  );
}

/** Word-level diff so a wording change reads as a change, not two paragraphs. */
function TextEvidence({ issue, project }: { issue: Issue; project: Project }) {
  const missing = issue.missingIn === "working";
  const { left, right } = React.useMemo(
    () => wordDiff(issue.workingText ?? "", issue.referenceText ?? ""),
    [issue.workingText, issue.referenceText]
  );

  return (
    <div className="mx-2.5 mt-2.5 flex flex-col gap-1.5">
      <div className="rounded-md border border-border-subtle bg-surface-secondary/60 p-2">
        <span className="text-meta uppercase tracking-wider text-muted-foreground">Reconciled</span>
        <p className="mt-0.5 text-helper leading-[17px] text-foreground">
          {missing ? (
            <span className="italic text-critical">Passage not found on this document</span>
          ) : (
            left.map((token, i) => (
              <span
                key={i}
                className={cn(
                  token.changed &&
                    "rounded-[2px] bg-[rgba(220,38,38,0.12)] px-0.5 text-[#B91C1C] line-through decoration-[#B91C1C]/40"
                )}
              >
                {token.text}
              </span>
            ))
          )}
        </p>
      </div>

      <div className="rounded-md border border-border-subtle bg-surface-secondary/60 p-2">
        <span className="flex items-center gap-1 text-meta uppercase tracking-wider text-muted-foreground">
          <FileText className="h-3 w-3" />
          {project.docA.label}
        </span>
        <p className="mt-0.5 text-helper leading-[17px] text-foreground">
          {right.map((token, i) => (
            <span
              key={i}
              className={cn(
                token.changed && "rounded-[2px] bg-[rgba(23,152,100,0.14)] px-0.5 text-[#0F7048]"
              )}
            >
              {token.text}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
