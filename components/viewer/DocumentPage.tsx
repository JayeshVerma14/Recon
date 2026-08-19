"use client";

import * as React from "react";
import { Check, Minus, X } from "lucide-react";

import { effectiveValue, formatValue } from "@/lib/derive";
import { statementLabel } from "@/lib/mock";
import { cn } from "@/lib/utils";
import { implicates, type DocNote, type Issue, type SourceReading } from "@/lib/issues";
import type { Disposition } from "@/lib/store";
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
  dispositions,
  workingValues,
  lensDocId,
  gutter,
  documents,
  readingsByItem,
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
  dispositions: Record<string, Disposition>;
  /** The figure the reconciled document reports, where it differs from the model. */
  workingValues: Map<string, number>;
  /** When set, marks that do not implicate this source are dimmed rather than hidden. */
  lensDocId: string | null;
  /** Per-source agreement strip beside each line. */
  gutter: boolean;
  documents: { id: string; label: string }[];
  readingsByItem: Map<string, SourceReading[]>;
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

  const value = (item: LineItem) => {
    if (variant === "working") return workingValues.get(item.id) ?? effectiveValue(item);
    const issue = issueByItem.get(item.id);
    return issue?.pdfValue ?? item.valueA;
  };
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
            {gutter && (
              <th className="py-1 pl-3 text-right text-[8px] font-medium uppercase tracking-wider text-[#9AA5B1]">
                Sources
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const mark = marks[item.id];
            const issue = issueByItem.get(item.id);
            /* the filing is only marked where the filing itself is implicated */
            const shows = issue !== undefined && (variant === "working" || implicates(issue, "pdf"));
            const number = shows ? issueNumber.get(issue!.id) : undefined;
            const disposition = issue ? dispositions[issue.id] : undefined;
            /* focus + context: out-of-lens findings stay on the page, quietened */
            const inLens = !lensDocId || (issue !== undefined && implicates(issue, lensDocId));
            const focused =
              item.id === focusItemId || (issue !== undefined && issue.id === focusIssueId);
            const linked = item.id === hoveredItemId;

            return (
              <tr
                key={item.id}
                data-issue-anchor={issue ? issue.id : undefined}
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
                        BADGE_BG[disposition ?? "open"],
                        !inLens && "opacity-30 saturate-0",
                        issue?.id === focusIssueId && "ring-2 ring-[#E0A800]"
                      )}
                    >
                      {disposition === "resolved" ? (
                        <Check className="h-2 w-2" strokeWidth={4} />
                      ) : disposition === "dismissed" ? (
                        <Minus className="h-2 w-2" strokeWidth={4} />
                      ) : (
                        number
                      )}
                    </button>
                  )}
                </td>

                <td className="py-[3px] pl-3 text-right font-mono text-[10px] tabular-nums text-[#7C8794]">
                  {formatValue(prior(item), item.unit)}
                </td>

                {gutter && (
                  <td className="w-[1px] py-[3px] pl-3">
                    <AgreementStrip
                      documents={documents}
                      readings={readingsByItem.get(item.id)}
                      lensDocId={lensDocId}
                    />
                  </td>
                )}
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
              const disposition = issue ? dispositions[issue.id] : undefined;
            /* focus + context: out-of-lens findings stay on the page, quietened */
            const inLens = !lensDocId || (issue !== undefined && implicates(issue, lensDocId));
              const focused = issue?.id === focusIssueId;

              const body = variant === "working" ? note.body : (note.referenceBody ?? note.body);
              const span = variant === "working" ? issue?.workingText : issue?.referenceText;
              const missingHere =
                (variant === "working" && issue?.missingIn === "working") ||
                (variant === "working" && note.referenceOnly);

              return (
                <div
                  key={note.id}
                  data-issue-anchor={issue ? issue.id : undefined}
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
                      {number !== undefined && (
                        <NumberBadge n={number} disposition={disposition} focused={focused} />
                      )}
                    </p>
                  ) : (
                    <p className="text-[10px] leading-[15px] text-[#1B2733]">
                      <HighlightedText
                        text={body}
                        span={span}
                        number={number}
                        disposition={disposition}
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
  disposition,
  focused,
}: {
  text: string;
  span?: string;
  number?: number;
  disposition?: Disposition;
  focused?: boolean;
}) {
  const closed = disposition !== undefined;
  if (!span || !text.includes(span)) return <>{text}</>;

  const [before, ...rest] = text.split(span);
  const after = rest.join(span);

  return (
    <>
      {before}
      <mark
        className={cn(
          "rounded-[2px] px-0.5 py-[1px] transition-colors",
          closed
            ? disposition === "resolved"
              ? "bg-[rgba(23,152,100,0.16)] text-[#0F7048] ring-1 ring-[#179864]/40"
              : disposition === "flagged"
                ? "bg-[rgba(245,158,11,0.20)] text-[#B45309] ring-1 ring-[#F59E0B]/50"
                : "bg-[rgba(148,163,184,0.18)] text-[#5A6672] ring-1 ring-[#94A3B8]/40"
            : "bg-[rgba(245,196,49,0.40)] text-[#1B2733] ring-1 ring-[#E0A800]",
          focused && !closed && "bg-[rgba(245,196,49,0.65)] ring-2"
        )}
      >
        {span}
        {number !== undefined && (
          <span className="ml-1 align-middle">
            <NumberBadge n={number} disposition={disposition} focused={focused} />
          </span>
        )}
      </mark>
      {after}
    </>
  );
}

/**
 * One cell per source: filled where that source agrees with the reconciled
 * figure, hollow red where it does not. Reading down a column shows a document
 * that is wrong everywhere; reading across a row shows a contested account.
 */
function AgreementStrip({
  documents,
  readings,
  lensDocId,
}: {
  documents: { id: string; label: string }[];
  readings?: SourceReading[];
  lensDocId: string | null;
}) {
  return (
    <span className="flex items-center gap-[2px]">
      {documents.map((doc) => {
        const reading = readings?.find((r) => r.docId === doc.id);
        /* no finding on this line means every source agreed */
        const agrees = reading ? reading.agrees : true;
        const dimmed = lensDocId !== null && lensDocId !== doc.id;
        return (
          <span
            key={doc.id}
            title={`${doc.label} — ${agrees ? "agrees" : "differs"}`}
            className={cn(
              "block h-[7px] w-[7px] rounded-[1px]",
              agrees ? "bg-[#B7DFC9]" : "bg-[#E4746F]",
              dimmed && "opacity-30"
            )}
          />
        );
      })}
    </span>
  );
}

const BADGE_BG: Record<Disposition | "open", string> = {
  open: "bg-critical",
  resolved: "bg-[#179864]",
  flagged: "bg-[#F59E0B]",
  dismissed: "bg-[#94A3B8]",
};

function NumberBadge({
  n,
  disposition,
  focused,
}: {
  n: number;
  disposition?: Disposition;
  focused?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-semibold text-white",
        BADGE_BG[disposition ?? "open"],
        focused && "ring-2 ring-[#E0A800]"
      )}
    >
      {disposition === "resolved" ? (
        <Check className="h-2 w-2" strokeWidth={4} />
      ) : disposition === "dismissed" ? (
        <Minus className="h-2 w-2" strokeWidth={4} />
      ) : (
        n
      )}
    </span>
  );
}
