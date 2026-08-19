"use client";

import * as React from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Minus,
  PanelLeft,
  PenLine,
  Plus,
  Sparkles,
} from "lucide-react";

import { DocumentPage, type Mark } from "@/components/viewer/DocumentPage";
import { Button, Progress, Tag, Tooltip, useToast } from "@/components/element";
import {
  buildIssues,
  documentsOf,
  implicates,
  notesForStatement,
  workingValues as buildWorkingValues,
  type Issue,
  type SourceReading,
} from "@/lib/issues";
import { NOW, statementLabel } from "@/lib/mock";
import { relativeTime } from "@/lib/derive";
import { useStore } from "@/lib/store";
import type { Project, StatementId } from "@/lib/types";

const PAGE_ORDER: StatementId[] = ["balance", "income", "cashflow"];

/**
 * What the run produced, read the way an analyst reads it: the annotated
 * document on the left, and on the right the agent saying what it checked, what
 * it is confident about, and what it wants a human to look at.
 */
export function ReconciliationReport({
  project,
  onOpenReview,
}: {
  project: Project;
  onOpenReview: (itemId: string | null) => void;
}) {
  const toast = useToast();
  const dispositions = useStore((s) => s.commentDisposition);

  const allIssues = React.useMemo(() => buildIssues(project), [project]);
  const documents = React.useMemo(() => documentsOf(project), [project]);
  const workingValueMap = React.useMemo(() => buildWorkingValues(allIssues), [allIssues]);
  const readingsByItem = React.useMemo(() => {
    const map = new Map<string, SourceReading[]>();
    allIssues.forEach((i) => {
      if (i.itemId && i.readings.length) map.set(i.itemId, i.readings);
    });
    return map;
  }, [allIssues]);

  const pages = React.useMemo(
    () => PAGE_ORDER.filter((s) => project.statements.includes(s)),
    [project.statements]
  );

  const [pageIndex, setPageIndex] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);
  const [focusIssueId, setFocusIssueId] = React.useState<string | null>(null);

  const statement = pages[pageIndex] ?? pages[0];
  const items = React.useMemo(
    () => project.items.filter((i) => i.statement === statement),
    [project.items, statement]
  );
  const notes = React.useMemo(() => notesForStatement(statement), [statement]);
  const pageIssues = React.useMemo(
    () => allIssues.filter((i) => i.statement === statement),
    [allIssues, statement]
  );
  const issueNumber = React.useMemo(
    () => new Map(pageIssues.map((issue, i) => [issue.id, i + 1])),
    [pageIssues]
  );
  const issueByItem = React.useMemo(() => {
    const map = new Map<string, Issue>();
    pageIssues.forEach((i) => {
      if (i.itemId) map.set(i.itemId, i);
    });
    return map;
  }, [pageIssues]);

  /* the agent's own marks: a tick where every source agreed, a cross where a
     reviewer sent it back, and a numbered comment everywhere else */
  const marks = React.useMemo(() => {
    const seeded: Record<string, Mark> = {};
    project.items.forEach((item) => {
      const issue = allIssues.find((i) => i.itemId === item.id);
      if (!issue) seeded[item.id] = "tick";
      else if (dispositions[issue.id] === "resolved") seeded[item.id] = "tick";
      else if (dispositions[issue.id] === "flagged") seeded[item.id] = "cross";
    });
    return seeded;
  }, [project.items, allIssues, dispositions]);

  const openIssues = allIssues.filter((i) => dispositions[i.id] === undefined);
  const closed = allIssues.length - openIssues.length;
  const flaggedLines = allIssues.filter((i) => i.itemId).length;
  const verified = project.items.length - flaggedLines;
  const reconciliationDoc = documents[0];

  const attention = React.useMemo(
    () =>
      [...openIssues]
        .sort((a, b) => {
          const da = Math.abs(a.readings.find((r) => !r.agrees)?.delta ?? 0);
          const db = Math.abs(b.readings.find((r) => !r.agrees)?.delta ?? 0);
          return db - da;
        })
        .slice(0, 4),
    [openIssues]
  );

  const goToIssue = (issue: Issue) => {
    const index = pages.indexOf(issue.statement);
    if (index >= 0) setPageIndex(index);
    setFocusIssueId(issue.id);
  };

  const fileName = `${project.docA.fileName.replace(/\.[^.]+$/, "")}_reconciled.pdf`;

  return (
    <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-auto scrollbar-thin p-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(380px,0.9fr)] xl:overflow-hidden">
      {/* ------------------------------ the document ----------------------------- */}
      <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-surface">
        <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border-subtle px-3 py-2.5">
          <FileText className="h-4 w-4 shrink-0 text-brand" />
          <span className="min-w-0 truncate text-body-sm font-semibold uppercase tracking-wide">
            {fileName}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => onOpenReview(null)}>
              <PenLine />
              Edit marks
            </Button>
            <Button variant="brandSoft" size="sm" onClick={() => toast("Reconciled PDF downloaded")}>
              <Download />
              Download PDF
            </Button>
          </div>
        </header>

        <div className="flex shrink-0 items-center justify-center gap-2 border-b border-border-subtle py-1.5">
          <Button
            variant="ghost"
            size="iconSm"
            aria-label="Previous page"
            disabled={pageIndex === 0}
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft />
          </Button>
          <span className="text-body-sm text-muted-foreground">
            Page <span className="tabular font-mono text-foreground">{pageIndex + 1}</span> /{" "}
            <span className="tabular font-mono">{pages.length}</span>
            <span className="pl-2 text-helper">{statementLabel(statement)}</span>
          </span>
          <Button
            variant="ghost"
            size="iconSm"
            aria-label="Next page"
            disabled={pageIndex === pages.length - 1}
            onClick={() => setPageIndex((p) => Math.min(pages.length - 1, p + 1))}
          >
            <ChevronRight />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-auto scrollbar-thin bg-[#F7F9FC] bg-[radial-gradient(#D9E1EC_1px,transparent_1px)] p-5 [background-size:16px_16px]">
          <div style={{ zoom }}>
            <DocumentPage
              project={project}
              statement={statement}
              items={items}
              notes={notes}
              variant="working"
              periods={[project.period, project.comparisonPeriod ?? "FY2023"]}
              marks={marks}
              issueByItem={issueByItem}
              textIssues={pageIssues.filter((i) => i.kind === "text")}
              issueNumber={issueNumber}
              dispositions={dispositions}
              workingValues={workingValueMap}
              lensDocId={null}
              gutter={false}
              documents={documents}
              readingsByItem={readingsByItem}
              focusIssueId={focusIssueId}
              focusItemId={null}
              hoveredItemId={null}
              onHover={() => undefined}
              onLineClick={() => undefined}
              onIssueClick={(id) =>
                onOpenReview(allIssues.find((i) => i.id === id)?.itemId ?? null)
              }
            />
          </div>
        </div>

        <footer className="flex shrink-0 items-center gap-2 border-t border-border-subtle px-3 py-2">
          <Tooltip content="Open the page-by-page review">
            <span>
              <Button
                variant="outline"
                size="iconSm"
                aria-label="Page-by-page review"
                onClick={() => onOpenReview(null)}
              >
                <PanelLeft />
              </Button>
            </span>
          </Tooltip>
          <Button
            variant="outline"
            size="iconSm"
            aria-label="Download"
            onClick={() => toast("Reconciled PDF downloaded")}
          >
            <Download />
          </Button>

          <div className="mx-auto flex items-center gap-1 rounded-lg border border-border px-1 py-0.5">
            <Button
              variant="ghost"
              size="iconSm"
              aria-label="Zoom out"
              onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.1).toFixed(2))))}
            >
              <Minus />
            </Button>
            <span className="tabular w-12 text-center font-mono text-body-sm">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="iconSm"
              aria-label="Zoom in"
              onClick={() => setZoom((z) => Math.min(1.6, Number((z + 0.1).toFixed(2))))}
            >
              <Plus />
            </Button>
          </div>

          <span className="tabular rounded-lg border border-border px-2.5 py-1 font-mono text-body-sm">
            {pageIndex + 1} <span className="text-muted-foreground">/ {pages.length}</span>
          </span>
        </footer>
      </section>

      {/* -------------------------------- the summary ---------------------------- */}
      <aside className="flex min-h-0 flex-col gap-3 overflow-auto scrollbar-thin xl:pr-1">
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success text-white">
              <Check className="h-3.5 w-3.5" strokeWidth={3} />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-body-lg font-medium tracking-tight">Verification complete</span>
              <span className="text-helper text-muted-foreground">
                {project.entity} · {project.period} · finished{" "}
                {relativeTime(project.lastModified, NOW)} in 41s
              </span>
            </div>
            <Tag variant="brand" className="shrink-0">
              <Sparkles className="h-2.5 w-2.5" />
              Agent
            </Tag>
          </div>

          <div className="mt-3.5 grid grid-cols-3 divide-x divide-border-subtle rounded-lg border border-border-subtle">
            <Stat label="Checked" value={project.items.length} />
            <Stat label="Agree" value={verified} tone="#179864" />
            <Stat label="Flagged" value={allIssues.length} tone="#DC2626" />
          </div>

          <p className="mt-3 text-body-sm text-muted-foreground">
            Every figure in{" "}
            <span className="font-medium text-foreground">{reconciliationDoc.label}</span> was checked
            against the {documents.length - 1} supporting files. {verified} agree on every source;{" "}
            {allIssues.length} need a look.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="mb-2.5 text-meta font-semibold uppercase tracking-wider text-muted-foreground">
            What the agent did
          </p>
          <ul className="flex flex-col gap-2">
            {[
              `Read ${documents.length} documents and identified ${project.statements.length} statements`,
              `Extracted 9 tables and mapped ${project.items.length} accounts`,
              `Matched ${project.period} against ${project.comparisonPeriod ?? "the comparative"} and normalised units`,
              `Compared every value against ${reconciliationDoc.label}`,
              `Annotated ${project.items.length} lines and wrote ${allIssues.length} comments`,
            ].map((line) => (
              <li key={line} className="flex items-start gap-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" strokeWidth={3} />
                <span className="text-body-sm text-foreground">{line}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
            <span className="text-body font-medium">Needs your attention</span>
            <Tag variant={openIssues.length ? "critical" : "success"} className="ml-auto">
              {openIssues.length} open
            </Tag>
          </div>

          {attention.length === 0 ? (
            <p className="px-4 py-6 text-center text-body-sm text-muted-foreground">
              Every comment has a decision behind it.
            </p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {attention.map((issue) => {
                const outlier = issue.readings.find((r) => !r.agrees);
                return (
                  <li key={issue.id}>
                    <button
                      type="button"
                      onClick={() => goToIssue(issue)}
                      className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left transition-colors duration-fast hover:bg-surface-secondary"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-critical text-[11px] font-semibold text-white">
                        {issueNumber.get(issue.id) ?? "!"}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-body-sm font-medium">{issue.title}</span>
                        <span className="truncate text-helper text-muted-foreground">
                          {outlier ? `${outlier.label} differs` : "Wording differs"} ·{" "}
                          {statementLabel(issue.statement).replace(" Statement", "")}
                        </span>
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="border-t border-border-subtle p-3">
            <Button variant="brand" className="w-full" onClick={() => onOpenReview(null)}>
              Review reconciliation
              <ArrowRight />
            </Button>
            <p className="mt-2 text-center text-meta text-muted-foreground">
              Page by page, side by side with every source
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="border-b border-border-subtle px-4 py-3">
            <span className="text-body font-medium">Documents checked</span>
          </div>
          <ul className="divide-y divide-border-subtle">
            {documents.map((doc, i) => {
              const differs = allIssues.filter((issue) => implicates(issue, doc.id)).length;
              return (
                <li key={doc.id} className="flex items-center gap-2.5 px-4 py-2.5">
                  {doc.kind === "pdf" ? (
                    <FileText className="h-3.5 w-3.5 shrink-0 text-[#DC2626]" />
                  ) : (
                    <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-[#179864]" />
                  )}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body-sm">{doc.fileName}</span>
                    {i === 0 && (
                      <span className="text-meta text-muted-foreground">
                        Reconciliation file — everything is checked against this
                      </span>
                    )}
                  </span>
                  {i === 0 ? (
                    <Tag variant="brand" className="shrink-0">
                      Master
                    </Tag>
                  ) : differs > 0 ? (
                    <Tag variant="warning" className="shrink-0">
                      {differs} differ
                    </Tag>
                  ) : (
                    <Tag variant="success" className="shrink-0">
                      <Check className="h-2.5 w-2.5" />
                      Agrees
                    </Tag>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-helper text-muted-foreground">Comments closed</span>
            <span className="tabular font-mono text-body-sm">
              {closed}/{allIssues.length}
            </span>
          </div>
          <Progress
            value={allIssues.length ? (closed / allIssues.length) * 100 : 100}
            tone={closed === allIssues.length ? "success" : "warning"}
          />
        </div>
      </aside>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-3 py-2">
      <span className="text-meta uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="tabular font-mono text-h3" style={tone ? { color: tone } : undefined}>
        {value}
      </span>
    </div>
  );
}
