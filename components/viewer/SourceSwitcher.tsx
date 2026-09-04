"use client";

import * as React from "react";
import {
  ArrowRight,
  Check,
  ChevronsUpDown,
  FileSpreadsheet,
  FileText,
  Search,
} from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/element";
import { GAP_INK } from "@/lib/issues";
import { cn } from "@/lib/utils";
import type { DocumentMeta } from "@/lib/types";

/**
 * One source, out of however many.
 *
 * A reconciliation grows sources the way a matter grows attachments — the pair
 * the run started with, a prior-year filing someone pulled, a trial balance, a
 * board pack — and a tab strip answers that growth by shrinking every label and
 * hiding the tail behind arrows. Two things break at once: the reviewer can no
 * longer read a name, and the source they want is the one off-screen.
 *
 * So this is not a strip. It is one control of fixed width — the source on
 * screen, and a click to every other — and the list it opens is ordered by what
 * the reviewer is looking at rather than by upload order. When a comment has
 * focus, the sources that disagree on that line sit at the top under their own
 * heading, because "which document is out" is the only question being asked at
 * that moment. Everything else follows, heaviest first.
 */
export function SourceSwitcher({
  documents,
  activeId,
  onSelect,
  openOf,
  unsettled = 0,
  implicatedIds = [],
  focusTitle,
  onOpenChange,
  className,
}: {
  documents: DocumentMeta[];
  activeId: string;
  onSelect: (id: string) => void;
  /** Open findings against a source, on the page being reviewed. */
  openOf: (docId: string) => number;
  /**
   * Lines on this page no source settled. Reported once rather than per row:
   * a gap indicts every source equally, so a badge on each is the same number
   * five times over.
   */
  unsettled?: number;
  /** Sources the focused comment says are out — ranked to the top. */
  implicatedIds?: string[];
  /** The focused comment's heading, so the section can name what it ranks by. */
  focusTitle?: string;
  /** Lets the viewer's shortcuts stand aside while the list is open. */
  onOpenChange?: (open: boolean) => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [cursor, setCursor] = React.useState(0);

  const active = documents.find((d) => d.id === activeId) ?? documents[0];
  const activeIndex = documents.findIndex((d) => d.id === active?.id);
  const searchable = documents.length > 6;

  const matches = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return documents;
    return documents.filter(
      (d) => d.label.toLowerCase().includes(needle) || d.fileName.toLowerCase().includes(needle)
    );
  }, [documents, query]);

  /* the focused comment's outliers first, then whatever carries the most open
     findings — upload order is the one ordering that helps nobody */
  const implicated = matches.filter((d) => implicatedIds.includes(d.id));
  const rest = matches
    .filter((d) => !implicatedIds.includes(d.id))
    .sort((a, b) => openOf(b.id) - openOf(a.id));
  const ordered = [...implicated, ...rest];

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    const at = ordered.findIndex((d) => d.id === activeId);
    setCursor(at < 0 ? 0 : at);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(0, ordered.length - 1)));
  }, [ordered.length]);

  const commit = (id: string) => {
    onSelect(id);
    setOpen(false);
    onOpenChange?.(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!ordered.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (c + 1) % ordered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c - 1 + ordered.length) % ordered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = ordered[cursor];
      if (pick) commit(pick.id);
    }
  };

  const activeOpen = openOf(active?.id ?? "");
  /* sources, not findings: one split reading implicates several documents, so
     summing the badges would report more findings than the page has */
  const elsewhere = documents.filter((d) => d.id !== active?.id && openOf(d.id) > 0).length;

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          onOpenChange?.(next);
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Source shown: ${active?.label}. Change source.`}
            className={cn(
              "inline-flex h-8 w-[236px] shrink-0 items-center gap-1.5 rounded-md border px-2 text-left transition-colors duration-fast",
              open
                ? "border-brand/50 bg-[rgba(70,100,220,0.06)]"
                : "border-border hover:bg-surface-secondary",
              className
            )}
          >
            <SourceIcon kind={active?.kind} />
            <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
              {active?.label}
            </span>
            <OpenBadge count={activeOpen} />
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-[332px] p-0" onKeyDown={onKeyDown}>
          <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-2">
            <span className="text-meta font-semibold uppercase tracking-wider text-muted-foreground">
              Read against
            </span>
            <span className="tabular ml-auto font-mono text-meta text-muted-foreground">
              {documents.length} sources
            </span>
          </div>

          {searchable && (
            <div className="flex items-center gap-1.5 border-b border-border-subtle px-3 py-1.5">
              <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCursor(0);
                }}
                placeholder="Filter by name or file"
                className="w-full bg-transparent text-body-sm placeholder:text-muted-foreground/70 focus:outline-none"
              />
            </div>
          )}

          <div className="max-h-[320px] overflow-auto scrollbar-thin p-1.5">
            {ordered.length === 0 && (
              <p className="px-2 py-6 text-center text-helper text-muted-foreground">
                No source matches that.
              </p>
            )}

            {implicated.length > 0 && (
              <SectionLabel>{focusTitle ? `Out on ${focusTitle}` : "Out on this line"}</SectionLabel>
            )}

            {ordered.map((doc, i) => (
              <React.Fragment key={doc.id}>
                {implicated.length > 0 && i === implicated.length && (
                  <SectionLabel className="mt-1.5">Every source</SectionLabel>
                )}
                <SourceRow
                  doc={doc}
                  open={openOf(doc.id)}
                  active={doc.id === activeId}
                  cursored={i === cursor}
                  flagged={implicatedIds.includes(doc.id)}
                  onHover={() => setCursor(i)}
                  onSelect={() => commit(doc.id)}
                />
              </React.Fragment>
            ))}
          </div>

          <div className="flex flex-col gap-1 border-t border-border-subtle px-3 py-1.5 text-meta text-muted-foreground">
            {unsettled > 0 && (
              <span
                className="inline-flex items-center gap-1.5"
                style={{ color: GAP_INK.strong }}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full border border-dashed"
                  style={{ borderColor: GAP_INK.edge }}
                />
                {unsettled} {unsettled === 1 ? "line" : "lines"} on this page no source settled
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Kbd>[</Kbd>
              <Kbd>]</Kbd>
              step through sources without opening this
            </span>
          </div>
        </PopoverContent>
      </Popover>

      {/* the count a strip spends its whole width proving */}
      <span className="tabular shrink-0 font-mono text-meta text-muted-foreground">
        {activeIndex + 1}/{documents.length}
        {elsewhere > 0 && (
          <span className="ml-1 text-critical">
            · {elsewhere} {elsewhere === 1 ? "other is" : "others are"} out
          </span>
        )}
      </span>
    </>
  );
}

function SourceRow({
  doc,
  open,
  active,
  cursored,
  flagged,
  onHover,
  onSelect,
}: {
  doc: DocumentMeta;
  open: number;
  active: boolean;
  cursored: boolean;
  flagged: boolean;
  onHover: () => void;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onMouseMove={onHover}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-fast",
        cursored && !active && "bg-surface-secondary",
        active && "bg-[rgba(70,100,220,0.08)]"
      )}
    >
      <SourceIcon kind={doc.kind} />

      <span className="flex min-w-0 flex-1 flex-col">
        <span
          className={cn(
            "truncate text-body-sm",
            active ? "font-medium text-[#2F45A8]" : "text-foreground"
          )}
        >
          {doc.label}
        </span>
        <span className="truncate font-mono text-meta text-muted-foreground">
          {doc.fileName}
          {doc.pages ? ` · ${doc.pages}pp` : ""}
          {doc.sheets ? ` · ${doc.sheets.length} sheets` : ""}
        </span>
      </span>

      {flagged && !active && <ArrowRight className="h-3 w-3 shrink-0 text-critical" />}
      <OpenBadge count={open} clean />
      {active && <Check className="h-3.5 w-3.5 shrink-0 text-[#2F45A8]" strokeWidth={3} />}
    </button>
  );
}

/** What this source is still out on. A source nothing is open against says so. */
function OpenBadge({ count, clean = false }: { count: number; clean?: boolean }) {
  if (count <= 0) {
    return clean ? <span className="shrink-0 text-meta text-muted-foreground">agrees</span> : null;
  }
  return (
    <span
      title={`${count} open ${count === 1 ? "finding" : "findings"} against this source`}
      className="tabular flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-critical px-1 font-mono text-[10px] text-white"
    >
      {count}
    </span>
  );
}

function SourceIcon({ kind }: { kind?: DocumentMeta["kind"] }) {
  return kind === "xlsx" ? (
    <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-[#179864]" />
  ) : (
    <FileText className="h-3.5 w-3.5 shrink-0 text-[#DC2626]" />
  );
}

function SectionLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "truncate px-2 pb-1 pt-0.5 text-meta font-semibold uppercase tracking-wider text-muted-foreground",
        className
      )}
    >
      {children}
    </p>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="rounded border border-border bg-surface-secondary px-1 font-mono">
      {children}
    </kbd>
  );
}
