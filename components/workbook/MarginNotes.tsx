"use client";

import * as React from "react";

import { CommentCard } from "@/components/viewer/CommentCard";
import { SHAPE_META, type Issue } from "@/lib/issues";
import type { Disposition } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";

const GAP = 8;
/** Used until a card has been measured — close enough that nothing jumps far. */
const ASSUMED_HEIGHT = 54;

/**
 * Comments in the page margin, the way a document editor places them: each one
 * sits beside the line it annotates and scrolls with the page. Where two
 * anchors are too close for both cards to fit, the lower one slides down —
 * order is never traded away to keep a card exactly level with its line.
 *
 * Only the open card shows its full working; the rest stay two lines tall, so
 * a page of twenty findings is still a page you can read down.
 */
export function MarginNotes({
  issues,
  project,
  dispositions,
  issueNumber,
  pageRef,
  scale,
  statement,
  activeId,
  onSelect,
}: {
  issues: Issue[];
  project: Project;
  dispositions: Record<string, Disposition>;
  issueNumber: Map<string, number>;
  pageRef: React.MutableRefObject<HTMLDivElement | null>;
  scale: number;
  statement: string;
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  const columnRef = React.useRef<HTMLDivElement | null>(null);
  const cardRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  const [anchors, setAnchors] = React.useState<Record<string, number>>({});
  const [heights, setHeights] = React.useState<Record<string, number>>({});

  /* where each comment's line sits, measured against the column's own top so
     the number holds however far the frame is scrolled */
  React.useLayoutEffect(() => {
    const page = pageRef.current;
    const column = columnRef.current;
    if (!page || !column) return;

    const measure = () => {
      const base = column.getBoundingClientRect().top;
      const next: Record<string, number> = {};
      page.querySelectorAll<HTMLElement>("[data-issue-anchor]").forEach((el) => {
        const id = el.dataset.issueAnchor;
        if (id) next[id] = Math.max(0, el.getBoundingClientRect().top - base);
      });
      setAnchors((current) => (same(current, next) ? current : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(page);
    return () => observer.disconnect();
  }, [pageRef, scale, statement, issues]);

  /* card heights, so the stack knows what it is stacking */
  React.useLayoutEffect(() => {
    const measure = () => {
      const next: Record<string, number> = {};
      Object.entries(cardRefs.current).forEach(([id, el]) => {
        if (el) next[id] = el.offsetHeight;
      });
      setHeights((current) => (same(current, next) ? current : next));
    };

    measure();
    const observer = new ResizeObserver(measure);
    Object.values(cardRefs.current).forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [issues, activeId, anchors]);

  /*
   * The open card is pinned level with its own line — that is the one you are
   * reading, so that is the one that has to line up. Everything else is pushed
   * away from it, up or down, only as far as it takes to stop cards overlapping.
   * Where anchors are tighter than the cards are tall, the stack spreads; the
   * alternative is comments sitting on top of one another.
   */
  const layout = React.useMemo(() => {
    const ordered = [...issues].sort((a, b) => (anchors[a.id] ?? 0) - (anchors[b.id] ?? 0));
    const height = (id: string) => heights[id] ?? ASSUMED_HEIGHT;
    const tops: Record<string, number> = {};

    const pivot = Math.max(
      0,
      ordered.findIndex((i) => i.id === activeId)
    );

    tops[ordered[pivot]?.id ?? ""] = anchors[ordered[pivot]?.id ?? ""] ?? 0;

    /* upwards from the open card */
    for (let i = pivot - 1; i >= 0; i--) {
      const below = ordered[i + 1];
      const ceiling = tops[below.id] - height(ordered[i].id) - GAP;
      tops[ordered[i].id] = Math.min(anchors[ordered[i].id] ?? ceiling, ceiling);
    }

    /* downwards from it */
    for (let i = pivot + 1; i < ordered.length; i++) {
      const above = ordered[i - 1];
      const floor = tops[above.id] + height(above.id) + GAP;
      tops[ordered[i].id] = Math.max(anchors[ordered[i].id] ?? floor, floor);
    }

    /* nothing may sit above the top of the page */
    const lift = Math.min(0, ...Object.values(tops));
    if (lift < 0) Object.keys(tops).forEach((id) => (tops[id] -= lift));

    const last = ordered[ordered.length - 1];
    return { tops, height: last ? tops[last.id] + height(last.id) : 0 };
  }, [issues, anchors, heights, activeId]);

  return (
    <div ref={columnRef} className="relative" style={{ height: layout.height || undefined }}>
      {issues.map((issue) => {
        const open = activeId === issue.id;
        return (
          <div
            key={issue.id}
            ref={(el) => {
              cardRefs.current[issue.id] = el;
            }}
            style={{ top: layout.tops[issue.id] ?? 0 }}
            className={cn(
              "absolute inset-x-0 transition-[top] duration-standard ease-out",
              open ? "z-10" : "z-0"
            )}
          >
            {open ? (
              <ul className={cn("m-0 list-none rounded-md p-0 shadow-card-hover")}>
                <CommentCard
                  mode="read"
                  issue={issue}
                  item={project.items.find((i) => i.id === issue.itemId)}
                  project={project}
                  number={issueNumber.get(issue.id) ?? 0}
                  disposition={dispositions[issue.id]}
                  focused
                  hovered={false}
                  onFocus={() => onSelect(issue.id)}
                  onHover={() => undefined}
                />
              </ul>
            ) : (
              <CollapsedNote
                issue={issue}
                number={issueNumber.get(issue.id) ?? 0}
                closed={dispositions[issue.id] !== undefined}
                onOpen={() => onSelect(issue.id)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CollapsedNote({
  issue,
  number,
  closed,
  onOpen,
}: {
  issue: Issue;
  number: number;
  closed: boolean;
  onOpen: () => void;
}) {
  const outliers = issue.readings.filter((r) => !r.agrees).map((r) => r.label);
  const shape =
    issue.shape === "single" && outliers.length === 1
      ? `${outliers[0]} is out`
      : SHAPE_META[issue.shape].label;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "w-full rounded-md border border-l-2 bg-surface px-3 py-2 text-left shadow-[0_1px_2px_rgba(10,37,64,0.05)] transition-shadow duration-fast hover:shadow-card-hover",
        closed ? "border-l-border-strong opacity-70 hover:opacity-100" : "border-l-critical",
        "border-border-subtle"
      )}
    >
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "flex h-[18px] w-[18px] shrink-0 translate-y-0.5 items-center justify-center rounded-full text-[10px] font-semibold text-white",
            closed ? "bg-[#94A3B8]" : "bg-critical"
          )}
        >
          {number}
        </span>
        <span className="min-w-0 flex-1 truncate text-body-sm font-medium">{issue.title}</span>
      </div>
      <p className="truncate pl-[26px] text-meta text-muted-foreground">
        {shape} · {issue.confidence}%
      </p>
    </button>
  );
}

function same(a: Record<string, number>, b: Record<string, number>) {
  const keys = Object.keys(b);
  if (keys.length !== Object.keys(a).length) return false;
  return keys.every((k) => Math.abs((a[k] ?? -1) - b[k]) < 1);
}
