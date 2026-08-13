"use client";

import * as React from "react";
import { ArrowDownToLine, Check, CornerUpLeft, FileText, Hash, Sigma } from "lucide-react";

import { Button, Tooltip } from "@/components/element";
import { difference, effectiveValue, formatDifference, formatValue } from "@/lib/derive";
import { statementLabel } from "@/lib/mock";
import { wordDiff, type Issue } from "@/lib/issues";
import { cn } from "@/lib/utils";
import type { LineItem, Project } from "@/lib/types";

export type Outcome = "accept" | "reference" | "dismiss";

const KIND_META = {
  value: { label: "Value", icon: Sigma, className: "text-[#B91C1C]" },
  formula: { label: "Formula", icon: Hash, className: "text-[#B45309]" },
  text: { label: "Text", icon: FileText, className: "text-[#6D28D9]" },
} as const;

export function CommentCard({
  issue,
  item,
  project,
  number,
  resolved,
  focused,
  hovered,
  onFocus,
  onHover,
  onResolve,
  onReopen,
}: {
  issue: Issue;
  item?: LineItem;
  project: Project;
  number: number;
  resolved: boolean;
  focused: boolean;
  hovered: boolean;
  onFocus: () => void;
  onHover: (itemId: string | null) => void;
  onResolve: (outcome: Outcome) => void;
  onReopen: () => void;
}) {
  const meta = KIND_META[issue.kind];
  const diff = item ? difference(item) : 0;

  return (
    <li
      onMouseEnter={() => onHover(issue.itemId ?? null)}
      onMouseLeave={() => onHover(null)}
      onClick={onFocus}
      className={cn(
        "cursor-pointer rounded-lg border bg-surface transition-colors duration-fast",
        resolved ? "border-border-subtle" : "border-border",
        (focused || hovered) && "border-brand/50 shadow-card-hover",
        resolved && "opacity-70 hover:opacity-100"
      )}
    >
      <div className="flex items-start gap-2 px-2.5 pt-2.5">
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white",
            resolved ? "bg-success" : "bg-critical"
          )}
        >
          {resolved ? <Check className="h-3 w-3" strokeWidth={3} /> : number}
        </span>

        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-body-sm font-medium leading-5">{issue.title}</span>
          <span className="flex items-center gap-1 text-meta uppercase tracking-wider text-muted-foreground">
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
              <span className="text-meta uppercase tracking-wider text-[#8A5B00]">
                {issue.defect}
              </span>
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

          {item && (
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md bg-surface-secondary/70 px-2.5 py-2">
              <dt className="text-meta uppercase tracking-wider text-muted-foreground">Working</dt>
              <dd className="tabular text-right font-mono text-body-sm">
                {formatValue(effectiveValue(item), item.unit)}
              </dd>
              <dt className="text-meta uppercase tracking-wider text-muted-foreground">Reference</dt>
              <dd className="tabular text-right font-mono text-body-sm">
                {formatValue(item.valueA, item.unit)}
              </dd>
              {diff !== 0 && (
                <>
                  <dt className="text-meta uppercase tracking-wider text-muted-foreground">
                    Difference
                  </dt>
                  <dd
                    className={cn(
                      "tabular text-right font-mono text-body-sm",
                      item.agentStatus === "needs_review" ? "text-[#B45309]" : "text-[#B91C1C]"
                    )}
                  >
                    {formatDifference(diff, item.unit)}
                  </dd>
                </>
              )}
            </dl>
          )}
        </div>
      )}

      <p className="px-2.5 py-2 text-helper text-muted-foreground">{issue.explanation}</p>

      {/* -------------------------------- actions ------------------------------- */}
      {resolved ? (
        <div className="flex items-center gap-2 border-t border-border-subtle px-2.5 py-2">
          <span className="truncate text-meta text-muted-foreground">
            Resolved by {item?.reviewer ?? "you"}
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
          {issue.kind === "text" ? (
            <>
              <Button
                variant="successSoft"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onResolve("reference");
                }}
              >
                <ArrowDownToLine />
                Use reference wording
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onResolve("accept");
                }}
              >
                Keep working
              </Button>
            </>
          ) : issue.kind === "formula" ? (
            <>
              <Button
                variant="successSoft"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onResolve("accept");
                }}
              >
                <Check />
                Accept working
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onResolve("reference");
                }}
              >
                <ArrowDownToLine />
                Apply expected
              </Button>
            </>
          ) : (
            /* A reported value can only be signed off — overwriting a figure that
               flows from an upstream difference would hide the cause, not fix it. */
            <Tooltip content="Sign the line off at the working value and record the decision in its review history">
              <span>
                <Button
                  variant="successSoft"
                  size="xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    onResolve("accept");
                  }}
                >
                  <Check />
                  Resolve
                </Button>
              </span>
            </Tooltip>
          )}
          <Tooltip content="Close the comment without signing the line off — recorded as immaterial">
            <span>
              <Button
                variant="ghost"
                size="xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onResolve("dismiss");
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
        <span className="text-meta uppercase tracking-wider text-muted-foreground">
          {project.docB.label} · working
        </span>
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
        <span className="text-meta uppercase tracking-wider text-muted-foreground">
          {project.docA.label} · reference
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
