/**
 * A section of the filing under review — a statement, a note, a narrative
 * block, or one of the footing and tie-out checks.
 *
 * This was a three-value union while the app carried one made-up statement per
 * kind. A real reconciliation runs to dozens of sections, so the id is now
 * whatever the workbook called the sheet, and SECTIONS is the registry.
 */
export type StatementId = string;

export type ReviewStatus =
  | "matched"
  | "mismatched"
  | "needs_review"
  | "approved"
  | "rejected"
  | "edited";

export type ProjectStatus = "draft" | "running" | "in_review" | "completed";

export type DocKind = "pdf" | "xlsx";

export interface DocumentMeta {
  /** "A" and "B" are the primary pair; further sources carry their own ids. */
  id: string;
  fileName: string;
  kind: DocKind;
  sizeMb: number;
  /** Pages for PDFs, sheets for workbooks. */
  pages?: number;
  sheets?: string[];
  label: string;
}

export interface SourceRef {
  doc: string;
  /** PDF page number. */
  page?: number;
  /** Workbook sheet + cell. */
  sheet?: string;
  cell?: string;
  location: string;
  confidence: number;
}

export type ReviewAction =
  | "extracted"
  | "approved"
  | "rejected"
  | "flagged"
  | "edited"
  | "commented";

export interface ReviewEvent {
  id: string;
  actor: string;
  action: ReviewAction;
  at: string;
  note?: string;
  from?: string;
  to?: string;
}

export interface LineItem {
  id: string;
  statement: StatementId;
  section: string;
  account: string;
  /** 0 = top level, 1 = detail line. */
  level: 0 | 1;
  isSubtotal: boolean;
  valueA: number;
  valueB: number;
  /**
   * Wording, on the lines that carry words rather than a figure. Most of a
   * filing is prose — a note, a policy, a caption — and those lines reconcile
   * the same way, so they are line items too rather than a separate kind.
   */
  text?: { working: string; reference: string };
  /** Analyst override of the reconciled value. */
  editedValue?: number;
  unit: "currency" | "ratio";
  status: ReviewStatus;
  /** The machine verdict, kept so a human decision never erases the evidence. */
  agentStatus: Extract<ReviewStatus, "matched" | "mismatched" | "needs_review">;
  confidence: number;
  sourceA: SourceRef;
  sourceB: SourceRef;
  explanation?: string;
  reviewer?: string;
  reviewedAt?: string;
  note?: string;
  history: ReviewEvent[];
}

export interface StatementMeta {
  id: StatementId;
  label: string;
  shortLabel: string;
  /** How the reviewer's navigation clusters it — "Statements", "Notes", … */
  group: string;
  /** Page the section starts on in the filing. */
  page: number;
  /** The supporting document this section was read against. */
  referenceDoc: string;
  /** Reporting date the section reconciles, where it has one. */
  period: string;
}

export interface Project {
  id: string;
  name: string;
  entity: string;
  period: string;
  comparisonPeriod?: string;
  docA: DocumentMeta;
  docB: DocumentMeta;
  /** Every source in the reconciliation. Falls back to [docA, docB] when unset. */
  extraDocs?: DocumentMeta[];
  statements: StatementId[];
  matching: MatchingRule;
  tolerance: number;
  createdBy: string;
  createdAt: string;
  lastModified: string;
  status: ProjectStatus;
  reviewers: string[];
  items: LineItem[];
}

export type MatchingRule = "exact" | "rounding" | "custom";

export interface ReportSection {
  id: StatementId;
  title: string;
  included: boolean;
  columns: string[];
  hiddenAccounts: string[];
  note?: string;
}

export interface ReportDoc {
  id: string;
  projectId: string;
  title: string;
  summary: string;
  sections: ReportSection[];
  updatedAt: string;
}
