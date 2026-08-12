import { difference } from "@/lib/derive";
import type { LineItem, Project, StatementId } from "@/lib/types";

/**
 * Three things can disagree between two filings: a number, a word, or the
 * formula that produced the number. They are reviewed the same way but they
 * are not the same evidence, so each carries its own anchor and card.
 */
export type IssueKind = "value" | "text" | "formula";

export interface Issue {
  id: string;
  kind: IssueKind;
  statement: StatementId;
  /** Heading shown on the card. */
  title: string;
  explanation: string;
  confidence: number;

  /** value + formula issues resolve against a reconciled line. */
  itemId?: string;

  /** text issues */
  workingText?: string;
  referenceText?: string;
  /** Note the passage lives in — `null` when the passage is missing entirely. */
  noteId?: string;
  missingIn?: "working" | "reference";

  /** formula issues */
  sheet?: string;
  cell?: string;
  formula?: string;
  expectedFormula?: string;
  defect?: string;
}

export interface DocNote {
  id: string;
  statement: StatementId;
  heading: string;
  /** Working-document wording. */
  body: string;
  /** Reference-document wording — omitted when the note only exists on one side. */
  referenceBody?: string;
  /** Present on the reference document only. */
  referenceOnly?: boolean;
}

/* ------------------------------ narrative notes ----------------------------- */

export const NOTES: DocNote[] = [
  {
    id: "note-inc-1",
    statement: "income",
    heading: "Note 2 — Revenue recognition",
    body:
      "Revenue from product sales is recognised at a point in time, when control of the goods transfers to the customer. Service revenue is recognised rateably over the contract term.",
    referenceBody:
      "Revenue from product sales is recognised over time, as the performance obligation is satisfied. Service revenue is recognised rateably over the contract term.",
  },
  {
    id: "note-inc-2",
    statement: "income",
    heading: "Note 3 — Income taxes",
    body:
      "The effective tax rate for the year was 25.2 per cent, compared with a statutory rate of 25.0 per cent. The difference arises from non-deductible expenses.",
    referenceBody:
      "The effective tax rate for the year was 24.6 per cent, compared with a statutory rate of 25.0 per cent. The difference arises from non-deductible expenses and research credits.",
  },
  {
    id: "note-inc-3",
    statement: "income",
    heading: "Note 4 — Subsequent events",
    body:
      "On 22 January 2025 the Group refinanced its revolving credit facility, extending the maturity to 2029.",
    referenceBody:
      "On 15 January 2025 the Group refinanced its revolving credit facility, extending the maturity to 2029.",
  },
  {
    id: "note-bal-1",
    statement: "balance",
    heading: "Note 8 — Trade receivables",
    body:
      "Trade receivables are stated gross of the allowance for expected credit losses, which was 150 at the reporting date.",
    referenceBody:
      "Trade receivables are stated net of the allowance for expected credit losses, which was 150 at the reporting date.",
  },
  {
    id: "note-bal-2",
    statement: "balance",
    heading: "Note 9 — Going concern",
    body: "",
    referenceBody:
      "The directors have assessed the Group's ability to continue as a going concern for at least twelve months from the date of approval and consider that basis appropriate.",
    referenceOnly: true,
  },
  {
    id: "note-cf-1",
    statement: "cashflow",
    heading: "Note 12 — Cash and cash equivalents",
    body:
      "Cash at the end of the period excludes restricted cash of 227, which is presented within other assets.",
    referenceBody:
      "Cash at the end of the period includes restricted cash of 227, consistent with the balance sheet.",
  },
];

/** The exact span each text finding highlights, per side. */
const TEXT_ISSUES: {
  id: string;
  noteId: string;
  statement: StatementId;
  title: string;
  working: string;
  reference: string;
  explanation: string;
  confidence: number;
  missingIn?: "working";
}[] = [
  {
    id: "txt-inc-1",
    noteId: "note-inc-1",
    statement: "income",
    title: "Revenue recognition wording differs",
    working: "recognised at a point in time, when control of the goods transfers to the customer",
    reference: "recognised over time, as the performance obligation is satisfied",
    explanation:
      "The two filings describe different revenue recognition patterns for the same product line. This is a policy statement, not a rounding difference — confirm which wording the audited accounts use.",
    confidence: 88,
  },
  {
    id: "txt-inc-2",
    noteId: "note-inc-2",
    statement: "income",
    title: "Effective tax rate stated differently",
    working: "25.2 per cent",
    reference: "24.6 per cent",
    explanation:
      "The narrative rate matches the tax expense on each side, so the note is internally consistent in both documents. The underlying tax figure is the item to resolve.",
    confidence: 84,
  },
  {
    id: "txt-inc-3",
    noteId: "note-inc-3",
    statement: "income",
    title: "Subsequent event dated differently",
    working: "22 January 2025",
    reference: "15 January 2025",
    explanation:
      "Refinancing date differs by one week between the two filings. Check the facility agreement for the executed date.",
    confidence: 91,
  },
  {
    id: "txt-bal-1",
    noteId: "note-bal-1",
    statement: "balance",
    title: "Receivables stated gross, not net",
    working: "stated gross of the allowance",
    reference: "stated net of the allowance",
    explanation:
      "This wording explains the 150 difference on Accounts receivable, net. One document presents the allowance separately, the other nets it off.",
    confidence: 93,
  },
  {
    id: "txt-bal-2",
    noteId: "note-bal-2",
    statement: "balance",
    title: "Going concern statement missing",
    working: "",
    reference:
      "The directors have assessed the Group's ability to continue as a going concern for at least twelve months from the date of approval",
    explanation:
      "Not found on the working document. The reference filing carries a going concern assessment that has no counterpart here.",
    confidence: 96,
    missingIn: "working",
  },
  {
    id: "txt-cf-1",
    noteId: "note-cf-1",
    statement: "cashflow",
    title: "Restricted cash treated differently",
    working: "excludes restricted cash of 227",
    reference: "includes restricted cash of 227",
    explanation:
      "Explains why closing cash does not tie to the balance sheet on the working document.",
    confidence: 89,
  },
];

/* ------------------------------ workbook cells ------------------------------ */

const FORMULA_ISSUES: {
  id: string;
  itemId: string;
  statement: StatementId;
  sheet: string;
  cell: string;
  formula: string;
  expectedFormula: string;
  defect: string;
  explanation: string;
  confidence: number;
}[] = [
  {
    id: "fx-inc-1",
    itemId: "income-04",
    statement: "income",
    sheet: "IS_Model",
    cell: "D11",
    formula: "=D9-D10+450",
    expectedFormula: "=D9-D10",
    defect: "Adjustment typed into the formula",
    explanation:
      "Inbound freight of 450 is added inside the cost of sales formula rather than reclassified. The same 450 sits in general & administrative on the reference filing.",
    confidence: 91,
  },
  {
    id: "fx-inc-2",
    itemId: "income-09",
    statement: "income",
    sheet: "IS_Model",
    cell: "D17",
    formula: "=SUM(D14:D15)",
    expectedFormula: "=SUM(D14:D16)",
    defect: "Range excludes a row",
    explanation:
      "The operating expense total stops at row 15, leaving research & development on row 16 outside the sum.",
    confidence: 87,
  },
  {
    id: "fx-inc-3",
    itemId: "income-16",
    statement: "income",
    sheet: "IS_Model",
    cell: "D26",
    formula: "='[FY2023_Model.xlsx]IS'!D26*1.02",
    expectedFormula: "=D25*Assumptions!$C$8",
    defect: "Stale external link",
    explanation:
      "Tax expense is grown from last year's workbook instead of applying this year's effective rate from the assumptions tab.",
    confidence: 76,
  },
  {
    id: "fx-bal-1",
    itemId: "balance-03",
    statement: "balance",
    sheet: "BS_Model",
    cell: "D8",
    formula: "22900",
    expectedFormula: "=D7-Allowance!D12",
    defect: "Hardcoded over a formula",
    explanation:
      "A typed value has replaced the formula that nets the expected credit loss allowance, so the allowance of 150 is no longer deducted.",
    confidence: 79,
  },
  {
    id: "fx-bal-2",
    itemId: "balance-09",
    statement: "balance",
    sheet: "BS_Model",
    cell: "D15",
    formula: "=9400-280",
    expectedFormula: "=D14-Amort!D19",
    defect: "Inline adjustment",
    explanation:
      "A full year of amortisation on the Q4 acquisition is subtracted inline; the reference filing charges one quarter.",
    confidence: 72,
  },
  {
    id: "fx-cf-1",
    itemId: "cashflow-21",
    statement: "cashflow",
    sheet: "CF_Model",
    cell: "D30",
    formula: "=D28+D29",
    expectedFormula: "=D28+D29 → ties to BS_Model!D6",
    defect: "Does not tie to the balance sheet",
    explanation:
      "Closing cash of 18,100 does not agree to cash on the balance sheet of 18,400. The 300 gap is the operating cash difference above.",
    confidence: 90,
  },
];

/* --------------------------------- builder --------------------------------- */

export function buildIssues(project: Project): Issue[] {
  const byId = new Map(project.items.map((i) => [i.id, i]));

  const valueIssues: Issue[] = project.items
    .filter((item) => item.explanation && !FORMULA_ISSUES.some((f) => f.itemId === item.id))
    .map((item) => ({
      id: `val-${item.id}`,
      kind: "value" as const,
      statement: item.statement,
      title: item.account,
      explanation: item.explanation!,
      confidence: item.confidence,
      itemId: item.id,
    }));

  const formulaIssues: Issue[] = FORMULA_ISSUES.filter((f) => byId.has(f.itemId)).map((f) => ({
    id: f.id,
    kind: "formula" as const,
    statement: f.statement,
    title: byId.get(f.itemId)!.account,
    explanation: f.explanation,
    confidence: f.confidence,
    itemId: f.itemId,
    sheet: f.sheet,
    cell: f.cell,
    formula: f.formula,
    expectedFormula: f.expectedFormula,
    defect: f.defect,
  }));

  const textIssues: Issue[] = TEXT_ISSUES.map((t) => ({
    id: t.id,
    kind: "text" as const,
    statement: t.statement,
    title: t.title,
    explanation: t.explanation,
    confidence: t.confidence,
    noteId: t.noteId,
    workingText: t.working,
    referenceText: t.reference,
    missingIn: t.missingIn,
  }));

  const order: Record<IssueKind, number> = { value: 0, formula: 1, text: 2 };
  return [...valueIssues, ...formulaIssues, ...textIssues].sort(
    (a, b) => order[a.kind] - order[b.kind]
  );
}

export function issuesForStatement(issues: Issue[], statement: StatementId) {
  return issues.filter((i) => i.statement === statement);
}

export function notesForStatement(statement: StatementId) {
  return NOTES.filter((n) => n.statement === statement);
}

/** Difference carried by a value or formula issue, for the card header. */
export function issueDelta(issue: Issue, project: Project) {
  const item = issue.itemId ? project.items.find((i) => i.id === issue.itemId) : undefined;
  return item ? difference(item) : 0;
}

/* -------------------------------- word diff -------------------------------- */

export interface DiffToken {
  text: string;
  changed?: boolean;
}

/** Token-level diff so a wording change reads as a change, not two paragraphs. */
export function wordDiff(a: string, b: string): { left: DiffToken[]; right: DiffToken[] } {
  const A = a.split(/(\s+)/).filter(Boolean);
  const B = b.split(/(\s+)/).filter(Boolean);
  const n = A.length;
  const m = B.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const left: DiffToken[] = [];
  const right: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      left.push({ text: A[i] });
      right.push({ text: B[j] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      left.push({ text: A[i], changed: true });
      i++;
    } else {
      right.push({ text: B[j], changed: true });
      j++;
    }
  }
  while (i < n) left.push({ text: A[i++], changed: true });
  while (j < m) right.push({ text: B[j++], changed: true });

  return { left, right };
}
