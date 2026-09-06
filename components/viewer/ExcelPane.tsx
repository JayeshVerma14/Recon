"use client";

import * as React from "react";

import { effectiveValue, formatValue } from "@/lib/derive";
import { cn } from "@/lib/utils";
import { implicates, type Issue } from "@/lib/issues";
import type { Disposition } from "@/lib/store";
import type { LineItem, Project } from "@/lib/types";

const COLUMNS = ["A", "B", "C", "D", "E"];

/**
 * The agent's own working paper.
 *
 * Every finding was written on a row of a workbook — the line in column A,
 * what the source said in column B, what the filing prints in column C — and
 * this is that sheet. Flagged cells carry the comment's number, and the
 * formula bar shows the agent's note for the cell, which is usually the whole
 * explanation.
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
  const onSheet = items.filter((i) => i.sourceA.sheet === sheet);

  const issueByCell = React.useMemo(() => {
    const map = new Map<string, Issue>();
    issues.forEach((issue) => {
      const item = items.find((i) => i.id === issue.itemId);
      /* the finding sits on the source's cell — column B is what the source
         said, and that is the figure a finding is raised about */
      if (item?.sourceA.cell && item.sourceA.sheet === sheet) {
        map.set(item.sourceA.cell, issue);
      }
    });
    return map;
  }, [issues, sheet, items]);

  const rows = React.useMemo(() => {
    const map = new Map<number, LineItem>();
    onSheet.forEach((item) => {
      const rowNumber = Number((item.sourceA.cell ?? "B0").replace(/[^0-9]/g, ""));
      map.set(rowNumber, item);
    });
    const max = Math.max(32, ...Array.from(map.keys())) + 2;
    return Array.from({ length: max }, (_, i) => ({ row: i + 1, item: map.get(i + 1) }));
  }, [onSheet]);

  const [selected, setSelected] = React.useState<string>(() => onSheet[0]?.sourceA.cell ?? "B4");

  const selectedIssue = issueByCell.get(selected);
  const selectedItem = onSheet.find((i) => i.sourceA.cell === selected);
  /* column B is the source's own reading, which is what this sheet records */
  const excelValue = (item: LineItem) => item.valueA;

  const openOnSheet = React.useMemo(
    () =>
      issues.filter(
        (i) =>
          dispositions[i.id] === undefined &&
          items.some((item) => item.id === i.itemId && item.sourceA.sheet === sheet)
      ).length,
    [issues, dispositions, items, sheet]
  );

  /* follow the focused finding into the sheet */
  React.useEffect(() => {
    const issue = issues.find((i) => i.id === focusId);
    const item = items.find((i) => i.id === issue?.itemId);
    if (item?.sourceA.cell) setSelected(item.sourceA.cell);
  }, [focusId, issues, items]);

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
                  /* the export's own layout: the line, what the source said,
                     what the filing prints */
                  const isLabel = col === "A" && item;
                  const isValue = col === "B" && item;
                  const isPrior = col === "C" && item;
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
                          {item.text ? (
                            <span className="line-clamp-1 max-w-[150px] font-sans">
                              {item.text.reference || "—"}
                            </span>
                          ) : (
                            formatValue(excelValue(item), item.unit)
                          )}
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
                        (item.text ? (
                          <span className="line-clamp-1 block max-w-[150px] font-sans">
                            {item.text.working || "—"}
                          </span>
                        ) : (
                          formatValue(effectiveValue(item), item.unit)
                        ))}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* the sheet this section was written on — one section, one sheet */}
      <div className="flex shrink-0 items-center gap-2 border-t border-[#D7DDE5] bg-[#F1F4F8] px-2 py-1">
        <span className="inline-flex shrink-0 items-center gap-1 rounded-t bg-white px-2 py-0.5 text-[9px] font-medium text-[#1B2733]">
          {sheet}
          {openOnSheet > 0 && (
            <span className="inline-flex h-3 min-w-3 items-center justify-center rounded-full bg-critical px-0.5 text-[8px] font-semibold text-white">
              {openOnSheet}
            </span>
          )}
        </span>
        <span className="truncate text-[9px] text-[#7C8794]">
          {project.docB.label} read against {onSheet.length} line
          {onSheet.length === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
