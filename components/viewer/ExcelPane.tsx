"use client";

import * as React from "react";

import { effectiveValue, formatValue } from "@/lib/derive";
import { cn } from "@/lib/utils";
import { implicates, type Issue } from "@/lib/issues";
import type { Disposition } from "@/lib/store";
import type { LineItem, Project } from "@/lib/types";

const COLUMNS = ["A", "B", "C", "D", "E"];

const SHEET_FOR_STATEMENT: Record<string, string> = {
  income: "IS_Model",
  balance: "BS_Model",
  cashflow: "CF_Model",
};

/**
 * The workbook side of a PDF + Excel reconciliation. Cells the agent flagged
 * carry a numbered badge, and the formula bar shows what is actually in the
 * cell — which is usually the whole explanation.
 */
export function ExcelPane({
  project,
  sheet,
  items,
  issues,
  issueNumber,
  dispositions,
  focusId,
  hoveredItemId,
  onHover,
  onSelectIssue,
  onSelectItem,
}: {
  project: Project;
  sheet: string;
  items: LineItem[];
  issues: Issue[];
  issueNumber: Map<string, number>;
  dispositions: Record<string, Disposition>;
  focusId: string | null;
  hoveredItemId: string | null;
  onHover: (id: string | null) => void;
  onSelectIssue: (issueId: string) => void;
  onSelectItem: (itemId: string) => void;
}) {
  const onSheet = items.filter((i) => i.sourceB.sheet === sheet);

  const issueByCell = React.useMemo(() => {
    const map = new Map<string, Issue>();
    issues.filter((i) => implicates(i, "excel")).forEach((issue) => {
      /* a formula finding names its own cell; a value finding inherits the line's */
      const cell =
        issue.cell ?? items.find((item) => item.id === issue.itemId)?.sourceB.cell ?? undefined;
      const onSheet =
        issue.sheet ?? items.find((item) => item.id === issue.itemId)?.sourceB.sheet ?? undefined;
      if (cell && onSheet === sheet) map.set(cell, issue);
    });
    return map;
  }, [issues, sheet, items]);

  const rows = React.useMemo(() => {
    const map = new Map<number, LineItem>();
    onSheet.forEach((item) => {
      const rowNumber = Number((item.sourceB.cell ?? "D0").replace(/[^0-9]/g, ""));
      map.set(rowNumber, item);
    });
    const max = Math.max(32, ...Array.from(map.keys())) + 2;
    return Array.from({ length: max }, (_, i) => ({ row: i + 1, item: map.get(i + 1) }));
  }, [onSheet]);

  const [selected, setSelected] = React.useState<string>("D11");

  const selectedIssue = issueByCell.get(selected);
  const selectedItem = onSheet.find((i) => i.sourceB.cell === selected);
  const excelValue = (item: LineItem) => {
    const issue = issues.find((i) => i.itemId === item.id);
    return issue?.excelValue ?? effectiveValue(item);
  };

  /* follow the focused finding into the sheet */
  React.useEffect(() => {
    const issue = issues.find((i) => i.id === focusId);
    if (issue?.cell) setSelected(issue.cell);
  }, [focusId, issues]);

  const cellRef = React.useRef<HTMLTableCellElement | null>(null);
  React.useEffect(() => {
    cellRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [selected, sheet]);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white">
      {/* formula bar */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[#D7DDE5] bg-[#F7F9FC] px-2 py-1.5">
        <span className="tabular w-14 shrink-0 rounded border border-[#D7DDE5] bg-white px-1.5 py-0.5 text-center font-mono text-[11px] text-[#5A6672]">
          {selected}
        </span>
        <span className="shrink-0 font-mono text-[11px] italic text-[#7C8794]">fx</span>
        <span
          className={cn(
            "min-w-0 flex-1 truncate rounded border px-2 py-0.5 font-mono text-[11px]",
            selectedIssue
              ? "border-[#E0A800] bg-[rgba(245,196,49,0.16)] text-[#8A5B00]"
              : "border-transparent text-[#1B2733]"
          )}
        >
          {selectedIssue?.formula ??
            (selectedItem ? formatValue(excelValue(selectedItem), selectedItem.unit) : "")}
        </span>
        {selectedIssue && (
          <button
            type="button"
            onClick={() => onSelectIssue(selectedIssue.id)}
            className="shrink-0 rounded bg-critical px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white"
          >
            {selectedIssue.defect ??
              (selectedIssue.side === "excel" ? "Workbook differs" : "Sources disagree")}
          </button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
        <table className="w-full min-w-[560px] border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="sticky left-0 z-20 w-9 border-b border-r border-[#D7DDE5] bg-[#F1F4F8] px-1 py-1 text-[9px] font-medium text-[#7C8794]">
                &nbsp;
              </th>
              {COLUMNS.map((col) => (
                <th
                  key={col}
                  className={cn(
                    "border-b border-r border-[#D7DDE5] bg-[#F1F4F8] px-2 py-1 text-[9px] font-medium text-[#5A6672]",
                    col === "B" && "min-w-[210px]",
                    col === "D" && "min-w-[96px]"
                  )}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ row, item }) => (
              <tr key={row} onMouseEnter={() => item && onHover(item.id)} onMouseLeave={() => onHover(null)}>
                <td className="sticky left-0 z-10 border-b border-r border-[#D7DDE5] bg-[#F1F4F8] px-1 py-[3px] text-center text-[9px] text-[#7C8794]">
                  {row}
                </td>
                {COLUMNS.map((col) => {
                  const ref = `${col}${row}`;
                  const isLabel = col === "B" && item;
                  const isValue = col === "D" && item;
                  const isPrior = col === "E" && item;
                  const issue = issueByCell.get(ref);
                  const isSelected = selected === ref;
                  const linked = Boolean(item && item.id === hoveredItemId);
                  const closed = issue ? dispositions[issue.id] !== undefined : false;
                  const resolved = issue ? dispositions[issue.id] === "resolved" : false;

                  return (
                    <td
                      key={col}
                      ref={isSelected ? cellRef : undefined}
                      onClick={() => {
                        setSelected(ref);
                        if (issue) onSelectIssue(issue.id);
                        else if (item) onSelectItem(item.id);
                      }}
                      className={cn(
                        "relative cursor-cell border-b border-r border-[#EDF1F6] px-2 py-[3px] text-[10px]",
                        isValue && "text-right font-mono tabular-nums",
                        isPrior && "text-right font-mono tabular-nums text-[#9AA5B1]",
                        linked && "bg-[rgba(70,100,220,0.06)]",
                        issue && !closed && "bg-[rgba(245,196,49,0.22)]",
                        issue && closed && resolved && "bg-[rgba(23,152,100,0.10)]",
                        issue && closed && !resolved && "bg-[rgba(148,163,184,0.14)]",
                        isSelected && "ring-2 ring-inset ring-brand"
                      )}
                    >
                      {isLabel && (
                        <span className={cn("text-[#1B2733]", item.isSubtotal && "font-semibold")}>
                          {item.account}
                        </span>
                      )}
                      {isValue && (
                        <span className="inline-flex items-center gap-1 text-[#1B2733]">
                          {formatValue(excelValue(item), item.unit)}
                          {issue && (
                            <span
                              title={issue.defect}
                              className={cn(
                                "inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-semibold text-white",
                                resolved
                                  ? "bg-[#179864]"
                                  : closed
                                    ? "bg-[#94A3B8]"
                                    : "bg-critical"
                              )}
                            >
                              {issueNumber.get(issue.id) ?? "!"}
                            </span>
                          )}
                        </span>
                      )}
                      {isPrior &&
                        formatValue(
                          Math.round(item.valueB * (item.unit === "ratio" ? 0.94 : 0.93)),
                          item.unit
                        )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* sheet tabs */}
      <div className="flex shrink-0 items-center gap-1 overflow-x-auto scrollbar-thin border-t border-[#D7DDE5] bg-[#F1F4F8] px-2 py-1">
        {project.docB.sheets?.map((name) => {
          const flagged = issues.filter(
            (i) => implicates(i, "excel") && (i.sheet ?? SHEET_FOR_STATEMENT[i.statement]) === name
          );
          const openFlags = flagged.filter((i) => dispositions[i.id] === undefined).length;
          return (
            <span
              key={name}
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-t px-2 py-0.5 text-[9px]",
                name === sheet ? "bg-white font-medium text-[#1B2733]" : "text-[#7C8794]"
              )}
            >
              {name}
              {openFlags > 0 && (
                <span className="inline-flex h-3 min-w-3 items-center justify-center rounded-full bg-critical px-0.5 text-[8px] font-semibold text-white">
                  {openFlags}
                </span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
