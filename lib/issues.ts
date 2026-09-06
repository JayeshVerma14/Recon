import { difference } from "@/lib/derive";
import { FIXTURE, FIXTURE_ROWS, rowById, type FixtureRow } from "@/lib/fixture";
import type { DocumentMeta, Project, StatementId } from "@/lib/types";

/**
 * Three things can disagree between two filings: a number, a word, or the
 * formula that produced the number. They are reviewed the same way but they
 * are not the same evidence, so each carries its own anchor and card.
 *
 * A "gap" is the fourth thing, and it is not a disagreement at all: the line
 * could not be checked, because the evidence to check it against never
 * arrived. A tick and a cross both mean "we looked". This means "we could not
 * look", and it is kept apart from the other three so it can never be read as
 * a verdict.
 */
export type IssueKind = "value" | "text" | "formula" | "gap";

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
  /** False when no figure could be obtained — see `note` for why. */
  covered: boolean;
  /** On a gap, what happened when this source was searched. */
  note?: string;
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
export type DisagreementShape = "single" | "split" | "consensus" | "unverified";

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
  unverified: {
    label: "Could not be verified",
    hint: "no evidence either way",
    tint: "rgba(14,116,144,0.10)",
    fg: "#0B5A70",
  },
};

/* ------------------------------ evidence gaps ------------------------------ */

/**
 * Why a line could not be checked. The reasons differ and the remedy differs
 * with them, so the reason is carried on the finding rather than flattened
 * into one "unknown" bucket — "the page was never uploaded" is a five-second
 * fix, and "no source carries this line at all" is a question for the
 * preparer.
 */
export type GapReason = "absent" | "unreadable" | "unmapped" | "out_of_range" | "stale";

export const GAP_META: Record<GapReason, { label: string; hint: string }> = {
  absent: {
    label: "Not in any source",
    hint: "no source document carries this line",
  },
  unreadable: {
    label: "Found but unreadable",
    hint: "the figure is on the page and could not be read off it",
  },
  unmapped: {
    label: "No account mapping",
    hint: "a source holds the balance in a bucket that maps nowhere",
  },
  out_of_range: {
    label: "Outside the uploaded pages",
    hint: "the page or sheet that would carry it was never uploaded",
  },
  stale: {
    label: "Only an out-of-period source",
    hint: "the one source carrying it is from another period",
  },
};

/**
 * The ink an unverified line is written in. Every other colour in this viewer
 * carries a verdict — green agrees, red and amber name the document at fault,
 * violet means the sources split. A line with no verdict borrows none of them:
 * it gets a hue of its own, and its mark is drawn hollow and dashed so it
 * still reads as "nothing here" in greyscale, on a printout, or to a reader
 * who cannot separate the hues at all.
 */
export const GAP_INK = {
  /** The query mark, and chip text. */
  fg: "#0E7490",
  /** Small text, where 12px needs the extra contrast. */
  strong: "#0B5A70",
  tint: "rgba(14,116,144,0.10)",
  /** Dashed rings and rules. */
  edge: "rgba(14,116,144,0.55)",
} as const;

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

  /** gap issues — why the line could not be checked. */
  gapReason?: GapReason;

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

/**
 * The passages the filing carries, alongside the wording the source it was read
 * against used. A note is any line with words where a figure would otherwise
 * be — which in a 10-Q is most of the document.
 */
export const NOTES: DocNote[] = FIXTURE_ROWS.filter(
  ({ row }) => row.working === null && (row.workingText || referenceTextOf(row))
).map(({ section, row }) => {
  const referenceBody = referenceTextOf(row);
  return {
    id: `note-${row.id}`,
    statement: section.id,
    heading: row.account,
    body: row.workingText,
    referenceBody: referenceBody || undefined,
    referenceOnly: !row.workingText && Boolean(referenceBody),
  };
});

function referenceTextOf(row: FixtureRow) {
  return row.readings.find((r) => r.text)?.text ?? "";
}

/* --------------------------------- sources --------------------------------- */

/**
 * Everything the filing was read against beyond the primary pair. A footing
 * check reads the filing against itself, so the filing is its own source
 * there — which is why the working document can appear in a reading.
 */
export const EXTRA_SOURCES: DocumentMeta[] = FIXTURE.documents
  .filter((doc) => doc.id !== "A" && doc.id !== FIXTURE.workingDoc)
  .map((doc) => ({
    id: doc.id,
    fileName: doc.fileName,
    kind: doc.kind,
    sizeMb: doc.sizeMb,
    pages: doc.pages,
    sheets: doc.sheets,
    label: doc.label,
  }));

/** Every source in the reconciliation, primary pair first. */
export function documentsOf(project: Project): DocumentMeta[] {
  return [project.docA, project.docB, ...(project.extraDocs ?? EXTRA_SOURCES)];
}

/* --------------------------------- builder --------------------------------- */

/** Why the line could not be checked, read off the agent's own wording. */
function gapReasonFrom(reason: string): GapReason {
  const text = reason.toLowerCase();
  if (/map|bucket|account code/.test(text)) return "unmapped";
  if (/unreadable|could not be read|illegible/.test(text)) return "unreadable";
  if (/prior period|out-of-period|another period|prior filing only/.test(text)) return "stale";
  if (/page|not uploaded|outside the/.test(text)) return "out_of_range";
  return "absent";
}

/**
 * What each source had to say about one line.
 *
 * A source that was never read against this line is not the same as one that
 * was read and found nothing, so the two are kept apart: the first is simply
 * uncovered, the second carries the agent's note about what the search turned
 * up. Both render as "no figure", and only the second is evidence.
 */
function readSources(project: Project, row: FixtureRow, tolerance: number) {
  const working = row.working ?? 0;

  const readings: SourceReading[] = documentsOf(project).map((doc) => {
    const reading = row.readings.find((r) => r.docId === doc.id);
    const value = reading?.value ?? undefined;
    const delta = value === undefined ? 0 : Number((value - working).toFixed(2));
    return {
      docId: doc.id,
      label: doc.label,
      kind: doc.kind,
      value,
      covered: value !== undefined,
      note: reading ? reading.reason || reading.text || undefined : "Not read against this line",
      /* the filing rounds to whole dollars; a sub-unit gap is that rounding,
         not two documents disagreeing about the figure */
      agrees: value !== undefined && Math.abs(delta) < Math.max(tolerance, 1),
      delta,
    };
  });

  const spoke = readings.filter((r) => r.covered);
  const disagreeing = spoke.filter((r) => !r.agrees).map((r) => r.docId);

  let shape: DisagreementShape;
  if (!spoke.length) {
    shape = "unverified";
  } else if (disagreeing.length === 0) {
    shape = "split";
  } else if (disagreeing.length === spoke.length && spoke.length > 1) {
    const values = spoke.map((r) => r.value as number);
    shape = values.every((v) => Math.abs(v - values[0]) < 1) ? "consensus" : "split";
  } else {
    shape = disagreeing.length === 1 ? "single" : "split";
  }

  /* outliers first, largest first — the agreeing tail collapses in the card */
  readings.sort(
    (a, b) =>
      Number(a.covered) - Number(b.covered) ||
      Number(a.agrees) - Number(b.agrees) ||
      Math.abs(b.delta) - Math.abs(a.delta)
  );

  return { readings, disagreeing, shape };
}

/** Which side of the pair a finding is raised against. */
function sideOf(project: Project, disagreeing: string[]): Disagreement {
  if (disagreeing.length !== 1) return "both";
  const doc = documentsOf(project).find((d) => d.id === disagreeing[0]);
  return doc?.kind === "xlsx" ? "excel" : "pdf";
}

function firstValueOfKind(readings: SourceReading[], kind: "pdf" | "xlsx") {
  return readings.find((r) => r.kind === kind && r.covered)?.value;
}

/**
 * Every finding in the reconciliation.
 *
 * Nothing here is authored: a line the agent matched raises no comment, and a
 * line it could not match raises the comment its own note explains. The four
 * kinds are told apart by what the evidence looks like, not by a label in the
 * data — a line with figures that differ is a value finding, a line with words
 * that differ is a text finding, a line the filing was checked against itself
 * on is a footing finding, and a line no source carried is a gap.
 */
export function buildIssues(project: Project): Issue[] {
  const issues: Issue[] = [];

  project.items.forEach((item) => {
    const found = rowById(item.id);
    if (!found) return;
    const { section, row } = found;
    if (row.status === "Matched") return;

    const { readings, disagreeing, shape } = readSources(project, row, project.tolerance);
    const spoke = readings.filter((r) => r.covered);
    const numeric = row.working !== null || spoke.length > 0;
    /* the filing read against itself — a footing or cross-cast check */
    const selfCheck = section.referenceDoc === FIXTURE.workingDoc;

    const base = {
      statement: section.id,
      title: row.account,
      itemId: item.id,
      confidence: item.confidence,
      workingValue: row.working ?? undefined,
      pdfValue: firstValueOfKind(readings, "pdf"),
      excelValue: firstValueOfKind(readings, "xlsx"),
      readings,
      disagreeing,
    };

    if (row.status === "Unmatched") {
      issues.push({
        ...base,
        id: `gap-${item.id}`,
        kind: "gap",
        side: "both",
        shape: "unverified",
        /* there is no confidence in a reading that was never taken */
        confidence: 0,
        gapReason: gapReasonFrom(row.reason),
        explanation:
          row.reason ||
          "No source carried this line, so there was nothing to reconcile it against.",
        /* no source is at fault — the evidence simply is not there */
        disagreeing: [],
        readings: readings.map((r) => ({ ...r, covered: false, agrees: false })),
      });
      return;
    }

    if (!numeric || (row.textMatch === "No" && row.variance === null)) {
      issues.push({
        ...base,
        id: `txt-${item.id}`,
        kind: "text",
        side: sideOf(project, disagreeing.length ? disagreeing : [section.referenceDoc]),
        shape: "split",
        noteId: `note-${row.id}`,
        workingText: row.workingText,
        referenceText: referenceTextOf(row),
        missingIn: row.workingText ? undefined : "working",
        explanation: row.reason || "The two documents word this passage differently.",
      });
      return;
    }

    issues.push({
      ...base,
      id: `${selfCheck ? "fx" : "val"}-${item.id}`,
      kind: selfCheck ? "formula" : "value",
      side: sideOf(project, disagreeing),
      shape,
      ...(selfCheck
        ? {
            sheet: section.shortLabel,
            cell: `p.${section.page}`,
            formula: formatFigure(row.working),
            expectedFormula: formatFigure(spoke[0]?.value),
            defect: "Does not foot",
          }
        : {}),
      explanation:
        row.reason ||
        (shape === "consensus"
          ? "Every source that carried this line reports the same figure, and the filing does not."
          : "The sources do not agree on this line."),
    });
  });

  const order: Record<IssueKind, number> = { gap: 0, value: 1, formula: 2, text: 3 };
  return issues.sort((a, b) => order[a.kind] - order[b.kind]);
}

function formatFigure(value: number | null | undefined) {
  if (value === null || value === undefined) return "—";
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
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
