"use client";

import * as React from "react";
import { Check, X } from "lucide-react";

import { effectiveValue, formatValue } from "@/lib/derive";
import { statementLabel } from "@/lib/mock";
import { cn } from "@/lib/utils";
import type { DocNote, Issue } from "@/lib/issues";
import type { LineItem, Project, StatementId } from "@/lib/types";

export type Mark = "tick" | "cross";

export function DocumentPage({
  project,
  statement,
  items,
  notes,
  variant,
  periods,
  marks,
  issueByItem,
  textIssues,
  issueNumber,
  resolvedIds,
  focusIssueId,
  focusItemId,
  hoveredItemId,
  onHover,
  onLineClick,
  onIssueClick,
}: {
  project: Project;
  statement: StatementId;
  items: LineItem[];
  notes: DocNote[];
  variant: "reference" | "working";
  periods: [string, string];
  marks: Record<string, Mark>;
  issueByItem: Map<string, Issue>;
  textIssues: Issue[];
  issueNumber: Map<string, number>;
  resolvedIds: string[];
  focusIssueId: string | null;
  focusItemId: string | null;
  hoveredItemId: string | null;
  onHover: (id: string | null) => void;
  onLineClick: (id: string) => void;
  onIssueClick: (id: string) => void;
}) {
  const focusRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    focusRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusIssueId, focusItemId, statement]);

  const value = (item: LineItem) => (variant === "working" ? effectiveValue(item) : item.valueA);
  const prior = (item: LineItem) =>
    variant === "working" ? item.valueA : Math.round(item.valueA * 0.93);

  return (
    <div className="mx-auto w-full max-w-[720px] rounded-sm bg-white px-7 py-7 shadow-[0_1px_3px_rgba(10,37,64,0.16)]">
      <div className="mb-4 flex flex-col items-center gap-0.5 text-center">
        <span className="font-serif text-[12px] font-semibold text-[#1B2733]">
          {project.entity} and Subsidiaries
        </span>
        <span className="font-serif text-[12px] font-semibold text-[#1B2733]">
          Consolidated {statementLabel(statement).replace(" Statement", "")} Statements
        </span>
        <span className="font-serif text-[10px] italic text-[#5A6672]">
          (In thousands, except share and per share data)
        </span>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[#C9D3DD]">
            <th />
            <th className="py-1 text-right text-[10px] font-semibold text-[#1B2733]">
              September 30, {periods[0].replace(/\D/g, "")}
            </th>
            <th className="py-1 pl-3 text-right text-[10px] font-semibold text-[#1B2733]">
              September 30, {periods[1].replace(/\D/g, "")}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const mark = marks[item.id];
            const issue = issueByItem.get(item.id);
            const number = issue ? issueNumber.get(issue.id) : undefined;
            const isResolved = issue ? resolvedIds.includes(issue.id) : false;
            const focused =
              item.id === focusItemId || (issue !== undefined && issue.id === focusIssueId);
            const linked = item.id === hoveredItemId;

            return (
              <tr
                key={item.id}
                ref={focused ? (el) => { focusRef.current = el; } : undefined}
                onMouseEnter={() => onHover(item.id)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onLineClick(item.id)}
                className={cn(
                  "cursor-pointer border-b border-[#F1F4F7] transition-colors",
                  item.isSubtotal && "border-t border-[#C9D3DD]",
                  linked && "bg-[rgba(70,100,220,0.07)]",
                  focused && "bg-[rgba(245,196,49,0.20)]"
                )}
              >
                <td
                  className={cn(
                    "py-[3px] pr-2 text-[10px] text-[#1B2733]",
                    item.level === 1 && "pl-3 text-[#5A6672]",
                    item.isSubtotal && "font-semibold"
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {item.account}
                    {mark === "tick" && <Check className="h-3 w-3 text-[#179864]" strokeWidth={3} />}
                    {mark === "cross" && <X className="h-3 w-3 text-[#DC2626]" strokeWidth={3} />}
                  </span>
                </td>

                <td className="relative py-[3px] text-right font-mono text-[10px] tabular-nums text-[#1B2733]">
                  <span className={cn(item.isSubtotal && "font-semibold")}>
                    {formatValue(value(item), item.unit)}
                  </span>
                  {number !== undefined && (
                    <button
                      type="button"
                      title={issue?.explanation}
                      onClick={(e) => {
                        e.stopPropagation();
                        onIssueClick(issue!.id);
                      }}
                      className={cn(
                        "ml-1 inline-flex h-3.5 w-3.5 -translate-y-0.5 items-center justify-center rounded-full align-middle text-[8px] font-semibold text-white",
                        isResolved ? "bg-[#179864]" : "bg-critical",
                        issue?.id === focusIssueId && "ring-2 ring-[#E0A800]"
                      )}
                    >
                      {isResolved ? <Check className="h-2 w-2" strokeWidth={4} /> : number}
                    </button>
                  )}
                </td>

                <td className="py-[3px] pl-3 text-right font-mono text-[10px] tabular-nums text-[#7C8794]">
                  {formatValue(prior(item), item.unit)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ---------------------------- narrative notes ---------------------------- */}
      {notes.length > 0 && (
        <div className="mt-6 border-t border-[#C9D3DD] pt-4">
          <p className="mb-2 font-serif text-[11px] font-semibold text-[#1B2733]">
            Notes to the consolidated financial statements
          </p>

          <div className="flex flex-col gap-3">
            {notes.map((note) => {
              const issue = textIssues.find((t) => t.noteId === note.id);
              const number = issue ? issueNumber.get(issue.id) : undefined;
              const isResolved = issue ? resolvedIds.includes(issue.id) : false;
              const focused = issue?.id === focusIssueId;

              const body = variant === "working" ? note.body : (note.referenceBody ?? note.body);
              const span = variant === "working" ? issue?.workingText : issue?.referenceText;
              const missingHere =
                (variant === "working" && issue?.missingIn === "working") ||
                (variant === "working" && note.referenceOnly);

              return (
                <div
                  key={note.id}
                  ref={focused ? (el) => { focusRef.current = el; } : undefined}
                  onClick={() => issue && onIssueClick(issue.id)}
                  className={cn("flex flex-col gap-1", issue && "cursor-pointer")}
                >
                  <p className="font-serif text-[10px] font-semibold text-[#1B2733]">
                    {note.heading}
                  </p>

                  {missingHere ? (
                    <p className="flex items-start gap-1.5 rounded-sm border border-dashed border-[#DC2626]/50 bg-[rgba(220,38,38,0.05)] px-2 py-1.5 text-[10px] italic text-[#B91C1C]">
                      <span className="flex-1">Passage not found on this document.</span>
                      {number !== undefined && <NumberBadge n={number} resolved={isResolved} focused={focused} />}
                    </p>
                  ) : (
                    <p className="text-[10px] leading-[15px] text-[#1B2733]">
                      <HighlightedText
                        text={body}
                        span={span}
                        number={number}
                        resolved={isResolved}
                        focused={focused}
                      />
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between border-t border-[#EEF1F5] pt-2 text-[8px] text-[#9AA5B1]">
        <span>{variant === "working" ? project.docB.fileName : project.docA.fileName}</span>
        <span>1</span>
      </div>
    </div>
  );
}

/** Highlights the flagged passage in place, the way a reviewer would with a marker. */
function HighlightedText({
  text,
  span,
  number,
  resolved,
  focused,
}: {
  text: string;
  span?: string;
  number?: number;
  resolved: boolean;
  focused?: boolean;
}) {
  if (!span || !text.includes(span)) return <>{text}</>;

  const [before, ...rest] = text.split(span);
  const after = rest.join(span);

  return (
    <>
      {before}
      <mark
        className={cn(
          "rounded-[2px] px-0.5 py-[1px] transition-colors",
          resolved
            ? "bg-[rgba(23,152,100,0.16)] text-[#0F7048] ring-1 ring-[#179864]/40"
            : "bg-[rgba(245,196,49,0.40)] text-[#1B2733] ring-1 ring-[#E0A800]",
          focused && !resolved && "bg-[rgba(245,196,49,0.65)] ring-2"
        )}
      >
        {span}
        {number !== undefined && (
          <span className="ml-1 align-middle">
            <NumberBadge n={number} resolved={resolved} focused={focused} />
          </span>
        )}
      </mark>
      {after}
    </>
  );
}

function NumberBadge({
  n,
  resolved,
  focused,
}: {
  n: number;
  resolved: boolean;
  focused?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-semibold text-white",
        resolved ? "bg-[#179864]" : "bg-critical",
        focused && "ring-2 ring-[#E0A800]"
      )}
    >
      {resolved ? <Check className="h-2 w-2" strokeWidth={4} /> : n}
    </span>
  );
}
