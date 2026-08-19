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
  Maximize2,
  Minus,
  PenLine,
  Plus,
  Sparkles,
} from "lucide-react";

import { CommentCard } from "@/components/viewer/CommentCard";
import { DocumentPage, type Mark } from "@/components/viewer/DocumentPage";
import { PageFrame, usePageZoom } from "@/components/workbook/PageCanvas";
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
import { cn } from "@/lib/utils";
import type { Project, StatementId } from "@/lib/types";

const PAGE_ORDER: StatementId[] = ["balance", "income", "cashflow"];

/** Smooth where the browser will animate, instant where it will not. */
function scrollTo(el: HTMLElement, top: number) {
  const start = el.scrollTop;
  el.scrollTo({ top, behavior: "smooth" });
  window.setTimeout(() => {
    if (Math.abs(el.scrollTop - start) < 2 && Math.abs(top - start) > 2) el.scrollTop = top;
  }, 350);
}

/**
 * The run's output: the annotated document on the left, and its comments in the
 * margin on the right. Scrolling the document moves the margin with it — the
 * comment for whatever you are looking at is the one that is open.
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
  const disposeComment = useStore((s) => s.disposeComment);
  const reopenComment = useStore((s) => s.reopenComment);

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
  const zoom = usePageZoom();

  const railRef = React.useRef<HTMLDivElement | null>(null);
  const cardRefs = React.useRef<Record<string, HTMLLIElement | null>>({});
  const scrollingFromRail = React.useRef(false);

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
  const closed = allIssues.length - openIssues.length;
  const verified = project.items.length - allIssues.filter((i) => i.itemId).length;
  const reconciliationDoc = documents[0];

  /* ------------------------- document scroll → margin ------------------------ */
  React.useEffect(() => {
    const frame = zoom.frameRef.current;
    if (!frame) return;
    let raf = 0;

    const measure = () => {
      if (scrollingFromRail.current) return;
      const anchors = Array.from(frame.querySelectorAll<HTMLElement>("[data-issue-anchor]"));
      if (!anchors.length) return setActiveIssueId(null);

      /* the comment for the line nearest the top third of the frame */
      const target = frame.getBoundingClientRect().top + frame.clientHeight * 0.3;
      let best: string | null = null;
      let bestDistance = Infinity;
      anchors.forEach((el) => {
        const distance = Math.abs(el.getBoundingClientRect().top - target);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = el.dataset.issueAnchor ?? null;
        }
      });
      setActiveIssueId(best);
    };

    /* throttled on a timer rather than a frame: this has to keep working when
       the tab is not compositing, and the measurement is a handful of rects */
    let last = 0;
    const sync = () => {
      const now = Date.now();
      window.clearTimeout(raf);
      if (now - last > 60) {
        last = now;
        measure();
      } else {
        raf = window.setTimeout(() => {
          last = Date.now();
          measure();
        }, 60);
      }
    };

    measure();
    frame.addEventListener("scroll", sync, { passive: true });
    return () => {
      frame.removeEventListener("scroll", sync);
      window.clearTimeout(raf);
    };
  }, [zoom.frameRef, statement, zoom.scale]);

  /* the margin follows */
  React.useEffect(() => {
    if (!activeIssueId || scrollingFromRail.current) return;
    const card = cardRefs.current[activeIssueId];
    const rail = railRef.current;
    if (!card || !rail) return;
    const cardTop = card.offsetTop;
    const target = cardTop - 12;
    if (Math.abs(rail.scrollTop - target) > 8) scrollTo(rail, target);
  }, [activeIssueId]);

  /* margin → document */
  const goToIssue = (issue: Issue) => {
    const index = pages.indexOf(issue.statement);
    if (index >= 0 && index !== pageIndex) setPageIndex(index);
    setActiveIssueId(issue.id);
    setFocusIssueId(issue.id);
    scrollingFromRail.current = true;
    window.setTimeout(() => {
      const frame = zoom.frameRef.current;
      const anchor = frame?.querySelector<HTMLElement>(`[data-issue-anchor="${issue.id}"]`);
      if (frame && anchor) {
        const offset =
          anchor.getBoundingClientRect().top -
          frame.getBoundingClientRect().top +
          frame.scrollTop -
          frame.clientHeight * 0.3;
        scrollTo(frame, Math.max(0, offset));
      }
      window.setTimeout(() => {
        scrollingFromRail.current = false;
      }, 500);
    }, 60);
  };

  const fileName = `${project.docA.fileName.replace(/\.[^.]+$/, "")}_reconciled.pdf`;

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto scrollbar-thin p-4 xl:flex-row xl:overflow-hidden">
      {/* ------------------------------ the document ----------------------------- */}
      <section className="flex min-h-[560px] min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-surface xl:min-h-0">
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

        <PageFrame
          frameRef={zoom.frameRef}
          pageRef={zoom.pageRef}
          scale={zoom.scale}
          naturalHeight={zoom.naturalHeight}
          pageWidth={zoom.pageWidth}
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

        <footer className="flex shrink-0 items-center gap-2 border-t border-border-subtle px-3 py-2">
          <Button
            variant="outline"
            size="iconSm"
            aria-label="Download"
            onClick={() => toast("Reconciled PDF downloaded")}
          >
            <Download />
          </Button>

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

          <Tooltip content="Fit to width">
            <span>
              <Button
                variant={zoom.isFitted ? "secondary" : "outline"}
                size="iconSm"
                aria-label="Fit to width"
                onClick={zoom.fitToWidth}
              >
                <Maximize2 />
              </Button>
            </span>
          </Tooltip>
          <span className="tabular rounded-lg border border-border px-2.5 py-1 font-mono text-body-sm">
            {pageIndex + 1} <span className="text-muted-foreground">/ {pages.length}</span>
          </span>
        </footer>
      </section>

      {/* --------------------------------- the margin ---------------------------- */}
      <aside className="flex min-h-0 shrink-0 flex-col gap-3 xl:w-[400px]">
        <div className="shrink-0 rounded-xl border border-border bg-surface p-4">
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
            against {documents.length - 1} supporting files.
          </p>

          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {documents.slice(1).map((doc) => {
              const differs = allIssues.filter((issue) => implicates(issue, doc.id)).length;
              return (
                <span
                  key={doc.id}
                  title={doc.fileName}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-meta",
                    differs > 0
                      ? "border-[#F59E0B]/40 bg-[rgba(245,158,11,0.10)] text-[#B45309]"
                      : "border-border-subtle bg-surface-secondary text-muted-foreground"
                  )}
                >
                  {doc.kind === "pdf" ? (
                    <FileText className="h-2.5 w-2.5" />
                  ) : (
                    <FileSpreadsheet className="h-2.5 w-2.5" />
                  )}
                  {doc.label}
                  {differs > 0 && <span className="tabular font-mono">{differs}</span>}
                </span>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <Progress
              className="flex-1"
              size="sm"
              value={allIssues.length ? (closed / allIssues.length) * 100 : 100}
              tone={closed === allIssues.length ? "success" : "warning"}
            />
            <span className="tabular shrink-0 font-mono text-meta text-muted-foreground">
              {closed}/{allIssues.length} closed
            </span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 px-0.5">
          <span className="text-body font-medium">Comments on this page</span>
          <Tag variant={openOnPage ? "critical" : "success"} className="ml-auto">
            {openOnPage} open
          </Tag>
        </div>

        <div
          ref={railRef}
          className="relative min-h-0 flex-1 overflow-y-auto scrollbar-thin rounded-xl border border-border bg-surface-secondary/30 p-2.5"
        >
          {pageIssues.length === 0 ? (
            <p className="px-4 py-10 text-center text-body-sm text-muted-foreground">
              Nothing flagged on this page — every figure agreed across all sources.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {pageIssues.map((issue) => (
                <div
                  key={issue.id}
                  ref={(el) => {
                    cardRefs.current[issue.id] = el as unknown as HTMLLIElement | null;
                  }}
                  className={cn(
                    "rounded-lg transition-all duration-standard",
                    activeIssueId === issue.id && "ring-2 ring-brand/40"
                  )}
                >
                  <CommentCard
                    issue={issue}
                    item={project.items.find((i) => i.id === issue.itemId)}
                    project={project}
                    number={issueNumber.get(issue.id) ?? 0}
                    disposition={dispositions[issue.id]}
                    focused={activeIssueId === issue.id}
                    hovered={false}
                    onFocus={() => goToIssue(issue)}
                    onHover={() => undefined}
                    onDispose={(disposition) => {
                      disposeComment(issue.id, issue.itemId ?? null, disposition);
                      toast(
                        disposition === "resolved"
                          ? `Resolved · ${issue.title}`
                          : disposition === "flagged"
                            ? `Flagged to the preparer · ${issue.title}`
                            : `Dismissed · ${issue.title}`,
                        disposition === "flagged" ? "info" : "success"
                      );
                    }}
                    onReopen={() => reopenComment(issue.id)}
                  />
                </div>
              ))}
            </ul>
          )}
        </div>

        <Button variant="brand" className="shrink-0" onClick={() => onOpenReview(null)}>
          Review reconciliation
          <ArrowRight />
        </Button>
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
