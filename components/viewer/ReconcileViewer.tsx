"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownToLine,
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CornerUpLeft,
  Download,
  FileText,
  Link2,
  Link2Off,
  MessageSquare,
  PanelRightClose,
  PanelRightOpen,
  X,
} from "lucide-react";

import { Button, Progress, Tooltip, useToast } from "@/components/element";
import { difference, effectiveValue, formatDifference, formatValue, isReviewed } from "@/lib/derive";
import { statementLabel } from "@/lib/mock";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { LineItem, Project, StatementId } from "@/lib/types";

type Mark = "tick" | "cross";
type CommentFilter = "open" | "resolved" | "all";

const PAGE_ORDER: StatementId[] = ["balance", "income", "cashflow"];

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

  const [pageIndex, setPageIndex] = React.useState(0);
  const [tool, setTool] = React.useState<Mark>("tick");
  const [reference, setReference] = React.useState<"A" | "B">("A");
  const [marks, setMarks] = React.useState<Record<string, Mark>>({});
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const [focusId, setFocusId] = React.useState<string | null>(focusItemId);
  const [filter, setFilter] = React.useState<CommentFilter>("open");
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
    setFocusId(focusItemId);
    const item = project.items.find((i) => i.id === focusItemId);
    if (item) {
      const index = pages.indexOf(item.statement);
      if (index >= 0) setPageIndex(index);
    }
  }, [focusItemId, project.items, pages]);

  const comments = React.useMemo(() => items.filter((i) => i.explanation), [items]);
  const commentNumber = React.useMemo(
    () => new Map(comments.map((item, i) => [item.id, i + 1])),
    [comments]
  );
  const openComments = comments.filter((c) => !resolved.includes(c.id));

  const gotoComment = React.useCallback(
    (direction: 1 | -1) => {
      if (!openComments.length) return;
      const currentIndex = openComments.findIndex((c) => c.id === focusId);
      const next =
        currentIndex === -1
          ? openComments[0]
          : openComments[(currentIndex + direction + openComments.length) % openComments.length];
      setFocusId(next.id);
    },
    [openComments, focusId]
  );

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (e.key === "Escape") onClose();
      else if (e.key === "t") setTool("tick");
      else if (e.key === "c") setTool("cross");
      else if (e.key === "n") gotoComment(1);
      else if (e.key === "p") gotoComment(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, gotoComment]);

  if (!open) return null;

  const reconciledPages = pages.filter((s) => {
    const rows = project.items.filter((i) => i.statement === s);
    return rows.length > 0 && rows.every(isReviewed);
  }).length;

  const pageMarks = items.filter((i) => marks[i.id]);
  const ticked = pageMarks.filter((i) => marks[i.id] === "tick").length;
  const crossed = pageMarks.filter((i) => marks[i.id] === "cross").length;
  const fadedCount = project.items.filter((i) => i.statement !== statement && marks[i.id]).length;

  const toggleMark = (id: string) => {
    setFocusId(id);
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

  const visibleComments =
    filter === "all"
      ? comments
      : filter === "open"
        ? comments.filter((c) => !resolved.includes(c.id))
        : comments.filter((c) => resolved.includes(c.id));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface">
      {/* --------------------------------- header -------------------------------- */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-5 py-3">
        <div className="flex min-w-0 flex-col">
          <h2 className="truncate text-h3 font-semibold tracking-tight">
            {project.docB.fileName.replace(/\.[^.]+$/, "")}_reconciled.pdf
          </h2>
          <p className="truncate text-helper text-muted-foreground">
            {project.entity} · {statementLabel(statement)} · reconciled against {project.docA.fileName}
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

          <Button
            variant="outline"
            size="sm"
            disabled={!openComments.length}
            onClick={() => gotoComment(1)}
          >
            Next unresolved
            <span className="tabular font-mono text-helper text-muted-foreground">
              {openComments.length}
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
            const rows = project.items.filter((x) => x.statement === page);
            const openOnPage = rows.filter((x) => x.explanation && !resolved.includes(x.id)).length;
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
          {/* reference */}
          <Pane
            head={
              <div className="flex min-w-0 items-center gap-1 overflow-x-auto scrollbar-thin">
                {(["A", "B"] as const).map((id) => {
                  const doc = id === "A" ? project.docA : project.docB;
                  const isActive = reference === id;
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
                      <FileText className="h-3.5 w-3.5" />
                      <span className="max-w-[220px] truncate">{doc.fileName}</span>
                    </button>
                  );
                })}
                <span className="ml-1 shrink-0 text-meta text-muted-foreground">Reference · p.1</span>
              </div>
            }
            scrollRef={leftScroll}
            onScroll={onScroll("left")}
          >
            <DocumentPage
              project={project}
              statement={statement}
              items={items}
              variant="reference"
              periods={[project.comparisonPeriod ?? "FY2023", "FY2022"]}
              marks={{}}
              commentNumber={new Map()}
              resolvedIds={resolved}
              focusId={focusId}
              hoveredId={hoveredId}
              onHover={setHoveredId}
              onLineClick={setFocusId}
            />
          </Pane>

          {/* working */}
          <Pane
            head={
              <div className="flex min-w-0 flex-1 items-center gap-2">
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
            }
            scrollRef={rightScroll}
            onScroll={onScroll("right")}
          >
            <DocumentPage
              project={project}
              statement={statement}
              items={items}
              variant="working"
              periods={[project.period, project.comparisonPeriod ?? "FY2023"]}
              marks={marks}
              commentNumber={commentNumber}
              resolvedIds={resolved}
              focusId={focusId}
              hoveredId={hoveredId}
              onHover={setHoveredId}
              onLineClick={toggleMark}
            />
          </Pane>
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
                      {comments.length - openComments.length}/{comments.length} resolved
                    </span>
                  </div>
                  <Progress
                    className="mt-2"
                    size="sm"
                    tone={openComments.length === 0 ? "success" : "warning"}
                    value={
                      comments.length
                        ? ((comments.length - openComments.length) / comments.length) * 100
                        : 100
                    }
                  />
                  <div className="mt-2.5 flex items-center gap-0.5 rounded-lg border border-border bg-surface-secondary p-0.5">
                    {(
                      [
                        ["open", `Open ${openComments.length}`],
                        ["resolved", `Resolved ${comments.length - openComments.length}`],
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
                </div>

                <div className="min-h-0 flex-1 overflow-auto scrollbar-thin p-2.5">
                  {visibleComments.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(23,152,100,0.12)] text-success">
                        <Check className="h-4 w-4" />
                      </span>
                      <p className="text-body-sm font-medium">
                        {filter === "open" ? "Nothing left to resolve here" : "No comments in this view"}
                      </p>
                      <p className="text-helper text-muted-foreground">
                        {filter === "open"
                          ? `Every comment on ${statementLabel(statement)} has a decision behind it.`
                          : "Switch the filter to see the rest."}
                      </p>
                    </div>
                  ) : (
                    <ul className="flex flex-col gap-2">
                      {visibleComments.map((item) => (
                        <CommentCard
                          key={item.id}
                          item={item}
                          project={project}
                          number={commentNumber.get(item.id) ?? 0}
                          resolved={resolved.includes(item.id)}
                          focused={focusId === item.id}
                          hovered={hoveredId === item.id}
                          onFocus={() => setFocusId(item.id)}
                          onHover={setHoveredId}
                          onResolve={(outcome) => {
                            resolveComment(item.id, outcome);
                            setMarks((m) => ({
                              ...m,
                              [item.id]: outcome === "dismiss" ? m[item.id] : "tick",
                            }));
                            toast(
                              outcome === "accept"
                                ? `Accepted working value · ${item.account}`
                                : outcome === "reference"
                                  ? `Reference value applied · ${item.account}`
                                  : `Comment dismissed · ${item.account}`
                            );
                          }}
                          onReopen={() => reopenComment(item.id)}
                        />
                      ))}
                    </ul>
                  )}
                </div>

                <div className="shrink-0 border-t border-border-subtle px-3 py-2 text-meta text-muted-foreground">
                  <kbd className="rounded border border-border bg-surface-secondary px-1">n</kbd> /{" "}
                  <kbd className="rounded border border-border bg-surface-secondary px-1">p</kbd> next
                  and previous ·{" "}
                  <kbd className="rounded border border-border bg-surface-secondary px-1">t</kbd> /{" "}
                  <kbd className="rounded border border-border bg-surface-secondary px-1">c</kbd> mark
                  tool
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function Pane({
  head,
  scrollRef,
  onScroll,
  children,
}: {
  head: React.ReactNode;
  scrollRef: React.MutableRefObject<HTMLDivElement | null>;
  onScroll: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-lg border border-border">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border-subtle px-2.5">
        {head}
      </div>
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-auto scrollbar-thin bg-[#EDF1F6] p-4"
      >
        {children}
      </div>
    </div>
  );
}

function CommentCard({
  item,
  project,
  number,
  resolved,
  focused,
  hovered,
  onFocus,
  onHover,
  onResolve,
  onReopen,
}: {
  item: LineItem;
  project: Project;
  number: number;
  resolved: boolean;
  focused: boolean;
  hovered: boolean;
  onFocus: () => void;
  onHover: (id: string | null) => void;
  onResolve: (outcome: "accept" | "reference" | "dismiss") => void;
  onReopen: () => void;
}) {
  const diff = difference(item);

  return (
    <li
      onMouseEnter={() => onHover(item.id)}
      onMouseLeave={() => onHover(null)}
      onClick={onFocus}
      className={cn(
        "cursor-pointer rounded-lg border bg-surface transition-colors duration-fast",
        resolved ? "border-border-subtle" : "border-border",
        (focused || hovered) && "border-brand/50 shadow-card-hover",
        resolved && "opacity-70 hover:opacity-100"
      )}
    >
      <div className="flex items-start gap-2 px-2.5 pt-2.5">
        <span
          className={cn(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white",
            resolved ? "bg-success" : "bg-critical"
          )}
        >
          {resolved ? <Check className="h-3 w-3" strokeWidth={3} /> : number}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body-sm font-medium">{item.account}</span>
          <span className="text-meta uppercase tracking-wider text-muted-foreground">
            {item.agentStatus === "needs_review" ? "Needs review" : "Mismatch"} ·{" "}
            {statementLabel(item.statement).replace(" Statement", "")}
          </span>
        </div>
        <span className="tabular shrink-0 rounded bg-surface-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
          {item.confidence}%
        </span>
      </div>

      <dl className="mx-2.5 mt-2.5 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-md bg-surface-secondary/70 px-2.5 py-2">
        <dt className="text-meta uppercase tracking-wider text-muted-foreground">Working</dt>
        <dd className="tabular text-right font-mono text-body-sm">
          {formatValue(effectiveValue(item), item.unit)}
        </dd>
        <dt className="text-meta uppercase tracking-wider text-muted-foreground">Reference</dt>
        <dd className="tabular text-right font-mono text-body-sm">
          {formatValue(item.valueA, item.unit)}
        </dd>
        {diff !== 0 && (
          <>
            <dt className="text-meta uppercase tracking-wider text-muted-foreground">Difference</dt>
            <dd
              className={cn(
                "tabular text-right font-mono text-body-sm",
                item.agentStatus === "needs_review" ? "text-[#B45309]" : "text-[#B91C1C]"
              )}
            >
              {formatDifference(diff, item.unit)}
            </dd>
          </>
        )}
      </dl>

      <p className="px-2.5 py-2 text-helper text-muted-foreground">{item.explanation}</p>

      {resolved ? (
        <div className="flex items-center gap-2 border-t border-border-subtle px-2.5 py-2">
          <span className="truncate text-meta text-muted-foreground">
            Resolved by {item.reviewer ?? "you"}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onReopen();
            }}
            className="ml-auto inline-flex items-center gap-1 text-helper text-brand transition-colors duration-fast hover:underline"
          >
            <CornerUpLeft className="h-3 w-3" />
            Reopen
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border-subtle px-2.5 py-2">
          <Button
            variant="successSoft"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              onResolve("accept");
            }}
          >
            <Check />
            Accept working
          </Button>
          <Button
            variant="outline"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              onResolve("reference");
            }}
          >
            <ArrowDownToLine />
            Use reference
          </Button>
          <Button
            variant="ghost"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              onResolve("dismiss");
            }}
          >
            Dismiss
          </Button>
        </div>
      )}
    </li>
  );
}

function DocumentPage({
  project,
  statement,
  items,
  variant,
  periods,
  marks,
  commentNumber,
  resolvedIds,
  focusId,
  hoveredId,
  onHover,
  onLineClick,
}: {
  project: Project;
  statement: StatementId;
  items: LineItem[];
  variant: "reference" | "working";
  periods: [string, string];
  marks: Record<string, Mark>;
  commentNumber: Map<string, number>;
  resolvedIds: string[];
  focusId: string | null;
  hoveredId: string | null;
  onHover: (id: string | null) => void;
  onLineClick: (id: string) => void;
}) {
  const focusRef = React.useRef<HTMLTableRowElement | null>(null);

  React.useEffect(() => {
    focusRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [focusId, statement]);

  const value = (item: LineItem) => (variant === "working" ? effectiveValue(item) : item.valueA);
  const prior = (item: LineItem) =>
    variant === "working" ? item.valueA : Math.round(item.valueA * 0.93);

  return (
    <div className="mx-auto w-full max-w-[720px] rounded-sm bg-white px-7 py-7 shadow-[0_1px_3px_rgba(10,37,64,0.16)]">
      <div className="mb-4 flex flex-col items-center gap-0.5 text-center">
        <span className="font-serif text-[12px] font-semibold text-[#1B2733]">
          {project.entity} and Subsidiaries
        </span>
        <span className="font-serif text-[12px] font-semibold text-[#1B2733]">
          Consolidated {statementLabel(statement).replace(" Statement", "")} Statements
        </span>
        <span className="font-serif text-[10px] italic text-[#5A6672]">
          (In thousands, except share and per share data)
        </span>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-[#C9D3DD]">
            <th />
            <th className="py-1 text-right text-[10px] font-semibold text-[#1B2733]">
              September 30, {periods[0].replace(/\D/g, "")}
            </th>
            <th className="py-1 pl-3 text-right text-[10px] font-semibold text-[#1B2733]">
              September 30, {periods[1].replace(/\D/g, "")}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const mark = marks[item.id];
            const number = commentNumber.get(item.id);
            const isResolved = resolvedIds.includes(item.id);
            const focused = item.id === focusId;
            const linked = item.id === hoveredId;

            return (
              <tr
                key={item.id}
                ref={focused ? focusRef : undefined}
                onMouseEnter={() => onHover(item.id)}
                onMouseLeave={() => onHover(null)}
                onClick={() => onLineClick(item.id)}
                className={cn(
                  "cursor-pointer border-b border-[#F1F4F7] transition-colors",
                  item.isSubtotal && "border-t border-[#C9D3DD]",
                  linked && "bg-[rgba(70,100,220,0.07)]",
                  focused && "bg-[rgba(245,196,49,0.20)]"
                )}
              >
                <td
                  className={cn(
                    "py-[3px] pr-2 text-[10px] text-[#1B2733]",
                    item.level === 1 && "pl-3 text-[#5A6672]",
                    item.isSubtotal && "font-semibold"
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {item.account}
                    {mark === "tick" && <Check className="h-3 w-3 text-[#179864]" strokeWidth={3} />}
                    {mark === "cross" && <X className="h-3 w-3 text-[#DC2626]" strokeWidth={3} />}
                  </span>
                </td>

                <td className="relative py-[3px] text-right font-mono text-[10px] tabular-nums text-[#1B2733]">
                  <span className={cn(item.isSubtotal && "font-semibold")}>
                    {formatValue(value(item), item.unit)}
                  </span>
                  {number !== undefined && (
                    <span
                      title={item.explanation}
                      className={cn(
                        "ml-1 inline-flex h-3.5 w-3.5 -translate-y-0.5 items-center justify-center rounded-full align-middle text-[8px] font-semibold text-white",
                        isResolved ? "bg-[#179864]" : "bg-critical",
                        focused && "ring-2 ring-[#E0A800]"
                      )}
                    >
                      {isResolved ? <Check className="h-2 w-2" strokeWidth={4} /> : number}
                    </span>
                  )}
                </td>

                <td className="py-[3px] pl-3 text-right font-mono text-[10px] tabular-nums text-[#7C8794]">
                  {formatValue(prior(item), item.unit)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="mt-5 flex items-center justify-between border-t border-[#EEF1F5] pt-2 text-[8px] text-[#9AA5B1]">
        <span>{variant === "working" ? project.docB.fileName : project.docA.fileName}</span>
        <span>1</span>
      </div>
    </div>
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
