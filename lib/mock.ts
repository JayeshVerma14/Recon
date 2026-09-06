import {
  FIXTURE,
  FIXTURE_SECTIONS,
  type FixtureReading,
  type FixtureRow,
  type FixtureSection,
} from "@/lib/fixture";
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
export const NOW = new Date("2025-11-14T09:00:00.000Z");

export const CURRENT_USER = "Jayesh Verma";

export const USERS = [
  { name: "Jayesh Verma", role: "Senior Analyst" },
  { name: "Alex Whitfield", role: "Controller" },
  { name: "Priya Raman", role: "Audit Manager" },
  { name: "Daniel Okafor", role: "Analyst" },
];

/* ------------------------------------------------------------------ *
 * Sections
 * ------------------------------------------------------------------ */

export const STATEMENTS: StatementMeta[] = FIXTURE_SECTIONS.map((section) => ({
  id: section.id,
  label: section.label,
  shortLabel: section.shortLabel,
  group: section.group,
  page: section.page,
  referenceDoc: section.referenceDoc,
  period: section.period,
}));

const SECTION_META = new Map(STATEMENTS.map((s) => [s.id, s]));

export const statementLabel = (id: StatementId) => SECTION_META.get(id)?.label ?? id;
export const statementShortLabel = (id: StatementId) => SECTION_META.get(id)?.shortLabel ?? id;
export const statementMeta = (id: StatementId) => SECTION_META.get(id);

/** What a section actually holds — counted off the run, never guessed. */
export function sectionSummary(id: StatementId) {
  const section = FIXTURE_SECTIONS.find((s) => s.id === id);
  if (!section) return "";
  const lines = section.rows.length;
  const open = section.rows.filter((r) => r.status !== "Matched").length;
  return `${lines} line${lines === 1 ? "" : "s"} · ${
    open === 0 ? "all agree" : `${open} to review`
  }`;
}

/* ------------------------------------------------------------------ *
 * Line items
 * ------------------------------------------------------------------ */

const STATUS: Record<FixtureRow["status"], ReviewStatus> = {
  Matched: "matched",
  Partial: "mismatched",
  /* found in one document and nowhere else — nothing was compared, so it is
     never "mismatched"; it is waiting on a person */
  Unmatched: "needs_review",
};

const AGENT_STATUS: Record<FixtureRow["status"], LineItem["agentStatus"]> = {
  Matched: "matched",
  Partial: "mismatched",
  Unmatched: "needs_review",
};

/** A caption introduces the lines under it and carries no figure of its own. */
function isCaption(row: FixtureRow) {
  return row.working === null && row.level === 0 && !row.isSubtotal;
}

const RATIO = /(per share|per common share|rate|ratio|%|yield)/i;

/**
 * How much of the evidence agrees.
 *
 * There is no confidence column in a reconciliation — the agent reports what
 * each source said, not how sure it feels. So this is derived and means one
 * thing only: the share of sources that landed on the figure the filing
 * prints. A line no source could speak to has none, which is why the card
 * shows coverage there instead.
 */
function agreement(row: FixtureRow) {
  const spoke = row.readings.filter((r) => r.value !== null);
  if (!spoke.length) return row.status === "Matched" ? 92 : 0;
  const working = row.working ?? 0;
  /* a sub-unit difference is the filing rounding to whole dollars, not a
     disagreement about the number */
  const agree = spoke.filter((r) => Math.abs((r.value as number) - working) < 1).length;
  return Math.round(40 + (agree / spoke.length) * 59);
}

function unitOf(row: FixtureRow): LineItem["unit"] {
  return RATIO.test(row.account) ? "ratio" : "currency";
}

function readingFor(row: FixtureRow, docId: string): FixtureReading | undefined {
  return row.readings.find((r) => r.docId === docId);
}

function buildSection(section: FixtureSection): LineItem[] {
  let heading = section.label;

  return section.rows.map((row) => {
    if (isCaption(row)) heading = row.account.replace(/:$/, "");

    const reference = readingFor(row, section.referenceDoc);
    const confidence = agreement(row);
    const status = STATUS[row.status];

    return {
      id: row.id,
      statement: section.id,
      section: heading,
      account: row.account,
      level: row.level,
      isSubtotal: row.isSubtotal,
      valueA: reference?.value ?? 0,
      valueB: row.working ?? 0,
      text:
        row.working === null && (row.workingText || reference?.text)
          ? { working: row.workingText, reference: reference?.text ?? "" }
          : undefined,
      unit: unitOf(row),
      status,
      agentStatus: AGENT_STATUS[row.status],
      confidence,
      explanation: row.reason || undefined,
      /* the agent wrote this line on a row of its own workbook: column B
         holds what the source said, column C what the filing prints */
      sourceA: {
        doc: section.referenceDoc,
        page: section.page,
        sheet: row.sheet,
        cell: `B${row.sheetRow}`,
        location: `${section.label}${section.period ? ` · ${section.period}` : ""}`,
        confidence,
      },
      sourceB: {
        doc: FIXTURE.workingDoc,
        page: section.page,
        sheet: row.sheet,
        cell: `C${row.sheetRow}`,
        location: `${section.label} · p.${section.page}`,
        confidence,
      },
      history: [
        {
          id: `${row.id}-h0`,
          actor: "Reconciliation Agent",
          action: "extracted" as const,
          at: "2025-11-14T06:12:00.000Z",
          note:
            row.reason ||
            (row.status === "Matched"
              ? "Agrees with every source that carried the line."
              : "No supporting source carried this line."),
        },
      ],
    } satisfies LineItem;
  });
}

const ITEMS: LineItem[] = FIXTURE_SECTIONS.flatMap(buildSection);

/* ------------------------------------------------------------------ *
 * Documents and project
 * ------------------------------------------------------------------ */

const DOCS: DocumentMeta[] = FIXTURE.documents.map((doc) => ({
  id: doc.id,
  fileName: doc.fileName,
  kind: doc.kind,
  sizeMb: doc.sizeMb,
  pages: doc.pages,
  sheets: doc.sheets,
  label: doc.label,
}));

export const DOCUMENTS = DOCS;

const workingDoc = DOCS.find((d) => d.id === FIXTURE.workingDoc)!;
/* the support the filing is read against most often leads the pair */
const primaryReference = DOCS.find((d) => d.id === "A") ?? DOCS[0];

export const STAR_MOUNTAIN_PROJECT: Project = {
  id: "starmountain-q3-2025",
  name: "Star Mountain LMMC — Q3 2025 10-Q",
  entity: FIXTURE.entity,
  period: FIXTURE.period,
  comparisonPeriod: FIXTURE.comparisonPeriod,
  docA: primaryReference,
  docB: workingDoc,
  extraDocs: DOCS.filter((d) => d.id !== primaryReference.id && d.id !== workingDoc.id),
  statements: FIXTURE_SECTIONS.map((s) => s.id),
  matching: "rounding",
  tolerance: 1,
  createdBy: "Alex Whitfield",
  createdAt: "2025-11-13T11:20:00.000Z",
  lastModified: "2025-11-14T08:02:00.000Z",
  status: "in_review",
  reviewers: ["Alex Whitfield", "Priya Raman", "Daniel Okafor", "Jayesh Verma"],
  items: ITEMS,
};

/** The statements a shorter engagement would cover — used by the list rows. */
const CORE_SECTIONS = FIXTURE_SECTIONS.filter((s) => s.group === "Statements").map((s) => s.id);
const STATEMENTS_AND_NOTES = FIXTURE_SECTIONS.filter(
  (s) => s.group === "Statements" || s.group === "Notes"
).map((s) => s.id);

/** Older runs exist only as list rows — opening one reuses this workspace. */
export const OTHER_PROJECTS: Project[] = [
  {
    ...STAR_MOUNTAIN_PROJECT,
    id: "starmountain-q2-2025",
    name: "Star Mountain LMMC — Q2 2025 10-Q",
    period: "Q2 2025",
    comparisonPeriod: "Q1 2025",
    statements: STATEMENTS_AND_NOTES,
    createdBy: "Priya Raman",
    createdAt: "2025-08-06T09:00:00.000Z",
    lastModified: "2025-08-14T16:30:00.000Z",
    status: "completed",
    reviewers: ["Priya Raman", "Jayesh Verma"],
  },
  {
    ...STAR_MOUNTAIN_PROJECT,
    id: "starmountain-fy2024",
    name: "Star Mountain LMMC — FY2024 audit tie-out",
    period: "FY2024",
    comparisonPeriod: "FY2023",
    statements: CORE_SECTIONS,
    createdBy: "Daniel Okafor",
    createdAt: "2025-03-02T13:45:00.000Z",
    lastModified: "2025-03-28T10:12:00.000Z",
    status: "completed",
    reviewers: ["Daniel Okafor", "Alex Whitfield"],
  },
];

export const PROJECTS: Project[] = [STAR_MOUNTAIN_PROJECT, ...OTHER_PROJECTS];

/* ---------------------------------- reports -------------------------------- */

export const REPORTS: ReportDoc[] = PROJECTS.map((project) => ({
  id: `rep-${project.id}`,
  projectId: project.id,
  title: `${project.name} — Reconciliation Report`,
  summary: `Reconciliation of ${project.statements.length} section${
    project.statements.length > 1 ? "s" : ""
  } of ${project.docB.label}, read against ${project.docA.label} and ${
    (project.extraDocs ?? []).length
  } further source${(project.extraDocs ?? []).length === 1 ? "" : "s"}.`,
  updatedAt: project.lastModified,
  sections: project.statements.map((id) => ({
    id,
    title: statementLabel(id),
    included: true,
    columns: ["Account", "Source", "Filing", "Variance", "Status", "Agreement", "Reviewer"],
    hiddenAccounts: [],
  })),
}));

/* -------------------------------- PDF pages -------------------------------- */

/** Page headings for the document viewer, taken from the filing itself. */
export const PDF_PAGE_INDEX: Record<number, string> = {
  1: "Cover Page",
  2: "Table of Contents",
  3: "Consolidated Statements of Assets and Liabilities",
  4: "Consolidated Statements of Operations",
  5: "Consolidated Statements of Changes in Net Assets",
  6: "Consolidated Statements of Cash Flows",
  7: "Consolidated Schedule of Investments",
  17: "Notes to Consolidated Financial Statements",
  20: "Note 12 — Cash",
  22: "Note 3 — Investments",
  24: "Note 4 — Fair Value Measurements",
  28: "Note 5 — Transactions with Affiliated Companies",
  29: "Note 6 — Transactions with Related Parties",
  32: "Note 7 — Borrowings",
  33: "Note 8 — Income Taxes",
  35: "Note 9 — Stock Issuances",
  36: "Note 10 — Discretionary Repurchases",
  37: "Note 11 — Commitments, Contingencies and Risks",
  40: "Management's Discussion and Analysis",
};

export const pageForStatement: Record<StatementId, number> = Object.fromEntries(
  FIXTURE_SECTIONS.map((s) => [s.id, s.page])
);
