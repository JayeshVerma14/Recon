"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  FileSpreadsheet,
  FileText,
  Link2,
  Link2Off,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  X,
} from "lucide-react";

import { CommentCard, type Outcome } from "@/components/viewer/CommentCard";
import { DocumentPage, type Mark } from "@/components/viewer/DocumentPage";
import { ExcelPane } from "@/components/viewer/ExcelPane";
import { Button, Progress, Tooltip, useToast } from "@/components/element";
import { isReviewed } from "@/lib/derive";
import { buildIssues, notesForStatement, type Issue, type IssueKind } from "@/lib/issues";
import { statementLabel } from "@/lib/mock";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Project, StatementId } from "@/lib/types";

type CommentFilter = "open" | "resolved" | "all";

const PAGE_ORDER: StatementId[] = ["balance", "income", "cashflow"];
const KIND_FILTERS: { value: IssueKind | "all"; label: string }[] = [
  { value: "all", label: "All" },
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
  const resolved = useStore((s) => s.resolvedComments);
  const resolveComment = useStore((s) => s.resolveComment);
  const reopenComment = useStore((s) => s.reopenComment);

  const pages = React.useMemo(
    () => PAGE_ORDER.filter((s) => project.statements.includes(s)),
    [project.statements]
  );
  const allIssues = React.useMemo(() => buildIssues(project), [project]);

  const [pageIndex, setPageIndex] = React.useState(0);
  const [tool, setTool] = React.useState<Mark>("tick");
  const [reference, setReference] = React.useState<"A" | "B">("A");
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
  const openIssues = pageIssues.filter((i) => !resolved.includes(i.id));

  /* the agent ticks what it reconciled; the analyst edits from there */
  React.useEffect(() => {
    if (!open) return;
    const seeded: Record<string, Mark> = {};
    project.items.forEach((item) => {
      if (item.status === "matched" || item.status === "approved") seeded[item.id] = "tick";
      if (item.status === "rejected") seeded[item.id] = "cross";
    });
    setMarks(seeded);
  }, [open, project.items]);

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
    if (focusIssue.kind === "formula") setReference("B");
    if (focusIssue.kind === "text") setReference("A");
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
      else if (e.key === "n") gotoIssue(1);
      else if (e.key === "p") gotoIssue(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, gotoIssue]);

  if (!open) return null;

  const reconciledPages = pages.filter((s) => {
    const rows = project.items.filter((i) => i.statement === s);
    return rows.length > 0 && rows.every(isReviewed);
  }).length;

  const ticked = items.filter((i) => marks[i.id] === "tick").length;
  const crossed = items.filter((i) => marks[i.id] === "cross").length;
  const fadedCount = project.items.filter((i) => i.statement !== statement && marks[i.id]).length;

  const referenceDoc = reference === "A" ? project.docA : project.docB;

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
    .filter((i) =>
      filter === "all" ? true : filter === "open" ? !resolved.includes(i.id) : resolved.includes(i.id)
    )
    .filter((i) => (kind === "all" ? true : i.kind === kind));

  const handleResolve = (issue: Issue, outcome: Outcome) => {
    resolveComment(issue.id, issue.itemId ?? null, outcome);
    if (issue.itemId && outcome !== "dismiss") {
      setMarks((m) => ({ ...m, [issue.itemId!]: "tick" }));
    }
    toast(
      issue.kind === "text"
        ? outcome === "reference"
          ? `Reference wording adopted · ${issue.title}`
          : outcome === "accept"
            ? `Working wording kept · ${issue.title}`
            : `Comment dismissed · ${issue.title}`
        : outcome === "accept"
          ? `Accepted working value · ${issue.title}`
          : outcome === "reference"
            ? `Reference value applied · ${issue.title}`
            : `Comment dismissed · ${issue.title}`
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

      {/* --------------------------------- pager --------------------------------- */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border-subtle px-5 py-2">
        <div className="flex items-center gap-1">
          <PagerButton onClick={() => setPageIndex(0)} label="First page" disabled={pageIndex === 0}>
            <ChevronsLeft />
          </PagerButton>
          <PagerButton
            onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
            label="Previous page"
            disabled={pageIndex === 0}
          >
            <ChevronLeft />
          </PagerButton>
          <span className="px-1.5 text-body-sm">
            Page <span className="tabular font-mono">{pageIndex + 1}</span> /{" "}
            <span className="tabular font-mono">{pages.length}</span>
            <span className="text-muted-foreground">
              {" "}
              · reconciled {reconciledPages}/{pages.length}
            </span>
          </span>
          <PagerButton
            onClick={() => setPageIndex((p) => Math.min(pages.length - 1, p + 1))}
            label="Next page"
            disabled={pageIndex === pages.length - 1}
          >
            <ChevronRight />
          </PagerButton>
          <PagerButton
            onClick={() => setPageIndex(pages.length - 1)}
            label="Last page"
            disabled={pageIndex === pages.length - 1}
          >
            <ChevronsRight />
          </PagerButton>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {pages.map((page, i) => {
            const openOnPage = allIssues.filter(
              (x) => x.statement === page && !resolved.includes(x.id)
            ).length;
            return (
              <button
                key={page}
                type="button"
                onClick={() => setPageIndex(i)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-helper transition-colors duration-fast",
                  i === pageIndex
                    ? "bg-[rgba(70,100,220,0.10)] font-medium text-[#2F45A8]"
                    : "text-muted-foreground hover:bg-surface-secondary"
                )}
              >
                {statementLabel(page).replace(" Statement", "")}
                {openOnPage > 0 && (
                  <span className="tabular flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 font-mono text-[10px] text-white">
                    {openOnPage}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Tooltip content={sync ? "Panes scroll together" : "Panes scroll independently"}>
            <button
              type="button"
              onClick={() => setSync((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-helper transition-colors duration-fast",
                sync
                  ? "border-brand/40 bg-[rgba(70,100,220,0.08)] text-[#2F45A8]"
                  : "border-border text-muted-foreground hover:bg-surface-secondary"
              )}
            >
              {sync ? <Link2 className="h-3.5 w-3.5" /> : <Link2Off className="h-3.5 w-3.5" />}
              Sync scroll
            </button>
          </Tooltip>
          <Button
            variant="ghost"
            size="iconSm"
            aria-label={railOpen ? "Hide comments" : "Show comments"}
            onClick={() => setRailOpen((v) => !v)}
          >
            {railOpen ? <PanelRightClose /> : <PanelRightOpen />}
          </Button>
        </div>
      </div>

      {/* --------------------------------- panes --------------------------------- */}
      <div className="flex min-h-0 flex-1 gap-3 p-3">
        <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-2">
          {/* reference — PDF filing or the supporting workbook */}
          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border">
            <div className="flex h-10 shrink-0 items-center gap-1 overflow-x-auto scrollbar-thin border-b border-border-subtle px-2">
              {(["A", "B"] as const).map((id) => {
                const doc = id === "A" ? project.docA : project.docB;
                const isActive = reference === id;
                const isSheet = doc.kind === "xlsx";
                const flagged = allIssues.filter(
                  (i) => i.kind === "formula" && i.statement === statement && !resolved.includes(i.id)
                ).length;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setReference(id)}
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
                    <span className="max-w-[190px] truncate">{doc.fileName}</span>
                    {isSheet && flagged > 0 && (
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
                resolvedIds={resolved}
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
                  resolvedIds={resolved}
                  focusIssueId={focusIssueId}
                  focusItemId={focusLineId}
                  hoveredItemId={hoveredItemId}
                  onHover={setHoveredItemId}
                  onLineClick={setFocusLineId}
                  onIssueClick={setFocusIssueId}
                />
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
                <span>· {items.length} lines</span>
              </span>
              <span className="ml-auto shrink-0 text-meta text-muted-foreground">
                {fadedCount} marks faded — other pages
              </span>
            </div>

            <div
              ref={rightScroll}
              onScroll={onScroll("right")}
              className="min-h-0 flex-1 overflow-auto scrollbar-thin bg-[#EDF1F6] p-4"
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
                textIssues={textIssues}
                issueNumber={issueNumber}
                resolvedIds={resolved}
                focusIssueId={focusIssueId}
                focusItemId={focusLineId}
                hoveredItemId={hoveredItemId}
                onHover={setHoveredItemId}
                onLineClick={toggleMark}
                onIssueClick={setFocusIssueId}
              />
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
                      {pageIssues.length - openIssues.length}/{pageIssues.length} resolved
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
                        ["resolved", `Resolved ${pageIssues.length - openIssues.length}`],
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
                    <ul className="flex flex-col gap-2">
                      {visibleIssues.map((issue) => (
                        <CommentCard
                          key={issue.id}
                          issue={issue}
                          item={project.items.find((i) => i.id === issue.itemId)}
                          project={project}
                          number={issueNumber.get(issue.id) ?? 0}
                          resolved={resolved.includes(issue.id)}
                          focused={focusIssueId === issue.id}
                          hovered={Boolean(issue.itemId && issue.itemId === hoveredItemId)}
                          onFocus={() => setFocusIssueId(issue.id)}
                          onHover={setHoveredItemId}
                          onResolve={(outcome) => handleResolve(issue, outcome)}
                          onReopen={() => reopenComment(issue.id)}
                        />
                      ))}
                    </ul>
                  )}
                </div>

                <div className="shrink-0 border-t border-border-subtle px-3 py-2 text-meta text-muted-foreground">
                  <Kbd>n</Kbd> / <Kbd>p</Kbd> next and previous · <Kbd>t</Kbd> / <Kbd>c</Kbd> mark tool
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
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
  children,
}: {
  active: boolean;
  onClick: () => void;
  tone: "ok" | "bad";
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-body-sm font-medium transition-colors duration-fast [&_svg]:size-3.5",
        active
          ? tone === "ok"
            ? "bg-[rgba(23,152,100,0.12)] text-[#0F7048]"
            : "bg-[rgba(220,38,38,0.12)] text-[#B91C1C]"
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

function PagerButton({
  onClick,
  label,
  disabled,
  children,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className="rounded-md p-1.5 text-muted-foreground transition-colors duration-fast hover:bg-surface-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4"
    >
      {children}
    </button>
  );
}
