import type {
  DocumentMeta,
  LineItem,
  Project,
  ReportDoc,
  ReviewStatus,
  StatementId,
  StatementMeta,
} from "@/lib/types";

/** Fixed clock so relative timestamps render identically on server and client. */
export const NOW = new Date("2026-08-11T09:00:00.000Z");

export const CURRENT_USER = "Jayesh Verma";

export const USERS = [
  { name: "Jayesh Verma", role: "Senior Analyst" },
  { name: "Alex Whitfield", role: "Controller" },
  { name: "Priya Raman", role: "Audit Manager" },
  { name: "Daniel Okafor", role: "Analyst" },
];

export const STATEMENTS: StatementMeta[] = [
  { id: "income", label: "Income Statement", shortLabel: "Income" },
  { id: "balance", label: "Balance Sheet", shortLabel: "Balance" },
  { id: "cashflow", label: "Cash Flow Statement", shortLabel: "Cash Flow" },
];

export const statementLabel = (id: StatementId) =>
  STATEMENTS.find((s) => s.id === id)?.label ?? id;

/* ------------------------------------------------------------------ *
 * Line-item authoring
 * ------------------------------------------------------------------ */

type Row = {
  account: string;
  section: string;
  a: number;
  b: number;
  conf: number;
  status?: ReviewStatus;
  sub?: boolean;
  level?: 0 | 1;
  why?: string;
  page: number;
  row: number;
  unit?: "currency" | "ratio";
  reviewer?: string;
  reviewedAt?: string;
  note?: string;
};

const SHEET: Record<StatementId, string> = {
  income: "IS_Model",
  balance: "BS_Model",
  cashflow: "CF_Model",
};

const COLUMN: Record<StatementId, string> = { income: "D", balance: "D", cashflow: "D" };

function build(statement: StatementId, rows: Row[]): LineItem[] {
  return rows.map((r, i) => {
    const diff = Number((r.b - r.a).toFixed(2));
    const agentStatus =
      r.status === "approved" || r.status === "rejected" || r.status === "edited"
        ? diff === 0
          ? "matched"
          : "mismatched"
        : ((r.status ?? (diff === 0 ? "matched" : "mismatched")) as
            | "matched"
            | "mismatched"
            | "needs_review");

    const id = `${statement}-${String(i + 1).padStart(2, "0")}`;

    return {
      id,
      statement,
      section: r.section,
      account: r.account,
      level: r.level ?? 0,
      isSubtotal: Boolean(r.sub),
      valueA: r.a,
      valueB: r.b,
      unit: r.unit ?? "currency",
      status: r.status ?? (diff === 0 ? "matched" : "mismatched"),
      agentStatus,
      confidence: r.conf,
      explanation: r.why,
      reviewer: r.reviewer,
      reviewedAt: r.reviewedAt,
      note: r.note,
      sourceA: {
        doc: "A",
        page: r.page,
        location: statementLabel(statement),
        confidence: r.conf,
      },
      sourceB: {
        doc: "B",
        sheet: SHEET[statement],
        cell: `${COLUMN[statement]}${r.row}`,
        location: `${SHEET[statement]} · ${statementLabel(statement)}`,
        confidence: Math.max(60, Math.min(99, r.conf + (i % 3) - 1)),
      },
      history: [
        {
          id: `${id}-h0`,
          actor: "Reconciliation Agent",
          action: "extracted",
          at: "2026-08-11T06:12:00.000Z",
          note:
            diff === 0
              ? "Values agree across both sources."
              : r.why ?? "Difference detected between sources.",
        },
        ...(r.reviewer && r.reviewedAt
          ? [
              {
                id: `${id}-h1`,
                actor: r.reviewer,
                action: (r.status === "rejected" ? "rejected" : "approved") as
                  | "rejected"
                  | "approved",
                at: r.reviewedAt,
                note: r.note,
              },
            ]
          : []),
      ],
    };
  });
}

/* --------------------------------- income --------------------------------- */

const INCOME = build("income", [
  { account: "Product revenue", section: "Revenue", a: 98400, b: 98400, conf: 97, level: 1, page: 42, row: 7 },
  { account: "Services revenue", section: "Revenue", a: 26600, b: 26600, conf: 96, level: 1, page: 42, row: 8 },
  {
    account: "Total revenue",
    section: "Revenue",
    a: 125000,
    b: 125000,
    conf: 99,
    sub: true,
    page: 42,
    row: 9,
    status: "approved",
    reviewer: "Alex Whitfield",
    reviewedAt: "2026-08-11T07:05:00.000Z",
  },
  {
    account: "Cost of goods sold",
    section: "Cost of sales",
    a: 72000,
    b: 72450,
    conf: 91,
    status: "mismatched",
    why: "Document B includes inbound freight of 450 within cost of sales; Document A reports the same amount inside general & administrative expenses.",
    page: 42,
    row: 11,
  },
  {
    account: "Gross profit",
    section: "Cost of sales",
    a: 53000,
    b: 52550,
    conf: 96,
    sub: true,
    status: "mismatched",
    why: "Flows directly from the cost of sales classification difference.",
    page: 42,
    row: 12,
  },
  { account: "Selling & marketing", section: "Operating expenses", a: 9800, b: 9800, conf: 97, page: 42, row: 14 },
  {
    account: "General & administrative",
    section: "Operating expenses",
    a: 6400,
    b: 5950,
    conf: 84,
    status: "needs_review",
    why: "Offsets the cost of sales difference. Confirm which presentation the audited statements use before approving either line.",
    page: 42,
    row: 15,
  },
  { account: "Research & development", section: "Operating expenses", a: 5600, b: 5600, conf: 95, page: 42, row: 16 },
  {
    account: "Total operating expenses",
    section: "Operating expenses",
    a: 21800,
    b: 21350,
    conf: 93,
    sub: true,
    status: "mismatched",
    page: 42,
    row: 17,
  },
  {
    account: "EBITDA",
    section: "Earnings",
    a: 31200,
    b: 31200,
    conf: 99,
    sub: true,
    page: 43,
    row: 19,
    status: "approved",
    reviewer: "Alex Whitfield",
    reviewedAt: "2026-08-11T07:06:00.000Z",
    note: "Agrees despite the classification difference above — reclassification is presentation only.",
  },
  { account: "Depreciation & amortisation", section: "Earnings", a: 4100, b: 4100, conf: 96, page: 43, row: 20 },
  { account: "Operating income", section: "Earnings", a: 27100, b: 27100, conf: 97, sub: true, page: 43, row: 21 },
  { account: "Interest expense", section: "Below the line", a: 2300, b: 2300, conf: 94, page: 43, row: 23 },
  { account: "Other income, net", section: "Below the line", a: 0, b: 0, conf: 88, page: 43, row: 24 },
  { account: "Income before tax", section: "Below the line", a: 24800, b: 24800, conf: 96, sub: true, page: 43, row: 25 },
  {
    account: "Income tax expense",
    section: "Below the line",
    a: 6100,
    b: 6250,
    conf: 76,
    status: "needs_review",
    why: "Effective tax rate is 24.6% in Document A and 25.2% in Document B. The model appears to apply the statutory rate rather than the effective rate.",
    page: 43,
    row: 26,
  },
  {
    account: "Net income",
    section: "Below the line",
    a: 18700,
    b: 18550,
    conf: 95,
    sub: true,
    status: "mismatched",
    why: "Carries the tax expense difference of 150.",
    page: 43,
    row: 27,
  },
  { account: "Basic EPS", section: "Per share", a: 1.89, b: 1.89, conf: 92, unit: "ratio", page: 43, row: 29 },
  {
    account: "Diluted EPS",
    section: "Per share",
    a: 1.87,
    b: 1.86,
    conf: 81,
    unit: "ratio",
    status: "needs_review",
    why: "Diluted share count differs by roughly 60k shares. Confirm the treatment of unvested RSUs.",
    page: 43,
    row: 30,
  },
]);

/* --------------------------------- balance -------------------------------- */

const BALANCE = build("balance", [
  { account: "Cash and cash equivalents", section: "Current assets", a: 18400, b: 18400, conf: 98, page: 46, row: 6 },
  { account: "Short-term investments", section: "Current assets", a: 6200, b: 6200, conf: 96, page: 46, row: 7 },
  {
    account: "Accounts receivable, net",
    section: "Current assets",
    a: 22750,
    b: 22900,
    conf: 79,
    status: "needs_review",
    why: "Document B is gross of a 150 allowance recorded in Document A.",
    page: 46,
    row: 8,
  },
  { account: "Inventory", section: "Current assets", a: 15300, b: 15300, conf: 95, page: 46, row: 9 },
  { account: "Prepaid expenses", section: "Current assets", a: 2100, b: 2100, conf: 93, page: 46, row: 10 },
  {
    account: "Total current assets",
    section: "Current assets",
    a: 64750,
    b: 64900,
    conf: 94,
    sub: true,
    status: "mismatched",
    page: 46,
    row: 11,
  },
  { account: "Property, plant & equipment, net", section: "Non-current assets", a: 41800, b: 41800, conf: 96, page: 46, row: 13 },
  { account: "Goodwill", section: "Non-current assets", a: 28500, b: 28500, conf: 98, page: 46, row: 14 },
  {
    account: "Intangible assets, net",
    section: "Non-current assets",
    a: 9400,
    b: 9120,
    conf: 72,
    status: "mismatched",
    why: "Amortisation for the Q4 acquisition is booked for a full year in Document B and for one quarter in Document A.",
    page: 46,
    row: 15,
  },
  { account: "Deferred tax assets", section: "Non-current assets", a: 3250, b: 3250, conf: 91, page: 46, row: 16 },
  {
    account: "Total non-current assets",
    section: "Non-current assets",
    a: 82950,
    b: 82670,
    conf: 93,
    sub: true,
    status: "mismatched",
    page: 46,
    row: 17,
  },
  {
    account: "Total assets",
    section: "Non-current assets",
    a: 147700,
    b: 147570,
    conf: 97,
    sub: true,
    status: "mismatched",
    page: 46,
    row: 18,
  },
  { account: "Accounts payable", section: "Current liabilities", a: 12900, b: 12900, conf: 96, page: 47, row: 21 },
  { account: "Accrued liabilities", section: "Current liabilities", a: 8650, b: 8650, conf: 94, page: 47, row: 22 },
  { account: "Deferred revenue", section: "Current liabilities", a: 11200, b: 11200, conf: 95, page: 47, row: 23 },
  { account: "Current portion of long-term debt", section: "Current liabilities", a: 5000, b: 5000, conf: 97, page: 47, row: 24 },
  {
    account: "Total current liabilities",
    section: "Current liabilities",
    a: 37750,
    b: 37750,
    conf: 96,
    sub: true,
    page: 47,
    row: 25,
    status: "approved",
    reviewer: "Priya Raman",
    reviewedAt: "2026-08-11T07:41:00.000Z",
  },
  { account: "Long-term debt", section: "Non-current liabilities", a: 42000, b: 42000, conf: 98, page: 47, row: 27 },
  { account: "Deferred tax liabilities", section: "Non-current liabilities", a: 4300, b: 4300, conf: 90, page: 47, row: 28 },
  { account: "Other non-current liabilities", section: "Non-current liabilities", a: 2150, b: 2150, conf: 88, page: 47, row: 29 },
  { account: "Total liabilities", section: "Non-current liabilities", a: 86200, b: 86200, conf: 96, sub: true, page: 47, row: 30 },
  { account: "Common stock", section: "Equity", a: 120, b: 120, conf: 94, page: 47, row: 32 },
  { account: "Additional paid-in capital", section: "Equity", a: 31480, b: 31480, conf: 95, page: 47, row: 33 },
  {
    account: "Retained earnings",
    section: "Equity",
    a: 29900,
    b: 29770,
    conf: 87,
    status: "mismatched",
    why: "Difference of 130 ties to the net income and intangibles differences already flagged.",
    page: 47,
    row: 34,
  },
  { account: "Total shareholders' equity", section: "Equity", a: 61500, b: 61370, conf: 93, sub: true, status: "mismatched", page: 47, row: 35 },
  {
    account: "Total liabilities and equity",
    section: "Equity",
    a: 147700,
    b: 147570,
    conf: 97,
    sub: true,
    status: "mismatched",
    page: 47,
    row: 36,
  },
]);

/* -------------------------------- cash flow -------------------------------- */

const CASHFLOW = build("cashflow", [
  {
    account: "Net income",
    section: "Operating activities",
    a: 18700,
    b: 18550,
    conf: 95,
    status: "mismatched",
    why: "Carried from the income statement tax difference.",
    page: 49,
    row: 6,
  },
  { account: "Depreciation & amortisation", section: "Operating activities", a: 4100, b: 4100, conf: 96, page: 49, row: 7 },
  { account: "Stock-based compensation", section: "Operating activities", a: 3850, b: 3850, conf: 94, page: 49, row: 8 },
  { account: "Deferred income taxes", section: "Operating activities", a: -420, b: -420, conf: 89, page: 49, row: 9 },
  {
    account: "Change in accounts receivable",
    section: "Operating activities",
    a: -2300,
    b: -2450,
    conf: 77,
    status: "needs_review",
    why: "Mirrors the receivables allowance difference on the balance sheet.",
    page: 49,
    row: 10,
  },
  { account: "Change in inventory", section: "Operating activities", a: -1150, b: -1150, conf: 92, page: 49, row: 11 },
  { account: "Change in accounts payable", section: "Operating activities", a: 980, b: 980, conf: 93, page: 49, row: 12 },
  { account: "Change in deferred revenue", section: "Operating activities", a: 1640, b: 1640, conf: 91, page: 49, row: 13 },
  {
    account: "Net cash from operating activities",
    section: "Operating activities",
    a: 25400,
    b: 25100,
    conf: 94,
    sub: true,
    status: "mismatched",
    page: 49,
    row: 14,
  },
  { account: "Purchases of property & equipment", section: "Investing activities", a: -7600, b: -7600, conf: 95, page: 50, row: 17 },
  { account: "Acquisitions, net of cash acquired", section: "Investing activities", a: -4200, b: -4200, conf: 93, page: 50, row: 18 },
  { account: "Purchases of investments", section: "Investing activities", a: -3100, b: -3100, conf: 90, page: 50, row: 19 },
  {
    account: "Net cash used in investing activities",
    section: "Investing activities",
    a: -14900,
    b: -14900,
    conf: 95,
    sub: true,
    page: 50,
    row: 20,
    status: "approved",
    reviewer: "Daniel Okafor",
    reviewedAt: "2026-08-11T08:02:00.000Z",
  },
  { account: "Proceeds from long-term debt", section: "Financing activities", a: 8000, b: 8000, conf: 96, page: 50, row: 22 },
  { account: "Repayment of long-term debt", section: "Financing activities", a: -5000, b: -5000, conf: 96, page: 50, row: 23 },
  { account: "Share repurchases", section: "Financing activities", a: -6200, b: -6200, conf: 92, page: 50, row: 24 },
  { account: "Dividends paid", section: "Financing activities", a: -2400, b: -2400, conf: 94, page: 50, row: 25 },
  { account: "Net cash used in financing activities", section: "Financing activities", a: -5600, b: -5600, conf: 95, sub: true, page: 50, row: 26 },
  {
    account: "Net change in cash",
    section: "Reconciliation of cash",
    a: 4900,
    b: 4600,
    conf: 93,
    sub: true,
    status: "mismatched",
    page: 50,
    row: 28,
  },
  { account: "Cash at beginning of period", section: "Reconciliation of cash", a: 13500, b: 13500, conf: 97, page: 50, row: 29 },
  {
    account: "Cash at end of period",
    section: "Reconciliation of cash",
    a: 18400,
    b: 18100,
    conf: 90,
    sub: true,
    status: "mismatched",
    why: "Ending cash in Document B does not tie to the balance sheet, which reports 18,400.",
    page: 50,
    row: 30,
  },
]);

/* --------------------------------- projects -------------------------------- */

const ACME_DOC_A: DocumentMeta = {
  id: "A",
  fileName: "Annual_Report_2024.pdf",
  kind: "pdf",
  sizeMb: 18.3,
  pages: 219,
  label: "Annual Report",
};

const ACME_DOC_B: DocumentMeta = {
  id: "B",
  fileName: "Financial_Model_v12.xlsx",
  kind: "xlsx",
  sizeMb: 4.7,
  sheets: ["Cover", "IS_Model", "BS_Model", "CF_Model", "Assumptions", "Debt schedule"],
  label: "Financial Model",
};

export const ACME_PROJECT: Project = {
  id: "acme-fy2024",
  name: "Acme Corp FY2024 Reconciliation",
  entity: "Acme Corporation",
  period: "FY2024",
  comparisonPeriod: "FY2023",
  docA: ACME_DOC_A,
  docB: ACME_DOC_B,
  statements: ["income", "balance", "cashflow"],
  matching: "rounding",
  tolerance: 1,
  createdBy: "Alex Whitfield",
  createdAt: "2026-08-09T11:20:00.000Z",
  lastModified: "2026-08-11T08:02:00.000Z",
  status: "in_review",
  reviewers: ["Alex Whitfield", "Priya Raman", "Daniel Okafor", "Jayesh Verma"],
  items: [...INCOME, ...BALANCE, ...CASHFLOW],
};

/** Older projects exist only as list rows — opening them reuses the Acme workspace. */
export const OTHER_PROJECTS: Project[] = [
  {
    ...ACME_PROJECT,
    id: "northwind-q2",
    name: "Northwind Q2 FY2025 Close",
    entity: "Northwind Industries",
    period: "Q2 FY2025",
    docA: { ...ACME_DOC_A, fileName: "Q2_Board_Pack.pdf", pages: 64, sizeMb: 9.1, label: "Board Pack" },
    docB: { ...ACME_DOC_B, fileName: "Close_Workbook_Q2.xlsx", sizeMb: 3.2, label: "Close Workbook" },
    statements: ["income", "balance"],
    createdBy: "Priya Raman",
    createdAt: "2026-08-04T09:00:00.000Z",
    lastModified: "2026-08-10T16:30:00.000Z",
    status: "in_review",
    reviewers: ["Priya Raman", "Jayesh Verma"],
  },
  {
    ...ACME_PROJECT,
    id: "helios-fy2024",
    name: "Helios Energy FY2024 Audit Tie-out",
    entity: "Helios Energy plc",
    period: "FY2024",
    docA: { ...ACME_DOC_A, fileName: "Audited_Financials_2024.pdf", pages: 142, sizeMb: 12.6, label: "Audited Financials" },
    docB: { ...ACME_DOC_A, id: "B", fileName: "Management_Accounts_2024.pdf", pages: 88, sizeMb: 7.4, label: "Management Accounts" },
    statements: ["income", "balance", "cashflow"],
    createdBy: "Daniel Okafor",
    createdAt: "2026-07-28T13:45:00.000Z",
    lastModified: "2026-08-06T10:12:00.000Z",
    status: "completed",
    reviewers: ["Daniel Okafor", "Alex Whitfield"],
  },
  {
    ...ACME_PROJECT,
    id: "vertex-fy2023",
    name: "Vertex Labs FY2023 Restatement Check",
    entity: "Vertex Labs Inc.",
    period: "FY2023",
    docA: { ...ACME_DOC_A, fileName: "10-K_2023.pdf", pages: 186, sizeMb: 15.9, label: "Form 10-K" },
    docB: { ...ACME_DOC_B, fileName: "Restated_Model.xlsx", sizeMb: 5.5, label: "Restated Model" },
    statements: ["income", "cashflow"],
    createdBy: "Jayesh Verma",
    createdAt: "2026-07-15T08:30:00.000Z",
    lastModified: "2026-07-22T15:05:00.000Z",
    status: "completed",
    reviewers: ["Jayesh Verma"],
  },
];

export const PROJECTS: Project[] = [ACME_PROJECT, ...OTHER_PROJECTS];

/* ---------------------------------- reports -------------------------------- */

export const REPORTS: ReportDoc[] = PROJECTS.map((project) => ({
  id: `rep-${project.id}`,
  projectId: project.id,
  title: `${project.name} — Reconciliation Report`,
  summary: `Reconciliation of ${project.statements.length} statement${
    project.statements.length > 1 ? "s" : ""
  } between ${project.docA.label} and ${project.docB.label} for ${project.period}.`,
  updatedAt: project.lastModified,
  sections: project.statements.map((id) => ({
    id,
    title: statementLabel(id),
    included: true,
    columns:
      id === "cashflow"
        ? ["Account", "Document A", "Document B", "Difference", "Status", "Source"]
        : ["Account", "Document A", "Document B", "Difference", "Status", "Confidence", "Reviewer"],
    hiddenAccounts: [],
  })),
}));

/* -------------------------------- PDF pages -------------------------------- */

/** Page headings for the mocked document viewer. */
export const PDF_PAGE_INDEX: Record<number, string> = {
  40: "Management Discussion & Analysis (continued)",
  41: "Report of Independent Auditors",
  42: "Consolidated Statements of Operations",
  43: "Consolidated Statements of Operations (continued)",
  44: "Consolidated Statements of Comprehensive Income",
  45: "Notes to Consolidated Financial Statements",
  46: "Consolidated Balance Sheets",
  47: "Consolidated Balance Sheets (continued)",
  48: "Notes — Shareholders' Equity",
  49: "Consolidated Statements of Cash Flows",
  50: "Consolidated Statements of Cash Flows (continued)",
  51: "Notes — Commitments and Contingencies",
};

export const pageForStatement: Record<StatementId, number> = {
  income: 42,
  balance: 46,
  cashflow: 49,
};
