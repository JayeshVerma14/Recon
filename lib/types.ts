export type StatementId = "income" | "balance" | "cashflow";

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
  id: "A" | "B";
  fileName: string;
  kind: DocKind;
  sizeMb: number;
  /** Pages for PDFs, sheets for workbooks. */
  pages?: number;
  sheets?: string[];
  label: string;
}

export interface SourceRef {
  doc: "A" | "B";
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
}

export interface Project {
  id: string;
  name: string;
  entity: string;
  period: string;
  comparisonPeriod?: string;
  docA: DocumentMeta;
  docB: DocumentMeta;
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
