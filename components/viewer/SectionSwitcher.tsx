"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/element";
import { GAP_INK } from "@/lib/issues";
import { cn } from "@/lib/utils";
import type { StatementMeta } from "@/lib/types";

/** What a section still has open, told apart the way the marks are. */
export interface SectionLoad {
  /** Findings where the sources disagree. */
  errors: number;
  /** Lines no source could settle. */
  gaps: number;
  /** Lines in the section, whatever their state. */
  lines: number;
}

/**
 * Where in the filing the reviewer is.
 *
 * A reconciliation of a real 10-Q covers the statements, a dozen notes, the
 * MD&A, the narrative disclosures, the cover page and every footing check — 34
 * sections here. Drawn as tabs that is a strip nobody can read: the labels
 * shrink to nothing, most of them sit off-screen behind arrows, and the one
 * you want is always in the part you cannot see.
 *
 * So the strip is one control. It names the section you are on and how much of
 * the filing that is, and the list it opens is grouped the way the document is
 * organised, filterable by name, and ordered so the sections carrying open
 * findings are the ones you land on.
 */
export function SectionSwitcher({
  sections,
  activeId,
  onSelect,
  loadOf,
  className,
}: {
  sections: StatementMeta[];
  activeId: string;
  onSelect: (id: string) => void;
  loadOf: (sectionId: string) => SectionLoad;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [cursor, setCursor] = React.useState(0);

  const active = sections.find((s) => s.id === activeId) ?? sections[0];
  const activeIndex = sections.findIndex((s) => s.id === active?.id);

  const matches = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return sections;
    return sections.filter(
      (s) =>
        s.label.toLowerCase().includes(needle) ||
        s.group.toLowerCase().includes(needle) ||
        String(s.page).startsWith(needle)
    );
  }, [sections, query]);

  /* the filing's own order inside each group; the groups in reading order */
  const groups = React.useMemo(() => {
    const seen: string[] = [];
    matches.forEach((s) => {
      if (!seen.includes(s.group)) seen.push(s.group);
    });
    return seen.map((group) => ({ group, items: matches.filter((s) => s.group === group) }));
  }, [matches]);

  const flat = groups.flatMap((g) => g.items);

  React.useEffect(() => {
    if (!open) return;
    setQuery("");
    const at = flat.findIndex((s) => s.id === activeId);
    setCursor(at < 0 ? 0 : at);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    setCursor((c) => Math.min(c, Math.max(0, flat.length - 1)));
  }, [flat.length]);

  const commit = (id: string) => {
    onSelect(id);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!flat.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => (c + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => (c - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const pick = flat[cursor];
      if (pick) commit(pick.id);
    }
  };

  const load = loadOf(active?.id ?? "");
  const elsewhere = sections
    .filter((s) => s.id !== active?.id)
    .reduce((n, s) => n + loadOf(s.id).errors + loadOf(s.id).gaps, 0);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`Section: ${active?.label}. Change section.`}
            className={cn(
              "inline-flex h-8 w-[228px] shrink-0 items-center gap-1.5 rounded-md px-2 text-left transition-colors duration-fast",
              open ? "bg-white/20 text-white" : "text-white/85 hover:bg-white/10 hover:text-white",
              className
            )}
          >
            <span className="min-w-0 flex-1 truncate text-body-sm font-medium">
              {active?.label}
            </span>
            <Counts load={load} />
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
          </button>
        </PopoverTrigger>

        <PopoverContent align="start" className="w-[340px] p-0" onKeyDown={onKeyDown}>
          <div className="flex items-center gap-1.5 border-b border-border-subtle px-3 py-1.5">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCursor(0);
              }}
              placeholder={`Filter ${sections.length} sections`}
              className="w-full bg-transparent text-body-sm placeholder:text-muted-foreground/70 focus:outline-none"
            />
          </div>

          <div className="max-h-[380px] overflow-auto scrollbar-thin p-1.5">
            {flat.length === 0 && (
              <p className="px-2 py-6 text-center text-helper text-muted-foreground">
                No section matches that.
              </p>
            )}

            {groups.map(({ group, items }) => (
              <section key={group}>
                <p className="px-2 pb-1 pt-1.5 text-meta font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </p>
                {items.map((section) => {
                  const index = flat.indexOf(section);
                  const sectionLoad = loadOf(section.id);
                  const isActive = section.id === activeId;
                  return (
                    <button
                      key={section.id}
                      type="button"
                      onMouseMove={() => setCursor(index)}
                      onClick={() => commit(section.id)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors duration-fast",
                        index === cursor && !isActive && "bg-surface-secondary",
                        isActive && "bg-[rgba(70,100,220,0.08)]"
                      )}
                    >
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span
                          className={cn(
                            "truncate text-body-sm",
                            isActive ? "font-medium text-[#2F45A8]" : "text-foreground"
                          )}
                        >
                          {section.label}
                        </span>
                        <span className="truncate font-mono text-meta text-muted-foreground">
                          p.{section.page} · {sectionLoad.lines} lines
                          {section.period ? ` · ${section.period}` : ""}
                        </span>
                      </span>
                      <Counts load={sectionLoad} clean />
                      {isActive && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-[#2F45A8]" strokeWidth={3} />
                      )}
                    </button>
                  );
                })}
              </section>
            ))}
          </div>

          <div className="border-t border-border-subtle px-3 py-1.5 text-meta text-muted-foreground">
            {elsewhere > 0
              ? `${elsewhere} findings still open in other sections`
              : "Every other section is decided"}
          </div>
        </PopoverContent>
      </Popover>

      <span className="tabular hidden shrink-0 font-mono text-meta text-white/55 lg:inline">
        {activeIndex + 1}/{sections.length}
      </span>
    </div>
  );
}

/**
 * A section's remaining work. Disagreements and unverified lines never share a
 * badge: one says the document is wrong somewhere, the other says nobody
 * knows, and a reviewer plans a morning differently around each.
 */
function Counts({ load, clean = false }: { load: SectionLoad; clean?: boolean }) {
  if (load.errors <= 0 && load.gaps <= 0) {
    return clean ? <span className="shrink-0 text-meta text-muted-foreground">clear</span> : null;
  }
  return (
    <span className="flex shrink-0 items-center gap-1">
      {load.errors > 0 && (
        <span
          title={`${load.errors} open ${load.errors === 1 ? "finding" : "findings"}`}
          className="tabular flex h-4 min-w-4 items-center justify-center rounded-full bg-critical px-1 font-mono text-[10px] text-white"
        >
          {load.errors}
        </span>
      )}
      {load.gaps > 0 && (
        <span
          title={`${load.gaps} ${load.gaps === 1 ? "line" : "lines"} could not be verified`}
          className="tabular flex h-4 min-w-4 items-center justify-center rounded-full border border-dashed px-1 font-mono text-[10px]"
          style={{ borderColor: GAP_INK.edge, color: "#7FD3E8" }}
        >
          {load.gaps}
        </span>
      )}
    </span>
  );
}
