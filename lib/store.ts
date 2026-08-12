"use client";

import { create } from "zustand";

import { CURRENT_USER, PROJECTS, REPORTS } from "@/lib/mock";
import type {
  DocumentMeta,
  LineItem,
  MatchingRule,
  Project,
  ReportDoc,
  ReviewEvent,
  ReviewStatus,
  StatementId,
} from "@/lib/types";

export type ConfidenceFilter = "all" | "high" | "medium" | "low";
export type StatusFilter = "all" | ReviewStatus;

export interface Filters {
  status: StatusFilter;
  query: string;
  confidence: ConfidenceFilter;
  unreviewedOnly: boolean;
}

/** Draft held by the New Reconciliation wizard. */
export interface Draft {
  name: string;
  entity: string;
  docA: DocumentMeta | null;
  docB: DocumentMeta | null;
  statements: StatementId[];
  period: string;
  comparisonPeriod: string;
  matching: MatchingRule;
  tolerance: number;
}

const EMPTY_DRAFT: Draft = {
  name: "",
  entity: "",
  docA: null,
  docB: null,
  statements: ["income", "balance"],
  period: "FY2024",
  comparisonPeriod: "FY2023",
  matching: "rounding",
  tolerance: 1,
};

interface State {
  projects: Project[];
  reports: ReportDoc[];
  activeProjectId: string;
  statement: StatementId;
  filters: Filters;
  selection: string[];
  activeItemId: string | null;
  sourceDoc: "A" | "B";
  draft: Draft;

  /* navigation */
  setActiveProject: (id: string) => void;
  setStatement: (id: StatementId) => void;
  setFilters: (patch: Partial<Filters>) => void;
  resetFilters: () => void;
  setActiveItem: (id: string | null, doc?: "A" | "B") => void;
  setSourceDoc: (doc: "A" | "B") => void;

  /* selection */
  toggleSelect: (id: string) => void;
  selectMany: (ids: string[]) => void;
  clearSelection: () => void;

  /* review */
  setStatus: (ids: string[], status: ReviewStatus, note?: string) => void;
  editValue: (id: string, value: number) => void;
  revertEdit: (id: string) => void;
  addNote: (id: string, note: string) => void;

  /* comments */
  resolvedComments: string[];
  resolveComment: (id: string, outcome: "accept" | "reference" | "dismiss") => void;
  reopenComment: (id: string) => void;

  /* wizard */
  setDraft: (patch: Partial<Draft>) => void;
  resetDraft: () => void;
  commitDraft: () => string;

  /* reports */
  updateReport: (id: string, patch: Partial<ReportDoc>) => void;
  moveSection: (reportId: string, sectionId: StatementId, direction: -1 | 1) => void;
}

const stamp = () => new Date().toISOString();

function event(actor: string, action: ReviewEvent["action"], extra: Partial<ReviewEvent> = {}) {
  return {
    id: `${actor}-${action}-${Math.round(performance.now() * 1000)}`,
    actor,
    action,
    at: stamp(),
    ...extra,
  } satisfies ReviewEvent;
}

export const useStore = create<State>((set, get) => ({
  projects: PROJECTS,
  reports: REPORTS,
  activeProjectId: PROJECTS[0].id,
  statement: "income",
  filters: { status: "all", query: "", confidence: "all", unreviewedOnly: false },
  selection: [],
  activeItemId: null,
  sourceDoc: "A",
  draft: EMPTY_DRAFT,

  setActiveProject: (id) =>
    set({ activeProjectId: id, selection: [], activeItemId: null, statement: "income" }),
  setStatement: (statement) => set({ statement, selection: [] }),
  setFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  resetFilters: () =>
    set({ filters: { status: "all", query: "", confidence: "all", unreviewedOnly: false } }),
  setActiveItem: (id, doc) => set((s) => ({ activeItemId: id, sourceDoc: doc ?? s.sourceDoc })),
  setSourceDoc: (sourceDoc) => set({ sourceDoc }),

  toggleSelect: (id) =>
    set((s) => ({
      selection: s.selection.includes(id)
        ? s.selection.filter((x) => x !== id)
        : [...s.selection, id],
    })),
  selectMany: (ids) => set({ selection: ids }),
  clearSelection: () => set({ selection: [] }),

  setStatus: (ids, status, note) =>
    set((s) => ({
      projects: patchItems(s.projects, s.activeProjectId, ids, (item) => ({
        ...item,
        status,
        reviewer: CURRENT_USER,
        reviewedAt: stamp(),
        note: note ?? item.note,
        history: [
          ...item.history,
          event(
            CURRENT_USER,
            status === "approved"
              ? "approved"
              : status === "rejected"
                ? "rejected"
                : status === "edited"
                  ? "edited"
                  : "flagged",
            {
              note,
              from: item.status,
              to: status,
            }
          ),
        ],
      })),
    })),

  editValue: (id, value) =>
    set((s) => ({
      projects: patchItems(s.projects, s.activeProjectId, [id], (item) => ({
        ...item,
        editedValue: value,
        status: "edited",
        reviewer: CURRENT_USER,
        reviewedAt: stamp(),
        history: [
          ...item.history,
          event(CURRENT_USER, "edited", {
            from: String(item.editedValue ?? item.valueB),
            to: String(value),
          }),
        ],
      })),
    })),

  revertEdit: (id) =>
    set((s) => ({
      projects: patchItems(s.projects, s.activeProjectId, [id], (item) => ({
        ...item,
        editedValue: undefined,
        status: item.agentStatus,
        history: [
          ...item.history,
          event(CURRENT_USER, "edited", { from: String(item.editedValue), to: "original value" }),
        ],
      })),
    })),

  addNote: (id, note) =>
    set((s) => ({
      projects: patchItems(s.projects, s.activeProjectId, [id], (item) => ({
        ...item,
        note,
        history: [...item.history, event(CURRENT_USER, "commented", { note })],
      })),
    })),

  resolvedComments: [],

  resolveComment: (id, outcome) => {
    const { projects, activeProjectId } = get();
    const project = projects.find((p) => p.id === activeProjectId);
    const item = project?.items.find((i) => i.id === id);
    if (!item) return;

    if (outcome === "accept") {
      get().setStatus([id], "approved", "Working value accepted from the reconciled PDF.");
    } else if (outcome === "reference") {
      get().editValue(id, item.valueA);
      get().setStatus([id], "approved", "Reference value applied from the reconciled PDF.");
    } else {
      get().addNote(id, "Comment dismissed — difference accepted as presentation only.");
    }

    set((s) => ({
      resolvedComments: s.resolvedComments.includes(id)
        ? s.resolvedComments
        : [...s.resolvedComments, id],
    }));
  },

  reopenComment: (id) =>
    set((s) => ({ resolvedComments: s.resolvedComments.filter((x) => x !== id) })),

  setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  resetDraft: () => set({ draft: EMPTY_DRAFT }),

  commitDraft: () => {
    const { draft, projects } = get();
    const template = projects.find((p) => p.id === "acme-fy2024") ?? projects[0];
    const id = `run-${projects.length + 1}`;
    const project: Project = {
      ...template,
      id,
      name: draft.name || `${draft.entity || "Untitled"} ${draft.period} Reconciliation`,
      entity: draft.entity || "Untitled entity",
      period: draft.period,
      comparisonPeriod: draft.comparisonPeriod,
      docA: draft.docA ?? template.docA,
      docB: draft.docB ?? template.docB,
      statements: draft.statements,
      matching: draft.matching,
      tolerance: draft.tolerance,
      createdBy: CURRENT_USER,
      createdAt: stamp(),
      lastModified: stamp(),
      status: "in_review",
      reviewers: [CURRENT_USER],
      items: template.items
        .filter((i) => draft.statements.includes(i.statement))
        .map((item) => ({
          ...item,
          status: item.agentStatus,
          reviewer: undefined,
          reviewedAt: undefined,
          note: undefined,
          editedValue: undefined,
          history: item.history.slice(0, 1),
        })),
    };

    const report: ReportDoc = {
      id: `rep-${id}`,
      projectId: id,
      title: `${project.name} — Reconciliation Report`,
      summary: `Reconciliation of ${project.statements.length} statement(s) between ${project.docA.label} and ${project.docB.label} for ${project.period}.`,
      updatedAt: stamp(),
      sections: project.statements.map((sid) => ({
        id: sid,
        title: sid === "income" ? "Income Statement" : sid === "balance" ? "Balance Sheet" : "Cash Flow Statement",
        included: true,
        columns: ["Account", "Document A", "Document B", "Difference", "Status", "Confidence", "Reviewer"],
        hiddenAccounts: [],
      })),
    };

    set((s) => ({
      projects: [project, ...s.projects],
      reports: [report, ...s.reports],
      activeProjectId: id,
      statement: draft.statements[0] ?? "income",
      selection: [],
      activeItemId: null,
    }));

    return id;
  },

  updateReport: (id, patch) =>
    set((s) => ({
      reports: s.reports.map((r) => (r.id === id ? { ...r, ...patch, updatedAt: stamp() } : r)),
    })),

  moveSection: (reportId, sectionId, direction) =>
    set((s) => ({
      reports: s.reports.map((report) => {
        if (report.id !== reportId) return report;
        const sections = [...report.sections];
        const index = sections.findIndex((sec) => sec.id === sectionId);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= sections.length) return report;
        [sections[index], sections[target]] = [sections[target], sections[index]];
        return { ...report, sections, updatedAt: stamp() };
      }),
    })),
}));

function patchItems(
  projects: Project[],
  projectId: string,
  ids: string[],
  patch: (item: LineItem) => LineItem
): Project[] {
  const idSet = new Set(ids);
  return projects.map((project) =>
    project.id === projectId
      ? {
          ...project,
          lastModified: stamp(),
          items: project.items.map((item) => (idSet.has(item.id) ? patch(item) : item)),
        }
      : project
  );
}

/* --------------------------------- selectors -------------------------------- */

export function useActiveProject() {
  return useStore((s) => s.projects.find((p) => p.id === s.activeProjectId) ?? s.projects[0]);
}

export function useActiveItem() {
  const project = useActiveProject();
  const activeItemId = useStore((s) => s.activeItemId);
  return project.items.find((i) => i.id === activeItemId) ?? null;
}
