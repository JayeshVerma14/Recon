"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, FileBarChart, Scale, Waves } from "lucide-react";

import { Progress, Tag } from "@/components/element";
import { STATEMENTS } from "@/lib/mock";
import { countByStatus, statementProgress } from "@/lib/derive";
import { useActiveProject, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { StatementId } from "@/lib/types";

const ICON: Record<StatementId, React.ElementType> = {
  income: FileBarChart,
  balance: Scale,
  cashflow: Waves,
};

export function StatementNav() {
  const project = useActiveProject();
  const statement = useStore((s) => s.statement);
  const setStatement = useStore((s) => s.setStatement);
  const setFilters = useStore((s) => s.setFilters);
  const counts = countByStatus(project.items);

  return (
    <div className="flex h-full flex-col overflow-y-auto scrollbar-thin">
      <div className="px-3 py-3">
        <p className="px-1 pb-2 text-meta font-semibold uppercase tracking-wider text-muted-foreground">
          Statements
        </p>
        <div className="flex flex-col gap-1">
          {project.statements.map((id) => {
            const meta = STATEMENTS.find((s) => s.id === id)!;
            const progress = statementProgress(project.items, id);
            const Icon = ICON[id];
            const active = statement === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => setStatement(id)}
                className={cn(
                  "flex flex-col gap-2 rounded-lg border p-2.5 text-left transition-colors duration-fast",
                  active
                    ? "border-brand/30 bg-[rgba(70,100,220,0.06)]"
                    : "border-transparent hover:bg-surface-secondary"
                )}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={cn("h-3.5 w-3.5 shrink-0", active ? "text-brand" : "text-muted-foreground")}
                  />
                  <span
                    className={cn(
                      "truncate text-body-sm",
                      active ? "font-medium text-foreground" : "text-foreground"
                    )}
                  >
                    {meta.label}
                  </span>
                  {progress.unresolved > 0 && (
                    <Tag variant="warning" className="ml-auto shrink-0">
                      {progress.unresolved}
                    </Tag>
                  )}
                  {progress.unresolved === 0 && progress.reviewed === progress.total && (
                    <CheckCircle2 className="ml-auto h-3.5 w-3.5 shrink-0 text-success" />
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="tabular font-mono text-meta text-muted-foreground">
                      {progress.reviewed} / {progress.total} reviewed
                    </span>
                    <span className="tabular font-mono text-meta text-muted-foreground">
                      {Math.round(progress.pct)}%
                    </span>
                  </div>
                  <Progress
                    value={progress.pct}
                    size="sm"
                    tone={progress.pct === 100 ? "success" : active ? "brand" : "neutral"}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-border-subtle px-3 py-3">
        <p className="px-1 pb-2 text-meta font-semibold uppercase tracking-wider text-muted-foreground">
          Across the project
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
      </div>

      <div className="mt-auto border-t border-border-subtle p-3">
        <div className="flex items-start gap-2 rounded-lg bg-surface-secondary p-2.5">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" />
          <p className="text-meta text-muted-foreground">
            Cash at end of period in Document B does not tie to the balance sheet. Resolve before
            signing off.
          </p>
        </div>
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
