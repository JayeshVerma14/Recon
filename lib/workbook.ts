import { STATEMENTS, statementLabel } from "@/lib/mock";
import { difference, effectiveValue, formatDifference, formatValue, STATUS_LABEL } from "@/lib/derive";
import type { LineItem, Project, StatementId } from "@/lib/types";

export type CellStyle = "title" | "header" | "section" | "text" | "num" | "muted" | "status";

export interface Cell {
  v: string;
  s?: CellStyle;
  tone?: "ok" | "warn" | "bad" | "info";
  /** Line item this cell was derived from — enables source linking. */
  itemId?: string;
  /** Cells that span the rest of the row (title bands). */
  span?: number;
}

export interface Sheet {
  id: string;
  name: string;
  type: string;
  description: string;
  widths: number[];
  rows: Cell[][];
  statement?: StatementId;
}

const SHEET_NAME: Record<StatementId, (period: string) => string> = {
  income: (p) => `Income-Statement-12M-${p.replace(/\D/g, "")}`,
  balance: (p) => `Balance-Sheet-${p.replace(/\D/g, "")}`,
  cashflow: (p) => `Cash-Flow-12M-${p.replace(/\D/g, "")}`,
};

function statementSheet(project: Project, statement: StatementId): Sheet {
  const items = project.items.filter((i) => i.statement === statement);
  const name = SHEET_NAME[statement](project.period);
  const columns = ["Line Item", project.docA.fileName, project.docB.fileName, "Difference", "Status", "Source"];

  const rows: Cell[][] = [
    [{ v: `${statementLabel(statement)} — ${project.period}`, s: "title", span: 6 }],
    columns.map((c) => ({ v: c, s: "header" })),
  ];

  let section = "";
  items.forEach((item) => {
    if (item.section !== section) {
      section = item.section;
      rows.push([{ v: section, s: "section", span: 6 }]);
    }
    const diff = difference(item);
    rows.push([
      { v: item.account, s: "text", itemId: item.id },
      { v: formatValue(item.valueA, item.unit), s: "num", itemId: item.id },
      { v: formatValue(effectiveValue(item), item.unit), s: "num", itemId: item.id },
      {
        v: formatDifference(diff, item.unit),
        s: "num",
        tone: diff === 0 ? undefined : item.status === "needs_review" ? "warn" : "bad",
        itemId: item.id,
      },
      {
        v: STATUS_LABEL[item.status],
        s: "status",
        tone:
          item.status === "matched" || item.status === "approved"
            ? "ok"
            : item.status === "needs_review"
              ? "warn"
              : item.status === "mismatched" || item.status === "rejected"
                ? "bad"
                : "info",
        itemId: item.id,
      },
      {
        v: `p.${item.sourceA.page} · ${item.sourceB.cell ?? `p.${item.sourceB.page}`}`,
        s: "muted",
        itemId: item.id,
      },
    ]);
  });

  return {
    id: statement,
    name,
    type: "Analysis",
    description: `${name}: ${items.length} rows across columns ${columns.join(", ")}`,
    widths: [300, 150, 150, 120, 130, 130],
    rows,
    statement,
  };
}

function coverSheet(project: Project): Sheet {
  const rows: Cell[][] = [
    [{ v: "Cover Page", s: "title", span: 3 }],
    [
      { v: "Line Item", s: "header" },
      { v: project.docA.fileName, s: "header" },
      { v: project.docB.fileName, s: "header" },
    ],
    [{ v: "Document", s: "section", span: 3 }],
    [
      { v: "Entity", s: "text" },
      { v: project.entity, s: "text" },
      { v: project.entity, s: "text" },
    ],
    [
      { v: "Document type", s: "text" },
      { v: project.docA.label, s: "text" },
      { v: project.docB.label, s: "text" },
    ],
    [
      { v: "File", s: "text" },
      { v: project.docA.fileName, s: "muted" },
      { v: project.docB.fileName, s: "muted" },
    ],
    [
      { v: "Extent", s: "text" },
      { v: project.docA.pages ? `${project.docA.pages} pages` : `${project.docA.sheets?.length} sheets`, s: "num" },
      { v: project.docB.pages ? `${project.docB.pages} pages` : `${project.docB.sheets?.length} sheets`, s: "num" },
    ],
    [
      { v: "File size", s: "text" },
      { v: `${project.docA.sizeMb} MB`, s: "num" },
      { v: `${project.docB.sizeMb} MB`, s: "num" },
    ],
    [{ v: "Reporting", s: "section", span: 3 }],
    [
      { v: "Primary period", s: "text" },
      { v: project.period, s: "text" },
      { v: project.period, s: "text" },
    ],
    [
      { v: "Comparative period", s: "text" },
      { v: project.comparisonPeriod ?? "—", s: "text" },
      { v: project.comparisonPeriod ?? "—", s: "text" },
    ],
    [
      { v: "Units", s: "text" },
      { v: "$ thousands", s: "text" },
      { v: "$ thousands (scaled 1/1000)", s: "muted" },
    ],
    [
      { v: "Currency", s: "text" },
      { v: "USD", s: "text" },
      { v: "USD", s: "text" },
    ],
    [{ v: "Reconciliation", s: "section", span: 3 }],
    [
      { v: "Matching rule", s: "text" },
      {
        v:
          project.matching === "exact"
            ? "Exact match"
            : project.matching === "rounding"
              ? "Allow rounding differences"
              : `Custom tolerance ±${project.tolerance}`,
        s: "text",
      },
      { v: "", s: "text" },
    ],
    [
      { v: "Statements reconciled", s: "text" },
      { v: project.statements.map((s) => statementLabel(s)).join(", "), s: "text" },
      { v: "", s: "text" },
    ],
    [
      { v: "Accounts compared", s: "text" },
      { v: String(project.items.length), s: "num" },
      { v: "", s: "text" },
    ],
    [
      { v: "Reviewers", s: "text" },
      { v: project.reviewers.join(", "), s: "muted" },
      { v: "", s: "text" },
    ],
  ];

  return {
    id: "cover",
    name: "Cover-Page",
    type: "Analysis",
    description: `Cover-Page: ${rows.length} rows across columns Line Item, ${project.docA.fileName}, ${project.docB.fileName}`,
    widths: [300, 260, 260],
    rows,
  };
}

function tocSheet(sheets: Sheet[]): Sheet {
  const rows: Cell[][] = [
    [{ v: "Table of Contents (TOC)", s: "title", span: 4 }],
    [
      { v: "#", s: "header" },
      { v: "Tab Name", s: "header" },
      { v: "Type", s: "header" },
      { v: "Description", s: "header" },
    ],
    ...sheets.map((sheet, i) => [
      { v: String(i + 1), s: "num" as const },
      { v: sheet.name, s: "text" as const },
      { v: sheet.type, s: "text" as const },
      { v: sheet.description, s: "muted" as const },
    ]),
  ];

  return {
    id: "toc",
    name: "Table of Contents",
    type: "Index",
    description: "Index of every tab in this workbook",
    widths: [70, 280, 110, 500],
    rows,
  };
}

export function buildWorkbook(project: Project): Sheet[] {
  const statementSheets = STATEMENTS.filter((s) => project.statements.includes(s.id)).map((s) =>
    statementSheet(project, s.id)
  );
  const sheets = [coverSheet(project), ...statementSheets];
  return [tocSheet(sheets), ...sheets];
}

export function columnLabel(index: number) {
  let n = index;
  let label = "";
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return label;
}

/** A1-style reference for a cell position. */
export function cellRef(col: number, row: number) {
  return `${columnLabel(col)}${row + 1}`;
}

export function itemForCell(project: Project, cell?: Cell): LineItem | undefined {
  if (!cell?.itemId) return undefined;
  return project.items.find((i) => i.id === cell.itemId);
}
