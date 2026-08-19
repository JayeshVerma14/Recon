"use client";

import * as React from "react";
import Link from "next/link";
import {
  FileText,
  Grid2x2,
  PenLine,
  Plus,
  Sheet as SheetIcon,
  Table2,
  Trash2,
} from "lucide-react";

import { Grid, type Selection } from "@/components/workbook/Grid";
import { ReconciliationReport } from "@/components/workbook/ReconciliationReport";
import { ExportMenu } from "@/components/app/ExportMenu";
import { ReviewStatusTag } from "@/components/app/StatusPills";
import { Button, Progress, Tag, useToast } from "@/components/element";
import { buildWorkbook, cellRef, type Cell, type Sheet } from "@/lib/workbook";
import { countByStatus, projectProgress, relativeTime } from "@/lib/derive";
import { NOW, statementLabel } from "@/lib/mock";
import { useStore } from "@/lib/store";
import { buildIssues } from "@/lib/issues";
import { cn } from "@/lib/utils";
import type { Project } from "@/lib/types";

export function Workbook({
  project,
  onOpenSource,
}: {
  project: Project;
  onOpenSource: (itemId: string | null) => void;
}) {
  const reports = useStore((s) => s.reports);
  const [tab, setTab] = React.useState<"workbook" | "reports">("reports");

  const generated = React.useMemo(() => buildWorkbook(project), [project]);
  const [overrides, setOverrides] = React.useState<Record<string, string>>({});
  const [extraSheets, setExtraSheets] = React.useState<Sheet[]>([]);
  const [removed, setRemoved] = React.useState<string[]>([]);

  const sheets = React.useMemo(
    () => [...generated, ...extraSheets].filter((s) => !removed.includes(s.id)),
    [generated, extraSheets, removed]
  );

  const [activeId, setActiveId] = React.useState(sheets[0]?.id ?? "toc");
  const active = sheets.find((s) => s.id === activeId) ?? sheets[0];
  const [selection, setSelection] = React.useState<Selection | null>({ row: 2, col: 1 });
  const [draft, setDraft] = React.useState("");

  const projectReports = reports.filter((r) => r.projectId === project.id);
  const dispositions = useStore((s) => s.commentDisposition);
  const openComments = React.useMemo(
    () => buildIssues(project).filter((i) => dispositions[i.id] === undefined).length,
    [project, dispositions]
  );

  const cellValue = (sel: Selection | null): string => {
    if (!sel || !active) return "";
    const key = `${active.id}:${sel.row}:${sel.col}`;
    if (overrides[key] !== undefined) return overrides[key];
    const row = active.rows[sel.row];
    if (!row) return "";
    if (row.length === 1 && row[0].span) return sel.col === 0 ? row[0].v : "";
    return row[sel.col]?.v ?? "";
  };

  React.useEffect(() => {
    setDraft(cellValue(selection));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, activeId, overrides]);

  const renderSheet: Sheet | undefined = React.useMemo(() => {
    if (!active) return undefined;
    const prefix = `${active.id}:`;
    const keys = Object.keys(overrides).filter((k) => k.startsWith(prefix));
    if (!keys.length) return active;
    const rows = active.rows.map((row) => row.map((c) => ({ ...c })));
    keys.forEach((key) => {
      const [, r, c] = key.split(":");
      const row = rows[Number(r)];
      if (row?.[Number(c)]) row[Number(c)] = { ...row[Number(c)], v: overrides[key] };
    });
    return { ...active, rows };
  }, [active, overrides]);

  const commit = () => {
    if (!selection || !active) return;
    setOverrides((o) => ({ ...o, [`${active.id}:${selection.row}:${selection.col}`]: draft }));
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_1px_2px_rgba(10,37,64,0.04)]">
      {/* ------------------------------- card head ------------------------------- */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-1">
          <TabButton
            active={tab === "reports"}
            onClick={() => setTab("reports")}
            icon={<FileText />}
            badge={openComments}
          >
            Report
          </TabButton>
          <TabButton active={tab === "workbook"} onClick={() => setTab("workbook")} icon={<Table2 />}>
            Workbook
          </TabButton>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <ExportMenu scopeLabel={`Export ${project.name}`} />
        </div>
      </div>

      {tab === "workbook" && active && renderSheet ? (
        <>
          {/* ------------------------------ formula bar ----------------------------- */}
          <div className="flex shrink-0 items-center gap-2 px-4 pb-3">
            <input
              readOnly
              value={selection ? cellRef(selection.col, selection.row) : ""}
              aria-label="Cell reference"
              placeholder="Cell"
              className="h-9 w-[110px] rounded-lg border border-border bg-surface px-3 text-body-sm text-muted-foreground"
            />
            <span className="flex h-9 w-11 items-center justify-center rounded-lg border border-border bg-surface font-mono text-body-sm italic text-muted-foreground">
              fx
            </span>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") setDraft(cellValue(selection));
              }}
              onBlur={commit}
              placeholder="Enter value or formula"
              aria-label="Cell value"
              className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 text-body text-foreground placeholder:text-muted-foreground/70 focus:border-brand/50"
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col border-t border-[#D7DDE5]">
            <Grid
              sheet={renderSheet}
              selection={selection}
              onSelect={setSelection}
              onOpenSource={onOpenSource}
            />
          </div>

          {/* ------------------------------ sheet tabs ------------------------------ */}
          <div className="flex shrink-0 items-center gap-0.5 overflow-x-auto scrollbar-thin border-t border-border bg-surface-secondary/60 px-2 py-1.5">
            {sheets.map((sheet) => {
              const isActive = sheet.id === activeId;
              return (
                <button
                  key={sheet.id}
                  type="button"
                  onClick={() => {
                    setActiveId(sheet.id);
                    setSelection({ row: 1, col: 0 });
                  }}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-body-sm transition-colors duration-fast",
                    isActive
                      ? "bg-[rgba(70,100,220,0.10)] font-medium text-[#2F45A8]"
                      : "text-muted-foreground hover:bg-surface-secondary hover:text-foreground"
                  )}
                >
                  <Grid2x2 className="h-3.5 w-3.5" />
                  {sheet.name}
                </button>
              );
            })}

            <div className="ml-1 flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                aria-label="Add sheet"
                onClick={() => {
                  const id = `sheet-${extraSheets.length + 1}`;
                  setExtraSheets((s) => [
                    ...s,
                    {
                      id,
                      name: `Sheet${s.length + 1}`,
                      type: "Blank",
                      description: "Empty working tab",
                      widths: [220, 160, 160, 160, 160],
                      rows: Array.from({ length: 24 }, () =>
                        Array.from({ length: 5 }, () => ({ v: "" }) as Cell)
                      ),
                    },
                  ]);
                  setActiveId(id);
                }}
                className="rounded-md p-1.5 text-muted-foreground transition-colors duration-fast hover:bg-surface-secondary hover:text-foreground"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Delete sheet"
                disabled={activeId === "toc"}
                onClick={() => {
                  setRemoved((r) => [...r, activeId]);
                  setActiveId("toc");
                }}
                className="rounded-md p-1.5 text-muted-foreground transition-colors duration-fast hover:bg-surface-secondary hover:text-foreground disabled:opacity-40"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </>
      ) : (
        <ReconciliationReport project={project} onOpenReview={onOpenSource} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  badge,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  badge?: number;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-body font-medium transition-colors duration-fast [&_svg]:size-4",
        active
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:bg-surface-secondary hover:text-foreground"
      )}
    >
      {icon}
      {children}
      {badge !== undefined && badge > 0 && (
        <span
          className={cn(
            "tabular flex h-5 min-w-5 items-center justify-center rounded-full px-1 font-mono text-meta",
            active ? "bg-background/20 text-background" : "bg-brand text-white"
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function ReportsTab({ project }: { project: Project }) {
  const toast = useToast();
  const reports = useStore((s) => s.reports).filter((r) => r.projectId === project.id);
  const counts = countByStatus(project.items);
  const progress = projectProgress(project.items);

  return (
    <div className="min-h-0 flex-1 overflow-auto scrollbar-thin border-t border-border p-4">
      <div className="flex flex-col gap-3">
        {reports.map((report) => (
          <div key={report.id} className="rounded-xl border border-border">
            <div className="flex flex-wrap items-start gap-3 border-b border-border-subtle p-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(70,100,220,0.10)] text-brand">
                <SheetIcon className="h-4 w-4" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link
                  href={`/reports/${report.id}`}
                  className="truncate text-body-lg font-medium tracking-tight transition-colors duration-fast hover:text-brand"
                >
                  {report.title}
                </Link>
                <p className="text-helper text-muted-foreground">
                  {project.entity} · {project.period} · updated {relativeTime(report.updatedAt, NOW)}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {report.sections
                    .filter((s) => s.included)
                    .map((s) => (
                      <Tag key={s.id} variant="neutral">
                        {statementLabel(s.id).replace(" Statement", "")}
                      </Tag>
                    ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="brandOutline" size="sm" asChild>
                  <Link href={`/reports/${report.id}`}>Open report</Link>
                </Button>
                <Button variant="ghost" size="sm" asChild>
                  <Link href={`/reports/${report.id}?edit=1`}>
                    <PenLine />
                    Edit
                  </Link>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-border-subtle md:grid-cols-5">
              <Stat label="Total items" value={project.items.length} />
              <Stat label="Matched" value={counts.matched ?? 0} tone="#179864" />
              <Stat label="Mismatched" value={counts.mismatched ?? 0} tone="#DC2626" />
              <Stat label="Needs review" value={counts.needs_review ?? 0} tone="#F59E0B" />
              <Stat label="Approved" value={counts.approved ?? 0} tone="#4664DC" />
            </div>

            <div className="flex flex-col gap-1.5 border-t border-border-subtle p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-helper text-muted-foreground">Review completion</span>
                <span className="tabular font-mono text-body-sm">{progress.pct}%</span>
              </div>
              <Progress value={progress.pct} tone={progress.pct === 100 ? "success" : "brand"} />
            </div>
          </div>
        ))}

        <div className="rounded-xl border border-dashed border-border p-4">
          <p className="text-body-sm font-medium">Unresolved items carried into the report</p>
          <p className="mt-1 text-helper text-muted-foreground">
            {(counts.mismatched ?? 0) + (counts.needs_review ?? 0)} accounts still need a decision.
            They appear in the report flagged, not hidden.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {project.items
              .filter((i) => i.status === "mismatched" || i.status === "needs_review")
              .slice(0, 6)
              .map((item) => (
                <span
                  key={item.id}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border-subtle bg-surface-secondary px-2 py-1"
                >
                  <span className="text-helper">{item.account}</span>
                  <ReviewStatusTag status={item.status} />
                </span>
              ))}
          </div>
          <Button
            variant="brandSoft"
            size="sm"
            className="mt-3"
            onClick={() => toast("Report refreshed from the latest decisions", "info")}
          >
            Refresh report
          </Button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex flex-col gap-1 p-3">
      <span className="truncate text-meta uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="tabular font-mono text-body-lg" style={tone ? { color: tone } : undefined}>
        {value}
      </span>
    </div>
  );
}
