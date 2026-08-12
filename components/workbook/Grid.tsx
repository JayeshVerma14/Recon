"use client";

import * as React from "react";

import { cn } from "@/lib/utils";
import { columnLabel, type Cell, type Sheet } from "@/lib/workbook";

export interface Selection {
  row: number;
  col: number;
}

const TONE_TEXT: Record<string, string> = {
  ok: "text-[#0F7048]",
  warn: "text-[#B45309]",
  bad: "text-[#B91C1C]",
  info: "text-[#2F45A8]",
};

const TONE_PILL: Record<string, string> = {
  ok: "bg-[rgba(23,152,100,0.12)] text-[#0F7048]",
  warn: "bg-[rgba(245,158,11,0.12)] text-[#B45309]",
  bad: "bg-[rgba(220,38,38,0.12)] text-[#B91C1C]",
  info: "bg-[rgba(70,100,220,0.12)] text-[#2F45A8]",
};

export function Grid({
  sheet,
  selection,
  onSelect,
  onOpenSource,
}: {
  sheet: Sheet;
  selection: Selection | null;
  onSelect: (sel: Selection) => void;
  onOpenSource: (itemId: string) => void;
}) {
  const colCount = sheet.widths.length;

  return (
    <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
      <table className="border-collapse" style={{ width: sheet.widths.reduce((a, b) => a + b, 0) + 56 }}>
        <colgroup>
          <col style={{ width: 56 }} />
          {sheet.widths.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>

        <thead className="sticky top-0 z-20">
          <tr>
            <th className="sticky left-0 z-30 h-8 border-b border-r border-[#D7DDE5] bg-[#EDF0F4]" />
            {Array.from({ length: colCount }).map((_, i) => (
              <th
                key={i}
                className={cn(
                  "h-8 border-b border-r border-[#D7DDE5] bg-[#EDF0F4] text-center text-helper font-medium text-muted-foreground",
                  selection?.col === i && "bg-[#DCE3EC] text-foreground"
                )}
              >
                {columnLabel(i)}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {sheet.rows.map((row, rowIndex) => {
            const first = row[0];
            const isBand = first?.s === "title" || first?.s === "header";
            const isSection = first?.s === "section";

            return (
              <tr key={rowIndex} className={cn(!isBand && !isSection && rowIndex % 2 === 1 && "bg-[#F4F8FC]")}>
                <td
                  className={cn(
                    "sticky left-0 z-10 border-b border-r border-[#D7DDE5] bg-[#EDF0F4] text-center align-middle text-helper text-muted-foreground",
                    selection?.row === rowIndex && "bg-[#DCE3EC] text-foreground"
                  )}
                >
                  {rowIndex + 1}
                </td>

                {Array.from({ length: colCount }).map((_, colIndex) => {
                  const cell: Cell | undefined = row[colIndex];
                  if (first?.span && colIndex > 0 && colIndex < first.span && row.length === 1) return null;

                  if (colIndex === 0 && first?.span && row.length === 1) {
                    return (
                      <td
                        key={colIndex}
                        colSpan={first.span}
                        onClick={() => onSelect({ row: rowIndex, col: 0 })}
                        className={cn(
                          "cursor-cell border-b border-r border-[#D7DDE5] px-3 py-2 align-middle",
                          first.s === "title" && "bg-[#173A5E] text-body-lg font-semibold text-white",
                          first.s === "section" &&
                            "bg-[#E7EDF5] text-meta font-semibold uppercase tracking-wider text-[#3A5375]"
                        )}
                      >
                        {first.v}
                      </td>
                    );
                  }

                  const selected = selection?.row === rowIndex && selection?.col === colIndex;

                  const isSourceCell = cell?.s === "muted" && Boolean(cell.itemId);

                  return (
                    <td
                      key={colIndex}
                      title={
                        cell?.itemId
                          ? isSourceCell
                            ? "Open this line in the reconciled PDF"
                            : "Double-click to open the source"
                          : undefined
                      }
                      onClick={() => {
                        onSelect({ row: rowIndex, col: colIndex });
                        if (isSourceCell) onOpenSource(cell!.itemId!);
                      }}
                      onDoubleClick={() => cell?.itemId && onOpenSource(cell.itemId)}
                      className={cn(
                        "relative cursor-cell border-b border-r border-[#D7DDE5] px-3 py-1.5 align-top text-body-sm",
                        cell?.s === "header" && "bg-[#173A5E] py-2 font-semibold text-white",
                        cell?.s === "num" && "tabular text-right font-mono",
                        cell?.s === "muted" && "text-muted-foreground",
                        isSourceCell && "cursor-pointer hover:text-brand hover:underline",
                        cell?.tone && cell.s === "num" && TONE_TEXT[cell.tone],
                        selected && "outline outline-2 -outline-offset-2 outline-brand"
                      )}
                    >
                      {cell?.s === "status" && cell.v ? (
                        <span
                          className={cn(
                            "inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
                            TONE_PILL[cell.tone ?? "info"]
                          )}
                        >
                          {cell.v}
                        </span>
                      ) : (
                        cell?.v
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
