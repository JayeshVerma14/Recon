"use client";

import * as React from "react";
import { ArrowRight, Check, FileText, Lock, MessageSquare, Sparkles } from "lucide-react";

import { DocumentPage, type Mark } from "@/components/viewer/DocumentPage";
import { PdfCanvas, PdfThumbnails, PdfToolbar, usePdfView } from "@/components/viewer/PdfView";
import { MarginNotes } from "@/components/workbook/MarginNotes";
import { Button, Tag, useToast } from "@/components/element";
import {
  buildIssues,
  documentsOf,
  notesForStatement,
  workingValues as buildWorkingValues,
  type Issue,
  type SourceReading,
} from "@/lib/issues";
import { NOW, statementLabel } from "@/lib/mock";
import { relativeTime } from "@/lib/derive";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Project, StatementId } from "@/lib/types";

const PAGE_ORDER: StatementId[] = ["balance", "income", "cashflow"];
const NOTE_WIDTH = 296;
const NOTE_GAP = 20;

/**
 * The run's output as one document: every reconciled page in a continuous
 * scroll, the agent's comments written in the margin beside the lines they
 * belong to, and the viewer controls a reader already knows. Reading only —
 * every decision is made in the review.
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

  const view = usePdfView({ pageCount: pages.length, gutter: NOTE_WIDTH + NOTE_GAP });
  const [activeIssueId, setActiveIssueId] = React.useState<string | null>(null);
  const [focusIssueId, setFocusIssueId] = React.useState<string | null>(null);

  /* comments run in document order across the whole file, the way footnotes do */
  const orderedIssues = React.useMemo(
    () =>
      pages.flatMap((statement) => allIssues.filter((issue) => issue.statement === statement)),
    [pages, allIssues]
  );
  const issueNumber = React.useMemo(
    () => new Map(orderedIssues.map((issue, i) => [issue.id, i + 1])),
    [orderedIssues]
  );
  const issueByItem = React.useMemo(() => {
    const map = new Map<string, Issue>();
    allIssues.forEach((i) => {
      if (i.itemId) map.set(i.itemId, i);
    });
    return map;
  }, [allIssues]);

  /* a tick where every source agreed, a cross where a reviewer sent it back,
     and a query where there was nothing to agree or disagree with */
  const marks = React.useMemo(() => {
    const seeded: Record<string, Mark> = {};
    project.items.forEach((item) => {
      const issue = allIssues.find((i) => i.itemId === item.id);
      if (!issue) seeded[item.id] = "tick";
      else if (issue.kind === "gap" && dispositions[issue.id] !== "resolved")
        seeded[item.id] = "unverified";
      else if (dispositions[issue.id] === "resolved") seeded[item.id] = "tick";
      else if (dispositions[issue.id] === "flagged") seeded[item.id] = "cross";
    });
    return seeded;
  }, [project.items, allIssues, dispositions]);

  const openIssues = allIssues.filter((i) => dispositions[i.id] === undefined);
  const gaps = allIssues.filter((i) => i.kind === "gap");
  const verified = project.items.length - allIssues.filter((i) => i.itemId).length;

  /* the first comment in the file is open on arrival, the rest are titles */
  React.useEffect(() => {
    setActiveIssueId((current) => current ?? orderedIssues[0]?.id ?? null);
  }, [orderedIssues]);

  const { setFull } = view;
  React.useEffect(() => {
    if (!view.full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [view.full, setFull]);

  /** Clicking a mark on a page opens its note and brings the line into view. */
  const goToIssue = (issue: Issue) => {
    setActiveIssueId(issue.id);
    setFocusIssueId(issue.id);
  };

  const fileName = `${project.docA.fileName.replace(/\.[^.]+$/, "")}_reconciled.pdf`;

  /* one node per page, shared by the canvas and the thumbnail rail */
  const pageNodes = pages.map((statement) => (
    <DocumentPage
      key={statement}
      project={project}
      statement={statement}
      items={project.items.filter((i) => i.statement === statement)}
      notes={notesForStatement(statement)}
      variant="working"
      periods={[project.period, project.comparisonPeriod ?? "FY2023"]}
      marks={marks}
      issueByItem={issueByItem}
      textIssues={allIssues.filter((i) => i.statement === statement && i.kind === "text")}
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
      onIssueClick={(id) => {
        const issue = allIssues.find((i) => i.id === id);
        if (issue) goToIssue(issue);
      }}
    />
  ));

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border",
        view.full && "fixed inset-0 z-50 border-t-0 bg-surface"
      )}
    >
      {/* ----------------------------- the one header ---------------------------- */}
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success text-white">
          <Check className="h-4 w-4" strokeWidth={3} />
        </span>

        <div className="flex min-w-[16rem] flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate text-body font-medium tracking-tight">
              {fileName}
            </span>
            <Tag variant="brand" className="shrink-0">
              <Sparkles className="h-2.5 w-2.5" />
              Agent
            </Tag>
            <Tag variant="neutral" className="shrink-0">
              <Lock className="h-2.5 w-2.5" />
              Read-only
            </Tag>
          </div>
          <span className="text-helper text-muted-foreground">
            Verification complete · {project.entity} · {project.period} · finished{" "}
            {relativeTime(project.lastModified, NOW)} in 41s
          </span>
        </div>

        <div className="flex shrink-0 divide-x divide-border-subtle rounded-lg border border-border-subtle">
          <Stat label="Checked" value={project.items.length} />
          <Stat label="Agree" value={verified} tone="#179864" />
          <Stat label="Flagged" value={allIssues.length - gaps.length} tone="#DC2626" />
          {/* stated next to the others, because a run that hides its gaps
              reports itself as more complete than it is */}
          {gaps.length > 0 && <Stat label="Unverified" value={gaps.length} tone="#0B5A70" />}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            <span className="tabular font-mono text-foreground">{allIssues.length}</span>
            in the margin
            {openIssues.length > 0 && (
              <span className="tabular font-mono text-critical">· {openIssues.length} open</span>
            )}
          </span>
          <Button
            variant="brand"
            size="sm"
            onClick={() => onOpenReview(openIssues[0]?.itemId ?? null)}
          >
            Review reconciliation
            <ArrowRight />
          </Button>
        </div>
      </header>

      {/* -------------------------------- the viewer ----------------------------- */}
      <PdfToolbar
        view={view}
        fileName={fileName}
        onDownload={() => toast("Reconciled PDF downloaded")}
        onPrint={() => toast("Sent to the print dialog", "info")}
      />

      <div className="flex min-h-0 flex-1">
        {view.thumbnails && (
          <PdfThumbnails
            view={view}
            pages={pageNodes}
            labels={pages.map((s) => statementLabel(s))}
          />
        )}

        <PdfCanvas
          view={view}
          pages={pageNodes}
          marginWidth={NOTE_WIDTH}
          marginGap={NOTE_GAP}
          margin={
            orderedIssues.length > 0 ? (
              <MarginNotes
                issues={orderedIssues}
                project={project}
                dispositions={dispositions}
                issueNumber={issueNumber}
                pageRef={view.pagesRef}
                scale={view.scale}
                revision={`${view.spread}-${view.rotation}-${view.thumbnails}`}
                activeId={activeIssueId}
                onSelect={setActiveIssueId}
              />
            ) : undefined
          }
        />
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-baseline gap-1.5 px-2.5 py-1.5">
      <span className="text-meta uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="tabular font-mono text-body-lg" style={tone ? { color: tone } : undefined}>
        {value}
      </span>
    </div>
  );
}
