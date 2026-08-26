"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  CircleDashed,
  Columns3,
  Download,
  FileSpreadsheet,
  Flag,
  FileText,
  GitCompareArrows,
  Link2,
  Link2Off,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  X,
} from "lucide-react";

import { CommentCard } from "@/components/viewer/CommentCard";
import { DocumentPage, QueryMark, type Mark } from "@/components/viewer/DocumentPage";
import { ExcelPane } from "@/components/viewer/ExcelPane";
import { PAGE_WIDTH, PdfBarButton, PdfToolbar, usePdfView } from "@/components/viewer/PdfView";
import { Button, Progress, Tooltip, useToast } from "@/components/element";
import { isReviewed } from "@/lib/derive";
import {
  GAP_INK,
  SHAPE_META,
  SIDE_META,
  buildIssues,
  documentsOf,
  implicates,
  notesForStatement,
  workingValues as buildWorkingValues,
  type DisagreementShape,
  type Issue,
  type IssueKind,
  type SourceReading,
} from "@/lib/issues";
import { statementLabel } from "@/lib/mock";
import { useStore, type Disposition } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Project, StatementId } from "@/lib/types";

type CommentFilter = "open" | "closed" | "all";

/**
 * Findings, worst first. A line nobody could check sits second only to a
 * definite extraction error: it is not wrong, but it is the one thing on the
 * page that reads as fine when it is not, so it is never buried under the
 * disagreements.
 */
const SHAPE_ORDER: DisagreementShape[] = ["consensus", "unverified", "single", "split"];

const PAGE_ORDER: StatementId[] = ["balance", "income", "cashflow"];
const KIND_FILTERS: { value: IssueKind | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "gap", label: "Unverified" },
  { value: "value", label: "Values" },
  { value: "formula", label: "Formulas" },
  { value: "text", label: "Text" },
];

export function ReconcileViewer({
  project,
  open,
  focusItemId,
  onClose,
}: {
  project: Project;
  open: boolean;
  focusItemId: string | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const dispositions = useStore((s) => s.commentDisposition);
  const disposeComment = useStore((s) => s.disposeComment);
  const reopenComment = useStore((s) => s.reopenComment);
  const isOpen = React.useCallback(
    (issue: Issue) => dispositions[issue.id] === undefined,
    [dispositions]
  );

  const pages = React.useMemo(
    () => PAGE_ORDER.filter((s) => project.statements.includes(s)),
    [project.statements]
  );
  const allIssues = React.useMemo(() => buildIssues(project), [project]);

  const view = usePdfView({ pageCount: pages.length });
  const pageIndex = view.page - 1;
  const setPageIndex = React.useCallback(
    (next: number | ((current: number) => number)) => {
      view.goToPage((typeof next === "function" ? next(view.page - 1) : next) + 1);
    },
    [view]
  );
  const [tool, setTool] = React.useState<Mark>("tick");
  const [reference, setReference] = React.useState<string>("A");
  const [gutter, setGutter] = React.useState(false);
  const [marks, setMarks] = React.useState<Record<string, Mark>>({});
  const [hoveredItemId, setHoveredItemId] = React.useState<string | null>(null);
  const [focusIssueId, setFocusIssueId] = React.useState<string | null>(null);
  const [focusLineId, setFocusLineId] = React.useState<string | null>(focusItemId);
  const [filter, setFilter] = React.useState<CommentFilter>("open");
  const [kind, setKind] = React.useState<IssueKind | "all">("all");
  const [railOpen, setRailOpen] = React.useState(true);
  const [sync, setSync] = React.useState(true);

  const leftScroll = React.useRef<HTMLDivElement | null>(null);
  const rightScroll = React.useRef<HTMLDivElement | null>(null);
  const syncing = React.useRef(false);

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
    pageIssues.forEach((issue) => {
      if (issue.itemId) map.set(issue.itemId, issue);
    });
    return map;
  }, [pageIssues]);
  const textIssues = React.useMemo(() => pageIssues.filter((i) => i.kind === "text"), [pageIssues]);
  const openIssues = pageIssues.filter(isOpen);
  const workingValueMap = React.useMemo(() => buildWorkingValues(allIssues), [allIssues]);
  const documents = React.useMemo(() => documentsOf(project), [project]);
  const readingsByItem = React.useMemo(() => {
    const map = new Map<string, SourceReading[]>();
    allIssues.forEach((issue) => {
      if (issue.itemId && issue.readings.length) map.set(issue.itemId, issue.readings);
    });
    return map;
  }, [allIssues]);

  /*
   * The agent ticks what it reconciled; the analyst edits from there. A line it
   * could not check is never ticked — it carries the query mark until a person
   * decides what to do with it, which is the whole point of the third mark.
   *
   * Seeded once per opening, and deliberately not on every change to the items:
   * recording a decision rewrites the item it belongs to, and re-seeding from
   * that would wipe the mark the reviewer had just made.
   */
  React.useEffect(() => {
    if (!open) return;
    const seeded: Record<string, Mark> = {};
    project.items.forEach((item) => {
      if (item.status === "matched" || item.status === "approved") seeded[item.id] = "tick";
      if (item.status === "rejected") seeded[item.id] = "cross";
    });
    allIssues.forEach((issue) => {
      if (issue.kind === "gap" && issue.itemId) seeded[issue.itemId] = "unverified";
    });
    setMarks(seeded);
  }, [open, project.id]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    setFocusLineId(focusItemId);
    const item = project.items.find((i) => i.id === focusItemId);
    if (item) {
      const index = pages.indexOf(item.statement);
      if (index >= 0) setPageIndex(index);
      const issue = allIssues.find((i) => i.itemId === item.id);
      if (issue) setFocusIssueId(issue.id);
    }
  }, [focusItemId, project.items, pages, allIssues]);

  /* the left pane follows the evidence: workbook for formulas, filing for wording */
  const focusIssue = allIssues.find((i) => i.id === focusIssueId);
  React.useEffect(() => {
    if (!focusIssue) return;
    const firstOutlier = focusIssue.disagreeing[0];
    if (firstOutlier) setReference(firstOutlier);
    else setReference(focusIssue.kind === "formula" ? "B" : "A");
    if (focusIssue.itemId) setFocusLineId(focusIssue.itemId);
  }, [focusIssue?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const gotoIssue = React.useCallback(
    (direction: 1 | -1) => {
      if (!openIssues.length) return;
      const currentIndex = openIssues.findIndex((c) => c.id === focusIssueId);
      const next =
        currentIndex === -1
          ? openIssues[0]
          : openIssues[(currentIndex + direction + openIssues.length) % openIssues.length];
      setFocusIssueId(next.id);
    },
    [openIssues, focusIssueId]
  );

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (e.key === "Escape") onClose();
      else if (e.key === "t") setTool("tick");
      else if (e.key === "c") setTool("cross");
      else if (e.key === "u") setTool("unverified");
      else if (e.key === "n") gotoIssue(1);
      else if (e.key === "p") gotoIssue(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, gotoIssue]);

  if (!open) return null;

  const reconciledPages = pages.filter((s) => {
    const rows = allIssues.filter((i) => i.statement === s);
    return rows.length > 0 && rows.every((i) => !isOpen(i));
  }).length;

  const ticked = items.filter((i) => marks[i.id] === "tick").length;
  const crossed = items.filter((i) => marks[i.id] === "cross").length;
  const queried = items.filter((i) => marks[i.id] === "unverified").length;
  const fadedCount = project.items.filter((i) => i.statement !== statement && marks[i.id]).length;

  const referenceDoc = documents.find((d) => d.id === reference) ?? project.docA;

  const toggleMark = (id: string) => {
    setFocusLineId(id);
    const issue = issueByItem.get(id);
    if (issue) setFocusIssueId(issue.id);
    setMarks((m) => {
      const next = { ...m };
      if (next[id]) delete next[id];
      else next[id] = tool;
      return next;
    });
  };

  const onScroll = (from: "left" | "right") => () => {
    if (!sync || syncing.current) return;
    const a = from === "left" ? leftScroll.current : rightScroll.current;
    const b = from === "left" ? rightScroll.current : leftScroll.current;
    if (!a || !b) return;
    syncing.current = true;
    const ratio = a.scrollTop / Math.max(1, a.scrollHeight - a.clientHeight);
    b.scrollTop = ratio * (b.scrollHeight - b.clientHeight);
    requestAnimationFrame(() => {
      syncing.current = false;
    });
  };

  const visibleIssues = pageIssues
    .filter((i) => (filter === "all" ? true : filter === "open" ? isOpen(i) : !isOpen(i)))
    .filter((i) => (kind === "all" ? true : i.kind === kind));

  /* grouped by the document at fault, so a filing error and a workbook error
     are never mixed into one undifferentiated list */
  const groupedIssues = SHAPE_ORDER.map((shape) => ({
    shape,
    issues: visibleIssues.filter((i) => i.shape === shape),
  })).filter((group) => group.issues.length > 0);

  const handleDispose = (issue: Issue, disposition: Disposition, basis?: string) => {
    disposeComment(issue.id, issue.itemId ?? null, disposition, basis);
    const gap = issue.kind === "gap";

    if (issue.itemId) {
      /*
       * Only a verdict earns a verdict's mark. On a line nobody could check,
       * the one decision that turns the query into a tick is a reviewer saying
       * they checked it themselves — accepting it, or asking the preparer for
       * the evidence, both leave the question open, and neither makes the line
       * wrong, so neither gets a cross.
       */
      const next: Mark = gap
        ? disposition === "resolved"
          ? "tick"
          : "unverified"
        : disposition === "flagged"
          ? "cross"
          : "tick";
      setMarks((m) => ({ ...m, [issue.itemId!]: next }));
    }

    toast(
      disposition === "resolved"
        ? gap
          ? `Verified by hand · ${issue.title}`
          : `Resolved · ${issue.title}`
        : disposition === "flagged"
          ? gap
            ? `Source requested · ${issue.title}`
            : `Flagged to the preparer · ${
                issue.readings.find((r) => !r.agrees)?.label ?? SIDE_META[issue.side].short
              } · ${issue.title}`
          : disposition === "accepted"
            ? `Accepted unverified · ${issue.title}`
            : `Dismissed · ${issue.title}`,
      disposition === "resolved" ? "success" : "info"
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      {/* --------------------------------- header -------------------------------- */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-5 py-3">
        <div className="flex min-w-0 flex-col">
          <h2 className="truncate text-h3 font-semibold tracking-tight">
            {project.docB.fileName.replace(/\.[^.]+$/, "")}_reconciled.pdf
          </h2>
          <p className="truncate text-helper text-muted-foreground">
            {project.entity} · {statementLabel(statement)} · reconciled against{" "}
            {project.docA.fileName} and {project.docB.fileName}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border p-0.5">
            <ToolButton active={tool === "tick"} onClick={() => setTool("tick")} tone="ok" hint="T">
              <Check />
              Tick
            </ToolButton>
            <ToolButton active={tool === "cross"} onClick={() => setTool("cross")} tone="bad" hint="C">
              <X />
              Cross
            </ToolButton>
            <ToolButton
              active={tool === "unverified"}
              onClick={() => setTool("unverified")}
              tone="query"
              hint="U"
              title="Could not be verified — no evidence either way"
            >
              <CircleDashed />
              Unverified
            </ToolButton>
          </div>

          <Button variant="outline" size="sm" disabled={!openIssues.length} onClick={() => gotoIssue(1)}>
            Next unresolved
            <span className="tabular font-mono text-helper text-muted-foreground">
              {openIssues.length}
            </span>
          </Button>

          <Button variant="brandSoft" size="sm" onClick={() => toast("Reconciled PDF downloaded")}>
            <Download />
            Download
          </Button>
          <Button variant="ghost" size="iconSm" aria-label="Close viewer" onClick={onClose}>
            <X />
          </Button>
        </div>
      </div>

      {/* ------------------------------ reader chrome ---------------------------- */}
      <PdfToolbar
        view={view}
        showName={false}
        can={[]}
        fileName={`${project.docB.fileName.replace(/\.[^.]+$/, "")}_reconciled.pdf`}
        leading={
          <div className="flex items-center gap-0.5">
            {pages.map((page, i) => {
              const openOnPage = allIssues.filter(
                (x) => x.statement === page && isOpen(x) && x.kind !== "gap"
              ).length;
              /* counted apart from the errors: a page whose only open findings
                 are unverified lines is not a page with mistakes on it */
              const gapsOnPage = allIssues.filter(
                (x) => x.statement === page && isOpen(x) && x.kind === "gap"
              ).length;
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => setPageIndex(i)}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-body-sm transition-colors duration-fast",
                    i === pageIndex
                      ? "bg-[rgba(70,100,220,0.32)] font-medium text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {statementLabel(page).replace(" Statement", "")}
                  {openOnPage > 0 && (
                    <span className="tabular flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 font-mono text-[10px] text-white">
                      {openOnPage}
                    </span>
                  )}
                  {gapsOnPage > 0 && (
                    <span
                      title={`${gapsOnPage} ${
                        gapsOnPage === 1 ? "line" : "lines"
                      } could not be verified`}
                      className="tabular flex h-4 min-w-4 items-center justify-center rounded-full border border-dashed px-1 font-mono text-[10px]"
                      style={{ borderColor: GAP_INK.edge, color: "#7FD3E8" }}
                    >
                      {gapsOnPage}
                    </span>
                  )}
                </button>
              );
            })}
            <span className="mx-1.5 h-5 w-px bg-white/15" />
            <span className="tabular hidden font-mono text-helper text-white/55 xl:inline">
              reconciled {reconciledPages}/{pages.length}
            </span>
          </div>
        }
      >
        <PdfBarButton
          label={sync ? "Panes scroll together" : "Panes scroll independently"}
          active={sync}
          onClick={() => setSync((v) => !v)}
        >
          {sync ? <Link2 /> : <Link2Off />}
        </PdfBarButton>
        <PdfBarButton
          label="Agreement grid"
          active={gutter}
          onClick={() => setGutter((v) => !v)}
        >
          <Columns3 />
        </PdfBarButton>
        <PdfBarButton
          label={railOpen ? "Hide comments" : "Show comments"}
          active={railOpen}
          onClick={() => setRailOpen((v) => !v)}
        >
          {railOpen ? <PanelRightClose /> : <PanelRightOpen />}
        </PdfBarButton>
      </PdfToolbar>

      {/* --------------------------------- panes --------------------------------- */}
      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
          {/* reference — PDF filing or the supporting workbook */}
          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border">
            <div className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto scrollbar-thin border-b border-border-subtle px-2">
              {documents.map((doc) => {
                const isActive = reference === doc.id;
                const isSheet = doc.kind === "xlsx";
                const flagged = pageIssues.filter((i) => implicates(i, doc.id) && isOpen(i)).length;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setReference(doc.id)}
                    title={doc.fileName}
                    className={cn(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-helper transition-colors duration-fast",
                      isActive
                        ? "bg-[rgba(70,100,220,0.08)] font-medium text-[#2F45A8]"
                        : "text-muted-foreground hover:bg-surface-secondary"
                    )}
                  >
                    {isSheet ? (
                      <FileSpreadsheet className="h-3.5 w-3.5 text-[#179864]" />
                    ) : (
                      <FileText className="h-3.5 w-3.5 text-[#DC2626]" />
                    )}
                    <span className="max-w-[130px] truncate">{doc.label}</span>
                    {flagged > 0 && (
                      <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 font-mono text-[10px] text-white">
                        {flagged}
                      </span>
                    )}
                  </button>
                );
              })}
              <span className="ml-auto shrink-0 pl-2 text-meta text-muted-foreground">
                {referenceDoc.kind === "xlsx" ? "Source workbook" : "Reference · p.1"}
              </span>
            </div>

            {referenceDoc.kind === "xlsx" ? (
              <ExcelPane
                project={project}
                sheet={items[0]?.sourceB.sheet ?? "IS_Model"}
                items={project.items}
                issues={allIssues}
                issueNumber={issueNumber}
                dispositions={dispositions}
                focusId={focusIssueId}
                hoveredItemId={hoveredItemId}
                onHover={setHoveredItemId}
                onSelectIssue={setFocusIssueId}
                onSelectItem={setFocusLineId}
              />
            ) : (
              <div
                ref={leftScroll}
                onScroll={onScroll("left")}
                className="min-h-0 flex-1 overflow-auto scrollbar-thin bg-[#EDF1F6] p-4"
              >
                <ScaledSheet scale={view.scale}>
                <DocumentPage
                  project={project}
                  statement={statement}
                  items={items}
                  notes={notes}
                  variant="reference"
                  periods={[project.comparisonPeriod ?? "FY2023", "FY2022"]}
                  marks={{}}
                  issueByItem={issueByItem}
                  textIssues={textIssues}
                  issueNumber={issueNumber}
                  dispositions={dispositions}
                  workingValues={workingValueMap}
                  lensDocId={reference}
                  gutter={false}
                  documents={documents}
                  readingsByItem={readingsByItem}
                  focusIssueId={focusIssueId}
                  focusItemId={focusLineId}
                  hoveredItemId={hoveredItemId}
                  onHover={setHoveredItemId}
                  onLineClick={setFocusLineId}
                  onIssueClick={setFocusIssueId}
                />
                </ScaledSheet>
              </div>
            )}
          </div>

          {/* working */}
          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border">
            <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border-subtle px-2.5">
              <span className="shrink-0 text-body-sm font-medium">Working (editable) · p.1</span>
              <span className="flex items-center gap-1.5 text-meta text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Check className="h-3 w-3 text-success" />
                  {ticked}
                </span>
                <span className="inline-flex items-center gap-1">
                  <X className="h-3 w-3 text-critical" />
                  {crossed}
                </span>
                {queried > 0 && (
                  <span
                    className="inline-flex items-center gap-1 font-medium"
                    style={{ color: GAP_INK.strong }}
                    title={`${queried} ${queried === 1 ? "line" : "lines"} could not be verified`}
                  >
                    <QueryMark />
                    {queried}
                  </span>
                )}
                <span>· {items.length} lines</span>
              </span>
              <span className="ml-auto shrink-0 truncate text-meta text-muted-foreground">
                <span className="font-medium text-foreground">{referenceDoc.label}</span> highlighted
                · other sources dimmed
              </span>
            </div>

            <div
              ref={(el) => {
                rightScroll.current = el;
                view.attachFrame(el);
              }}
              onScroll={onScroll("right")}
              className="min-h-0 flex-1 overflow-auto scrollbar-thin bg-[#EDF1F6] p-4"
            >
              <ScaledSheet scale={view.scale}>
              <DocumentPage
                project={project}
                statement={statement}
                items={items}
                notes={notes}
                variant="working"
                periods={[project.period, project.comparisonPeriod ?? "FY2023"]}
                marks={marks}
                issueByItem={issueByItem}
                textIssues={textIssues}
                issueNumber={issueNumber}
                dispositions={dispositions}
                workingValues={workingValueMap}
                lensDocId={reference}
                gutter={gutter}
                documents={documents}
                readingsByItem={readingsByItem}
                focusIssueId={focusIssueId}
                focusItemId={focusLineId}
                hoveredItemId={hoveredItemId}
                onHover={setHoveredItemId}
                onLineClick={toggleMark}
                onIssueClick={setFocusIssueId}
              />
              </ScaledSheet>
            </div>
          </div>
        </div>

        {/* ------------------------------ comments rail ----------------------------- */}
        <AnimatePresence initial={false}>
          {railOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 348, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="hidden min-h-0 shrink-0 overflow-hidden xl:flex"
            >
              <div className="flex min-h-0 w-[348px] flex-col rounded-lg border border-border">
                <div className="shrink-0 border-b border-border-subtle px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-muted-foreground" />
                    <span className="text-body font-medium">Comments</span>
                    <span className="ml-auto tabular font-mono text-helper text-muted-foreground">
                      {pageIssues.length - openIssues.length}/{pageIssues.length} closed
                    </span>
                  </div>
                  <Progress
                    className="mt-2"
                    size="sm"
                    tone={openIssues.length === 0 ? "success" : "warning"}
                    value={
                      pageIssues.length
                        ? ((pageIssues.length - openIssues.length) / pageIssues.length) * 100
                        : 100
                    }
                  />

                  <div className="mt-2.5 flex items-center gap-0.5 rounded-lg border border-border bg-surface-secondary p-0.5">
                    {(
                      [
                        ["open", `Open ${openIssues.length}`],
                        ["closed", `Closed ${pageIssues.length - openIssues.length}`],
                        ["all", "All"],
                      ] as [CommentFilter, string][]
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFilter(value)}
                        className={cn(
                          "flex-1 rounded-md px-2 py-1 text-helper font-medium transition-colors duration-fast",
                          filter === value
                            ? "bg-surface text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-1">
                    {KIND_FILTERS.map((option) => {
                      const count =
                        option.value === "all"
                          ? pageIssues.length
                          : pageIssues.filter((i) => i.kind === option.value).length;
                      if (count === 0 && option.value !== "all") return null;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setKind(option.value)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-meta transition-colors duration-fast",
                            kind === option.value
                              ? "border-brand/40 bg-[rgba(70,100,220,0.08)] text-[#2F45A8]"
                              : "border-border text-muted-foreground hover:bg-surface-secondary"
                          )}
                        >
                          {option.label}
                          <span className="tabular font-mono">{count}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="min-h-0 flex-1 overflow-auto scrollbar-thin p-2.5">
                  {visibleIssues.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(23,152,100,0.12)] text-success">
                        <Check className="h-4 w-4" />
                      </span>
                      <p className="text-body-sm font-medium">
                        {filter === "open" ? "Nothing left to resolve here" : "No comments in this view"}
                      </p>
                      <p className="text-helper text-muted-foreground">
                        {filter === "open"
                          ? `Every finding on ${statementLabel(statement)} has a decision behind it.`
                          : "Switch the filter to see the rest."}
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {groupedIssues.map((group) => {
                        const meta = SHAPE_META[group.shape];
                        const openInGroup = group.issues.filter(isOpen).length;
                        return (
                          <section key={group.shape} className="flex flex-col gap-1.5">
                            <header className="flex items-center gap-1.5 px-0.5">
                              <span
                                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-meta font-semibold uppercase tracking-wider"
                                style={{ background: meta.tint, color: meta.fg }}
                              >
                                {group.shape === "single" ? (
                                  <Flag className="h-2.5 w-2.5" />
                                ) : group.shape === "consensus" ? (
                                  <FileText className="h-2.5 w-2.5" />
                                ) : group.shape === "unverified" ? (
                                  <CircleDashed className="h-2.5 w-2.5" />
                                ) : (
                                  <GitCompareArrows className="h-2.5 w-2.5" />
                                )}
                                {meta.label}
                              </span>
                              <span className="tabular font-mono text-meta text-muted-foreground">
                                {openInGroup} open · {group.issues.length}
                              </span>
                              <span className="ml-auto truncate text-meta text-muted-foreground">
                                {meta.hint}
                              </span>
                            </header>

                            <ul className="flex flex-col gap-2">
                              {group.issues.map((issue) => (
                                <CommentCard
                                  key={issue.id}
                                  issue={issue}
                                  item={project.items.find((i) => i.id === issue.itemId)}
                                  project={project}
                                  number={issueNumber.get(issue.id) ?? 0}
                                  disposition={dispositions[issue.id]}
                                  focused={focusIssueId === issue.id}
                                  hovered={Boolean(issue.itemId && issue.itemId === hoveredItemId)}
                                  onFocus={() => setFocusIssueId(issue.id)}
                                  onHover={setHoveredItemId}
                                  onDispose={(disposition, basis) =>
                                    handleDispose(issue, disposition, basis)
                                  }
                                  onReopen={() => reopenComment(issue.id)}
                                />
                              ))}
                            </ul>
                          </section>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="shrink-0 border-t border-border-subtle px-3 py-2 text-meta text-muted-foreground">
                  <Kbd>n</Kbd> / <Kbd>p</Kbd> next and previous · <Kbd>t</Kbd> / <Kbd>c</Kbd> /{" "}
                  <Kbd>u</Kbd> mark tool
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/** A pane's sheet at the viewer's zoom — scaled, not reflowed. */
function ScaledSheet({ scale, children }: { scale: number; children: React.ReactNode }) {
  const sheetRef = React.useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = React.useState(0);

  React.useLayoutEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const measure = () => setHeight(sheet.offsetHeight);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(sheet);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="mx-auto" style={{ width: PAGE_WIDTH * scale, height: height * scale || undefined }}>
      <div
        ref={sheetRef}
        style={{ width: PAGE_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}
      >
        {children}
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-surface-secondary px-1 font-mono">{children}</kbd>
  );
}

function ToolButton({
  active,
  onClick,
  tone,
  hint,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone: "ok" | "bad" | "query";
  hint: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-body-sm font-medium transition-colors duration-fast [&_svg]:size-3.5",
        active
          ? tone === "ok"
            ? "bg-[rgba(23,152,100,0.12)] text-[#0F7048]"
            : tone === "bad"
              ? "bg-[rgba(220,38,38,0.12)] text-[#B91C1C]"
              : "bg-[rgba(14,116,144,0.12)] text-[#0B5A70]"
          : "text-muted-foreground hover:bg-surface-secondary"
      )}
    >
      {children}
      <kbd
        className={cn(
          "rounded border px-1 font-mono text-[10px]",
          active ? "border-current/30 opacity-70" : "border-border text-muted-foreground"
        )}
      >
        {hint}
      </kbd>
    </button>
  );
}
