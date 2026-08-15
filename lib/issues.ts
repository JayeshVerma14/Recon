import { difference } from "@/lib/derive";
import type { DocumentMeta, LineItem, Project, StatementId } from "@/lib/types";

/**
 * Three things can disagree between two filings: a number, a word, or the
 * formula that produced the number. They are reviewed the same way but they
 * are not the same evidence, so each carries its own anchor and card.
 */
export type IssueKind = "value" | "text" | "formula";

/**
 * Which document is the outlier. The reconciled document in the middle is
 * read-only — it is the output — so a finding is a statement about a *source*:
 * either the filing is wrong, the workbook is wrong, or the two sources
 * disagree with each other and someone has to decide which one stands.
 */
export type Disagreement = "pdf" | "excel" | "both";

/** One source's reading of a reconciled line. */
export interface SourceReading {
  docId: string;
  label: string;
  kind: "pdf" | "xlsx";
  /** Absent when the source does not carry this line at all. */
  value?: number;
  covered: boolean;
  agrees: boolean;
  /** Signed difference against the reconciled figure. */
  delta: number;
}

/**
 * The shape of a disagreement, which is what decides how it gets worked:
 * one source out is a correction to raise; a split needs a judgement; and a
 * unanimous set that still differs from the reconciled figure is the agent's
 * own extraction error.
 */
export type DisagreementShape = "single" | "split" | "consensus";

export const SHAPE_META: Record<
  DisagreementShape,
  { label: string; hint: string; tint: string; fg: string }
> = {
  single: {
    label: "One source out",
    hint: "every other source agrees",
    tint: "rgba(245,158,11,0.14)",
    fg: "#B45309",
  },
  split: {
    label: "Sources split",
    hint: "no majority — needs a decision",
    tint: "rgba(139,92,246,0.12)",
    fg: "#6D28D9",
  },
  consensus: {
    label: "Sources agree, reconciled differs",
    hint: "extraction to check",
    tint: "rgba(220,38,38,0.10)",
    fg: "#B91C1C",
  },
};

export interface Issue {
  id: string;
  kind: IssueKind;
  side: Disagreement;
  statement: StatementId;
  /** Heading shown on the card. */
  title: string;
  explanation: string;
  confidence: number;

  /** How the sources fall out against each other. */
  shape: DisagreementShape;
  /** Every source's reading, outliers first. */
  readings: SourceReading[];
  /** Ids of the sources that disagree with the reconciled figure. */
  disagreeing: string[];

  /** value + formula issues are anchored to a reconciled line. */
  itemId?: string;
  /** The three figures in play. Absent means "same as the reconciled figure". */
  workingValue?: number;
  pdfValue?: number;
  excelValue?: number;

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
  side: Disagreement;
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
    side: "both",
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
    side: "both",
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
    side: "both",
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
    side: "both",
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
    side: "pdf",
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
    side: "both",
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
  side: Disagreement;
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
    side: "both",
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
    side: "excel",
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
    side: "excel",
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
    side: "excel",
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
    side: "both",
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
    side: "excel",
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


/* --------------------- one source wrong, the other right -------------------- */

/**
 * Where only one source is out, the reconciled figure follows the source that
 * agrees with the rest of the statement — and the finding names the outlier so
 * the correction is raised against the right document.
 */
const SINGLE_SOURCE_ISSUES: {
  id: string;
  itemId: string;
  statement: StatementId;
  side: Disagreement;
  working: number;
  pdf: number;
  excel: number;
  explanation: string;
  confidence: number;
}[] = [
  {
    id: "src-inc-1",
    itemId: "income-11",
    statement: "income",
    side: "pdf",
    working: 4100,
    pdf: 4180,
    excel: 4100,
    explanation:
      "The filing prints 4,180 while the workbook and the reconciled statement both carry 4,100. The figure in the filing predates the final depreciation run — raise it against the filing, not the model.",
    confidence: 88,
  },
  {
    id: "src-inc-2",
    itemId: "income-06",
    statement: "income",
    side: "excel",
    working: 9800,
    pdf: 9800,
    excel: 9860,
    explanation:
      "The workbook is 60 higher than both the filing and the reconciled statement. A media accrual is picked up twice on the marketing tab.",
    confidence: 82,
  },
  {
    id: "src-bal-1",
    itemId: "balance-01",
    statement: "balance",
    side: "pdf",
    working: 18400,
    pdf: 18040,
    excel: 18400,
    explanation:
      "18,040 in the filing against 18,400 everywhere else — a transposed digit. The bank confirmation supports 18,400.",
    confidence: 94,
  },
  {
    id: "src-bal-2",
    itemId: "balance-14",
    statement: "balance",
    side: "excel",
    working: 8650,
    pdf: 8650,
    excel: 8560,
    explanation:
      "The workbook shows 8,560 where the filing and the reconciled statement agree on 8,650. Digits transposed in the accruals schedule.",
    confidence: 86,
  },
  {
    /* nobody disagrees with anybody — the reconciled figure is the one that is out */
    id: "src-cf-0",
    itemId: "cashflow-02",
    statement: "cashflow",
    side: "both",
    working: 4010,
    pdf: 4100,
    excel: 4100,
    explanation:
      "All five sources report 4,100 and the reconciled statement carries 4,010. Nothing disagrees except the extraction — re-read this line before signing the page off.",
    confidence: 68,
  },
  {
    id: "src-cf-1",
    itemId: "cashflow-03",
    statement: "cashflow",
    side: "excel",
    working: 3850,
    pdf: 3850,
    excel: 3580,
    explanation:
      "Share-based payment expense is 3,580 in the workbook against 3,850 in the filing and the reconciled statement. The workbook omits the Q4 grant tranche.",
    confidence: 90,
  },
];


/* ------------------------------- more sources ------------------------------ */

/**
 * A reconciliation is rarely two documents. These sit alongside the primary
 * pair and are read the same way — the point of the model is that no source is
 * privileged except the reconciled output itself.
 */
export const EXTRA_SOURCES: DocumentMeta[] = [
  {
    id: "C",
    fileName: "10-K_2023.pdf",
    kind: "pdf",
    sizeMb: 15.9,
    pages: 186,
    label: "Prior-year 10-K",
  },
  {
    id: "D",
    fileName: "Trial_Balance_Q4.xlsx",
    kind: "xlsx",
    sizeMb: 2.1,
    sheets: ["TB_Q4", "Mapping", "Adjustments"],
    label: "Trial balance",
  },
  {
    id: "E",
    fileName: "Board_Pack_Dec.pdf",
    kind: "pdf",
    sizeMb: 9.4,
    pages: 64,
    label: "Board pack",
  },
];

/**
 * Where a further source departs from the reconciled figure. Anything not
 * listed here reads the same as the reconciled statement — which is the normal
 * case, and the reason the card collapses agreement rather than listing it.
 */
const EXTRA_READINGS: { docId: string; itemId: string; value: number }[] = [
  /* the trial balance is systematically out on opex — a mapping error */
  { docId: "D", itemId: "income-06", value: 9860 },
  { docId: "D", itemId: "income-07", value: 6280 },
  { docId: "D", itemId: "income-09", value: 21940 },
  /* the prior-year filing carries the pre-restatement tax charge */
  { docId: "C", itemId: "income-16", value: 6250 },
  /* the board pack rounds to the nearest hundred */
  { docId: "E", itemId: "income-03", value: 125000 },
  { docId: "E", itemId: "balance-01", value: 18400 },
  /* three-way split on receivables: every source has its own number */
  { docId: "C", itemId: "balance-03", value: 22750 },
  { docId: "D", itemId: "balance-03", value: 22820 },
  /* the whole set agrees, and the reconciled figure is the odd one out */
  { docId: "C", itemId: "cashflow-02", value: 4100 },
  { docId: "D", itemId: "cashflow-02", value: 4100 },
  { docId: "E", itemId: "cashflow-02", value: 4100 },
  /* board pack is stale on closing cash */
  { docId: "E", itemId: "cashflow-21", value: 18400 },
];

/** Every source in the reconciliation, primary pair first. */
export function documentsOf(project: Project): DocumentMeta[] {
  return [project.docA, project.docB, ...(project.extraDocs ?? EXTRA_SOURCES)];
}

/* --------------------------------- builder --------------------------------- */

/**
 * Reads every source against the reconciled figure and classifies the result.
 * A source that carries the same number simply "agrees" — that is the common
 * case, and the card collapses it rather than listing it.
 */
function readSources(
  project: Project,
  item: LineItem,
  working: number,
  primary: { pdf: number; excel: number }
): { readings: SourceReading[]; disagreeing: string[]; shape: DisagreementShape } {
  const docs = documentsOf(project);

  const readings: SourceReading[] = docs.map((doc) => {
    const override = EXTRA_READINGS.find((r) => r.docId === doc.id && r.itemId === item.id);
    const value =
      doc.id === "A"
        ? primary.pdf
        : doc.id === "B"
          ? primary.excel
          : (override?.value ?? working);

    const delta = Number((value - working).toFixed(2));
    return {
      docId: doc.id,
      label: doc.label,
      kind: doc.kind,
      value,
      covered: true,
      agrees: delta === 0,
      delta,
    };
  });

  const disagreeing = readings.filter((r) => !r.agrees).map((r) => r.docId);

  /* every source lands on the same number, and it is not the reconciled one */
  const values = readings.map((r) => r.value ?? working);
  const unanimous = values.every((v) => v === values[0]);
  const shape: DisagreementShape = unanimous
    ? "consensus"
    : disagreeing.length === 1
      ? "single"
      : "split";

  /* outliers first, largest first — the agreeing tail collapses in the card */
  readings.sort((a, b) => Number(a.agrees) - Number(b.agrees) || Math.abs(b.delta) - Math.abs(a.delta));

  return { readings, disagreeing, shape };
}

export function buildIssues(project: Project): Issue[] {
  const byId = new Map(project.items.map((i) => [i.id, i]));
  const claimed = new Set([
    ...FORMULA_ISSUES.map((f) => f.itemId),
    ...SINGLE_SOURCE_ISSUES.map((f) => f.itemId),
  ]);

  /* the primary pair disagree with each other */
  const valueIssues: Issue[] = project.items
    .filter((item) => item.explanation && !claimed.has(item.id))
    .map((item) => {
      const read = readSources(project, item, item.valueB, {
        pdf: item.valueA,
        excel: item.valueB,
      });
      return {
        id: `val-${item.id}`,
        kind: "value" as const,
        side: "both" as const,
        statement: item.statement,
        title: item.account,
        explanation: item.explanation!,
        confidence: item.confidence,
        itemId: item.id,
        workingValue: item.valueB,
        pdfValue: item.valueA,
        excelValue: item.valueB,
        ...read,
      };
    });

  /* exactly one of the primary pair is out */
  const singleSourceIssues: Issue[] = SINGLE_SOURCE_ISSUES.filter((f) => byId.has(f.itemId)).map(
    (f) => {
      const item = byId.get(f.itemId)!;
      const read = readSources(project, item, f.working, { pdf: f.pdf, excel: f.excel });
      return {
        id: f.id,
        kind: "value" as const,
        side: f.side,
        statement: f.statement,
        title: item.account,
        explanation: f.explanation,
        confidence: f.confidence,
        itemId: f.itemId,
        workingValue: f.working,
        pdfValue: f.pdf,
        excelValue: f.excel,
        ...read,
      };
    }
  );

  const formulaIssues: Issue[] = FORMULA_ISSUES.filter((f) => byId.has(f.itemId)).map((f) => {
    const item = byId.get(f.itemId)!;
    const working = f.side === "excel" ? item.valueA : item.valueB;
    const read = readSources(project, item, working, { pdf: item.valueA, excel: item.valueB });
    return {
      id: f.id,
      kind: "formula" as const,
      side: f.side,
      statement: f.statement,
      title: item.account,
      explanation: f.explanation,
      confidence: f.confidence,
      itemId: f.itemId,
      workingValue: working,
      pdfValue: item.valueA,
      excelValue: item.valueB,
      sheet: f.sheet,
      cell: f.cell,
      formula: f.formula,
      expectedFormula: f.expectedFormula,
      defect: f.defect,
      ...read,
    };
  });

  /* a further source disagrees on a line the primary pair agreed on */
  const extraOnly: Issue[] = (project.items
    .filter((item) => !claimed.has(item.id) && !item.explanation)
    .map((item): Issue | null => {
      const overrides = EXTRA_READINGS.filter((r) => r.itemId === item.id);
      if (!overrides.length) return null;
      const read = readSources(project, item, item.valueB, {
        pdf: item.valueA,
        excel: item.valueB,
      });
      if (!read.disagreeing.length) return null;

      const names = read.readings
        .filter((r) => !r.agrees)
        .map((r) => r.label)
        .join(" and ");
      return {
        id: `ext-${item.id}`,
        kind: "value" as const,
        side: "both" as const,
        statement: item.statement,
        title: item.account,
        explanation:
          read.shape === "consensus"
            ? `Every source reports the same figure and the reconciled statement does not. Re-check the extraction for this line.`
            : `${names} report a different figure from the reconciled statement, which follows ${
                read.readings.find((r) => r.agrees)?.label ?? "the primary pair"
              }.`,
        confidence: item.confidence,
        itemId: item.id,
        workingValue: item.valueB,
        pdfValue: item.valueA,
        excelValue: item.valueB,
        ...read,
      };
    }) as (Issue | null)[]).filter((x): x is Issue => x !== null);

  const textIssues: Issue[] = TEXT_ISSUES.map((t) => ({
    id: t.id,
    kind: "text" as const,
    side: t.side,
    shape: "split" as const,
    readings: [],
    disagreeing: t.side === "pdf" ? ["A"] : ["A", "B"],
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
  return [...valueIssues, ...singleSourceIssues, ...extraOnly, ...formulaIssues, ...textIssues].sort(
    (a, b) => order[a.kind] - order[b.kind]
  );
}

/** The figure the reconciled document reports, per line. */
export function workingValues(issues: Issue[]) {
  const map = new Map<string, number>();
  issues.forEach((issue) => {
    if (issue.itemId && issue.workingValue !== undefined) map.set(issue.itemId, issue.workingValue);
  });
  return map;
}

/** Does this finding implicate the given document? */
export function implicates(issue: Issue, doc: string) {
  if (doc === "pdf") return issue.disagreeing.includes("A");
  if (doc === "excel") return issue.disagreeing.includes("B");
  return issue.disagreeing.includes(doc);
}

export const SIDE_META: Record<
  Disagreement,
  { label: string; short: string; tint: string; fg: string }
> = {
  pdf: { label: "Filing differs", short: "Filing", tint: "rgba(220,38,38,0.10)", fg: "#B91C1C" },
  excel: { label: "Workbook differs", short: "Workbook", tint: "rgba(245,158,11,0.14)", fg: "#B45309" },
  both: { label: "Sources disagree", short: "Both", tint: "rgba(139,92,246,0.12)", fg: "#6D28D9" },
};

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
