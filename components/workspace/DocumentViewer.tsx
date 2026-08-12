"use client";

import * as React from "react";
import { motion } from "framer-motion";

import { PDF_PAGE_INDEX } from "@/lib/mock";
import { effectiveValue, formatValue } from "@/lib/derive";
import { cn } from "@/lib/utils";
import type { LineItem, Project } from "@/lib/types";

/* ------------------------------- mocked PDF -------------------------------- */

export function PdfPage({
  project,
  page,
  items,
  activeItemId,
  onPickItem,
  zoom,
}: {
  project: Project;
  page: number;
  items: LineItem[];
  activeItemId: string | null;
  onPickItem: (id: string) => void;
  zoom: number;
}) {
  const onPage = items.filter((i) => i.sourceA.page === page);
  const heading = PDF_PAGE_INDEX[page] ?? "Notes to Consolidated Financial Statements";
  const activeRef = React.useRef<HTMLTableRowElement | null>(null);

  React.useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeItemId, page]);

  return (
    <div className="flex justify-center bg-[#EDF1F6] p-4">
      <div
        className="w-full origin-top rounded-sm bg-white shadow-[0_1px_3px_rgba(10,37,64,0.16)]"
        style={{ transform: `scale(${zoom})`, transformOrigin: "top center" }}
      >
        <div className="flex flex-col gap-4 px-6 py-6">
          <div className="flex items-baseline justify-between border-b border-[#D9E0E8] pb-2">
            <span className="text-[9px] uppercase tracking-[0.14em] text-[#7C8794]">
              {project.entity}
            </span>
            <span className="text-[9px] uppercase tracking-[0.14em] text-[#7C8794]">
              {project.period} Annual Report
            </span>
          </div>

          <div className="flex flex-col gap-0.5">
            <h3 className="font-serif text-[13px] font-semibold text-[#1B2733]">{heading}</h3>
            <p className="text-[9px] text-[#7C8794]">
              (in thousands, except per share data) · Year ended 31 December {project.period.replace("FY", "")}
            </p>
          </div>

          {onPage.length > 0 ? (
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[#C9D3DD]">
                  <th className="py-1 text-left text-[9px] font-semibold uppercase tracking-wider text-[#5A6672]">
                    &nbsp;
                  </th>
                  <th className="py-1 text-right text-[9px] font-semibold uppercase tracking-wider text-[#5A6672]">
                    {project.period}
                  </th>
                  <th className="py-1 text-right text-[9px] font-semibold uppercase tracking-wider text-[#5A6672]">
                    {project.comparisonPeriod}
                  </th>
                </tr>
              </thead>
              <tbody>
                {onPage.map((item) => {
                  const active = item.id === activeItemId;
                  return (
                    <tr
                      key={item.id}
                      ref={active ? activeRef : undefined}
                      onClick={() => onPickItem(item.id)}
                      className={cn(
                        "cursor-pointer border-b border-[#EEF1F5] transition-colors",
                        item.isSubtotal && "border-t border-[#C9D3DD]"
                      )}
                    >
                      <td
                        className={cn(
                          "py-[3px] pr-2 text-[10px] text-[#1B2733]",
                          item.level === 1 && "pl-3 text-[#5A6672]",
                          item.isSubtotal && "font-semibold"
                        )}
                      >
                        {item.account}
                      </td>
                      <td className="py-[3px] text-right">
                        <span
                          className={cn(
                            "relative inline-block px-1 font-mono text-[10px] tabular-nums text-[#1B2733]",
                            item.isSubtotal && "font-semibold"
                          )}
                        >
                          {active && (
                            <motion.span
                              layoutId="pdf-highlight"
                              className="absolute inset-x-0 -inset-y-[2px] rounded-[2px] bg-[rgba(245,196,49,0.45)] ring-1 ring-[#E0A800]"
                              transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                            />
                          )}
                          <span className="relative">{formatValue(item.valueA, item.unit)}</span>
                        </span>
                      </td>
                      <td className="py-[3px] pl-2 text-right font-mono text-[10px] tabular-nums text-[#7C8794]">
                        {formatValue(
                          Math.round(item.valueA * (item.unit === "ratio" ? 0.94 : 0.93)),
                          item.unit
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <PagePlaceholder />
          )}

          <div className="flex flex-col gap-1.5 pt-2">
            {[92, 100, 96, 88].map((w, i) => (
              <span
                key={i}
                className="block h-[4px] rounded-full bg-[#EDF1F6]"
                style={{ width: `${w}%` }}
              />
            ))}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-[#EEF1F5] pt-2 text-[8px] text-[#9AA5B1]">
            <span>{project.docA.fileName}</span>
            <span>{page}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function PagePlaceholder() {
  return (
    <div className="flex flex-col gap-2 py-2">
      {[100, 97, 99, 84, 0, 96, 100, 91, 78, 0, 98, 88].map((w, i) =>
        w === 0 ? (
          <span key={i} className="h-2" />
        ) : (
          <span
            key={i}
            className="block h-[5px] rounded-full bg-[#EDF1F6]"
            style={{ width: `${w}%` }}
          />
        )
      )}
    </div>
  );
}

/* ------------------------------ mocked workbook ----------------------------- */

const COLUMNS = ["A", "B", "C", "D", "E"];

export function SheetView({
  project,
  sheet,
  items,
  activeItemId,
  onPickItem,
}: {
  project: Project;
  sheet: string;
  items: LineItem[];
  activeItemId: string | null;
  onPickItem: (id: string) => void;
}) {
  const onSheet = items.filter((i) => i.sourceB.sheet === sheet);
  const activeRef = React.useRef<HTMLTableRowElement | null>(null);

  React.useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [activeItemId, sheet]);
  const rows = React.useMemo(() => {
    const map = new Map<number, LineItem>();
    onSheet.forEach((item) => {
      const rowNumber = Number((item.sourceB.cell ?? "D0").replace(/[^0-9]/g, ""));
      map.set(rowNumber, item);
    });
    const max = Math.max(32, ...Array.from(map.keys())) + 2;
    return Array.from({ length: max }, (_, i) => ({ row: i + 1, item: map.get(i + 1) }));
  }, [onSheet]);

  return (
    <div className="min-w-0 overflow-auto scrollbar-thin bg-white">
      <table className="w-full min-w-[520px] border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-9 border-b border-r border-[#D9E0E8] bg-[#F1F4F8] px-1 py-1 text-[9px] font-medium text-[#7C8794]">
              &nbsp;
            </th>
            {COLUMNS.map((col) => (
              <th
                key={col}
                className={cn(
                  "border-b border-r border-[#D9E0E8] bg-[#F1F4F8] px-2 py-1 text-[9px] font-medium text-[#5A6672]",
                  col === "B" && "min-w-[200px]",
                  col === "D" && "min-w-[92px]"
                )}
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ row, item }) => {
            const active = item?.id === activeItemId;
            return (
              <tr key={row} ref={active ? activeRef : undefined}>
                <td className="sticky left-0 z-10 border-b border-r border-[#D9E0E8] bg-[#F1F4F8] px-1 py-[3px] text-center text-[9px] text-[#7C8794]">
                  {row}
                </td>
                {COLUMNS.map((col) => {
                  const isLabel = col === "B" && item;
                  const isValue = col === "D" && item;
                  const isPrior = col === "E" && item;
                  return (
                    <td
                      key={col}
                      onClick={() => item && onPickItem(item.id)}
                      className={cn(
                        "relative border-b border-r border-[#EDF1F6] px-2 py-[3px] text-[10px]",
                        isValue && "text-right font-mono tabular-nums",
                        isPrior && "text-right font-mono tabular-nums text-[#9AA5B1]",
                        item && "cursor-pointer",
                        active && isValue && "bg-[rgba(245,196,49,0.35)]",
                        active && !isValue && "bg-[rgba(245,196,49,0.12)]"
                      )}
                    >
                      {isLabel && (
                        <span className={cn("text-[#1B2733]", item.isSubtotal && "font-semibold")}>
                          {item.account}
                        </span>
                      )}
                      {isValue && (
                        <span className={cn("text-[#1B2733]", active && "font-semibold")}>
                          {formatValue(effectiveValue(item), item.unit)}
                        </span>
                      )}
                      {isPrior &&
                        formatValue(
                          Math.round(item.valueB * (item.unit === "ratio" ? 0.94 : 0.93)),
                          item.unit
                        )}
                      {active && isValue && (
                        <span className="pointer-events-none absolute inset-0 ring-2 ring-[#E0A800]" />
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex items-center gap-1 border-t border-[#D9E0E8] bg-[#F1F4F8] px-2 py-1">
        {project.docB.sheets?.map((name) => (
          <span
            key={name}
            className={cn(
              "rounded-t px-2 py-0.5 text-[9px]",
              name === sheet ? "bg-white font-medium text-[#1B2733]" : "text-[#7C8794]"
            )}
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
