"use client";

import * as React from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Lock,
  Maximize2,
  MessageSquare,
  Minimize2,
  Minus,
  Plus,
  Sparkles,
} from "lucide-react";

import { DocumentPage, type Mark } from "@/components/viewer/DocumentPage";
import { MarginNotes } from "@/components/workbook/MarginNotes";
import { PageFrame, usePageZoom } from "@/components/workbook/PageCanvas";
import { Button, Tag, Tooltip, useToast } from "@/components/element";
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

/** Smooth where the browser will animate, instant where it will not. */
function scrollTo(el: HTMLElement, top: number) {
  const start = el.scrollTop;
  el.scrollTo({ top, behavior: "smooth" });
  window.setTimeout(() => {
    if (Math.abs(el.scrollTop - start) < 2 && Math.abs(top - start) > 2) el.scrollTop = top;
  }, 350);
}

/**
 * The run's output as one document: the reconciled page with the agent's
 * comments written in its margin, beside the lines they belong to. Reading
 * only — every decision is made in the review.
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
  const [activeIssueId, setActiveIssueId] = React.useState<string | null>(null);
  const [focusIssueId, setFocusIssueId] = React.useState<string | null>(null);
  const [full, setFull] = React.useState(false);
  const zoom = usePageZoom({ gutter: NOTE_WIDTH + NOTE_GAP });

  /* the frame changes width the moment the overlay opens, so re-fit there and
     then rather than waiting on a resize notification */
  React.useLayoutEffect(() => {
    zoom.refit();
  }, [full, zoom.refit]); // eslint-disable-line react-hooks/exhaustive-deps

  /* full screen is the reading posture: the document, its margin, and nothing
     else. Escape is the only way out that a reader will guess. */
  React.useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFull(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [full]);

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

  /* a tick where every source agreed, a cross where a reviewer sent it back */
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
  const openOnPage = pageIssues.filter((i) => dispositions[i.id] === undefined).length;
  const verified = project.items.length - allIssues.filter((i) => i.itemId).length;

  /* land on the first comment of whatever page you turn to, the way you would
     read down a marked-up document */
  React.useEffect(() => {
    setActiveIssueId(pageIssues[0]?.id ?? null);
    setFocusIssueId(null);
  }, [statement]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Clicking a mark on the page opens its note and brings the line into view. */
  const goToIssue = (issue: Issue) => {
    const index = pages.indexOf(issue.statement);
    if (index >= 0 && index !== pageIndex) setPageIndex(index);
    setActiveIssueId(issue.id);
    setFocusIssueId(issue.id);
    window.setTimeout(() => {
      const frame = zoom.frameRef.current;
      const anchor = frame?.querySelector<HTMLElement>(`[data-issue-anchor="${issue.id}"]`);
      if (!frame || !anchor) return;
      const offset =
        anchor.getBoundingClientRect().top -
        frame.getBoundingClientRect().top +
        frame.scrollTop -
        frame.clientHeight * 0.3;
      scrollTo(frame, Math.max(0, offset));
    }, 60);
  };

  const fileName = `${project.docA.fileName.replace(/\.[^.]+$/, "")}_reconciled.pdf`;

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border",
        full && "fixed inset-0 z-50 border-t-0 bg-surface"
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
          <Stat label="Flagged" value={allIssues.length} tone="#DC2626" />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => toast("Reconciled PDF downloaded")}>
            <Download />
            Download PDF
          </Button>
          <Button variant="brand" size="sm" onClick={() => onOpenReview(openIssues[0]?.itemId ?? null)}>
            Review reconciliation
            <ArrowRight />
          </Button>
          {full && (
            <Tooltip content="Exit full screen · Esc">
              <span>
                <Button
                  variant="ghost"
                  size="iconSm"
                  aria-label="Exit full screen"
                  onClick={() => setFull(false)}
                >
                  <Minimize2 />
                </Button>
              </span>
            </Tooltip>
          )}
        </div>
      </header>

      {/* -------------------------------- the pager ------------------------------ */}
      <div className="flex shrink-0 items-center gap-2 border-y border-border-subtle px-4 py-1.5">
        <span className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
          <MessageSquare className="h-3.5 w-3.5" />
          <span className="tabular font-mono text-foreground">{pageIssues.length}</span>
          {pageIssues.length === 1 ? "comment" : "comments"} in the margin
          {openOnPage > 0 && (
            <span className="tabular font-mono text-critical">· {openOnPage} open</span>
          )}
        </span>

        <div className="mx-auto flex items-center gap-2">
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

        <span className="hidden text-helper text-muted-foreground lg:block">
          Comments are the agent&rsquo;s. Decisions are made in the review.
        </span>
      </div>

      {/* ------------------------- the page and its margin ----------------------- */}
      <PageFrame
        frameRef={zoom.frameRef}
        pageRef={zoom.pageRef}
        scale={zoom.scale}
        naturalHeight={zoom.naturalHeight}
        pageWidth={zoom.pageWidth}
        frameWidth={zoom.frameWidth}
        gutterWidth={NOTE_WIDTH}
        gutterGap={NOTE_GAP}
        gutter={
          pageIssues.length > 0 ? (
            <MarginNotes
              issues={pageIssues}
              project={project}
              dispositions={dispositions}
              issueNumber={issueNumber}
              pageRef={zoom.pageRef}
              scale={zoom.scale}
              statement={statement}
              activeId={activeIssueId}
              onSelect={setActiveIssueId}
            />
          ) : (
            <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-helper text-muted-foreground">
              Nothing flagged on this page — every figure agreed across all sources.
            </p>
          )
        }
      >
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
          onIssueClick={(id) => {
            const issue = allIssues.find((i) => i.id === id);
            if (issue) goToIssue(issue);
          }}
        />
      </PageFrame>

      {/* -------------------------------- the ruler ------------------------------ */}
      <footer className="flex shrink-0 items-center gap-2 border-t border-border-subtle px-3 py-2">
        <span className="tabular font-mono text-body-sm text-muted-foreground">
          {pageIndex + 1} / {pages.length}
        </span>

        <div className="mx-auto flex items-center gap-1 rounded-lg border border-border px-1 py-0.5">
          <Button variant="ghost" size="iconSm" aria-label="Zoom out" onClick={() => zoom.zoomBy(-0.1)}>
            <Minus />
          </Button>
          <Tooltip content="Fit the page to the frame">
            <button
              type="button"
              onClick={zoom.fitToWidth}
              className="tabular w-14 rounded px-1 text-center font-mono text-body-sm transition-colors duration-fast hover:bg-surface-secondary"
            >
              {Math.round(zoom.scale * 100)}%
            </button>
          </Tooltip>
          <Button variant="ghost" size="iconSm" aria-label="Zoom in" onClick={() => zoom.zoomBy(0.1)}>
            <Plus />
          </Button>
        </div>

        <Tooltip content={full ? "Exit full screen · Esc" : "Full screen — the document and its comments, nothing else"}>
          <span>
            <Button
              variant={full ? "secondary" : "outline"}
              size="iconSm"
              aria-label={full ? "Exit full screen" : "Full screen"}
              onClick={() => setFull((v) => !v)}
            >
              {full ? <Minimize2 /> : <Maximize2 />}
            </Button>
          </span>
        </Tooltip>
      </footer>
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
