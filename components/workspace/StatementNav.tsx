"use client";

import * as React from "react";
import {
  AlignLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  FileText,
  Scale,
  Search,
  Sigma,
} from "lucide-react";

import { Progress, Tag } from "@/components/element";
import { STATEMENTS } from "@/lib/mock";
import { countByStatus, statementProgress } from "@/lib/derive";
import { useActiveProject, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { StatementMeta } from "@/lib/types";

/** One icon per group, because a filing has kinds of section, not kinds of line. */
const ICON: Record<string, React.ElementType> = {
  Statements: Scale,
  Checks: Sigma,
  Notes: FileText,
  Narrative: AlignLeft,
  "Front matter": BookOpen,
};

const GROUP_ORDER = ["Statements", "Checks", "Notes", "Narrative", "Front matter"];

/**
 * Where the reviewer is in the filing.
 *
 * A reconciliation used to be three statements and the nav could afford a card
 * apiece. A real one runs to dozens of sections, so the list groups them the
 * way the filing is organised, collapses the groups that are done, and offers
 * a filter — the reviewer should never scroll to find a note by name.
 */
export function StatementNav() {
  const project = useActiveProject();
  const statement = useStore((s) => s.statement);
  const setStatement = useStore((s) => s.setStatement);
  const setFilters = useStore((s) => s.setFilters);
  const counts = countByStatus(project.items);
  const [query, setQuery] = React.useState("");
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  const sections = React.useMemo(() => {
    const inRun = project.statements
      .map((id) => STATEMENTS.find((s) => s.id === id))
      .filter((s): s is StatementMeta => Boolean(s));
    const needle = query.trim().toLowerCase();
    return needle ? inRun.filter((s) => s.label.toLowerCase().includes(needle)) : inRun;
  }, [project.statements, query]);

  const groups = GROUP_ORDER.map((group) => ({
    group,
    sections: sections.filter((s) => s.group === group),
  })).filter((g) => g.sections.length > 0);

  /* the section carrying the most undecided lines — what to open next */
  const heaviest = sections
    .map((s) => ({ meta: s, progress: statementProgress(project.items, s.id) }))
    .sort((a, b) => b.progress.unresolved - a.progress.unresolved)[0];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 px-3 pb-2 pt-3">
        <div className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1.5">
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Filter ${project.statements.length} sections`}
            className="w-full bg-transparent text-body-sm placeholder:text-muted-foreground/70 focus:outline-none"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin px-3 pb-3">
        {groups.length === 0 && (
          <p className="px-1 py-6 text-center text-helper text-muted-foreground">
            No section matches that.
          </p>
        )}

        {groups.map(({ group, sections: inGroup }) => {
          const Icon = ICON[group] ?? FileText;
          const openInGroup = inGroup.reduce(
            (n, s) => n + statementProgress(project.items, s.id).unresolved,
            0
          );
          const shut = collapsed[group];

          return (
            <section key={group} className="pt-1.5">
              <button
                type="button"
                onClick={() => setCollapsed((c) => ({ ...c, [group]: !c[group] }))}
                className="flex w-full items-center gap-1.5 rounded px-1 py-1 text-left transition-colors duration-fast hover:bg-surface-secondary"
              >
                <ChevronRight
                  className={cn(
                    "h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-fast",
                    !shut && "rotate-90"
                  )}
                />
                <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="text-meta font-semibold uppercase tracking-wider text-muted-foreground">
                  {group}
                </span>
                <span className="tabular ml-auto font-mono text-meta text-muted-foreground">
                  {openInGroup > 0 ? `${openInGroup} open` : "clear"}
                </span>
              </button>

              {!shut && (
                <div className="flex flex-col gap-0.5 pt-0.5">
                  {inGroup.map((meta) => {
                    const progress = statementProgress(project.items, meta.id);
                    const active = statement === meta.id;
                    const done = progress.unresolved === 0 && progress.reviewed === progress.total;

                    return (
                      <button
                        key={meta.id}
                        type="button"
                        onClick={() => setStatement(meta.id)}
                        title={`${meta.label} · page ${meta.page}`}
                        className={cn(
                          "flex flex-col gap-1 rounded-md border px-2 py-1.5 text-left transition-colors duration-fast",
                          active
                            ? "border-brand/30 bg-[rgba(70,100,220,0.06)]"
                            : "border-transparent hover:bg-surface-secondary"
                        )}
                      >
                        <span className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              "truncate text-body-sm",
                              active ? "font-medium text-foreground" : "text-foreground"
                            )}
                          >
                            {meta.label}
                          </span>
                          {progress.unresolved > 0 ? (
                            <Tag variant="warning" className="ml-auto shrink-0">
                              {progress.unresolved}
                            </Tag>
                          ) : done ? (
                            <CheckCircle2 className="ml-auto h-3.5 w-3.5 shrink-0 text-success" />
                          ) : null}
                        </span>

                        {active && (
                          <span className="flex flex-col gap-1">
                            <span className="flex items-center justify-between">
                              <span className="tabular font-mono text-meta text-muted-foreground">
                                {progress.reviewed} / {progress.total} reviewed
                              </span>
                              <span className="tabular font-mono text-meta text-muted-foreground">
                                p.{meta.page}
                              </span>
                            </span>
                            <Progress
                              value={progress.pct}
                              size="sm"
                              tone={progress.pct === 100 ? "success" : "brand"}
                            />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      <div className="shrink-0 border-t border-border-subtle px-3 py-3">
        <p className="px-1 pb-2 text-meta font-semibold uppercase tracking-wider text-muted-foreground">
          Across the run
        </p>
        <div className="flex flex-col gap-0.5">
          <NavStat
            label="Unresolved mismatches"
            value={counts.mismatched ?? 0}
            tone="critical"
            onClick={() => setFilters({ status: "mismatched" })}
          />
          <NavStat
            label="Needs review"
            value={counts.needs_review ?? 0}
            tone="warning"
            onClick={() => setFilters({ status: "needs_review" })}
          />
          <NavStat
            label="Approved"
            value={counts.approved ?? 0}
            tone="success"
            onClick={() => setFilters({ status: "approved" })}
          />
          <NavStat
            label="Edited"
            value={counts.edited ?? 0}
            tone="violet"
            onClick={() => setFilters({ status: "edited" })}
          />
        </div>

        {heaviest && heaviest.progress.unresolved > 0 && (
          <button
            type="button"
            onClick={() => setStatement(heaviest.meta.id)}
            className="mt-2 flex w-full items-start gap-2 rounded-lg bg-surface-secondary p-2.5 text-left transition-colors duration-fast hover:bg-foreground/[0.06]"
          >
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-warning" />
            <span className="text-meta text-muted-foreground">
              <span className="font-medium text-foreground">{heaviest.meta.label}</span> carries the
              most undecided lines — {heaviest.progress.unresolved} of {heaviest.progress.total}.
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

function NavStat({
  label,
  value,
  tone,
  onClick,
}: {
  label: string;
  value: number;
  tone: "critical" | "warning" | "success" | "violet";
  onClick: () => void;
}) {
  const color = {
    critical: "#DC2626",
    warning: "#F59E0B",
    success: "#179864",
    violet: "#8B5CF6",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-md px-1 py-1.5 text-left transition-colors duration-fast hover:bg-surface-secondary"
    >
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
      <span className="truncate text-body-sm text-muted-foreground">{label}</span>
      <span className="tabular ml-auto font-mono text-body-sm">{value}</span>
    </button>
  );
}
