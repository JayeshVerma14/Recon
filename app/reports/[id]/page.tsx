"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  PenLine,
  Save,
} from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { GlobalActions, Topbar } from "@/components/app/Topbar";
import { ExportMenu } from "@/components/app/ExportMenu";
import { ReviewStatusTag } from "@/components/app/StatusPills";
import {
  AIConfidenceBadge,
  Avatar,
  Button,
  Card,
  Checkbox,
  EmptyState,
  Field,
  Input,
  NumberDisplay,
  Progress,
  Separator,
  Switch,
  Tag,
  Textarea,
  useToast,
} from "@/components/element";
import { NOW, statementLabel } from "@/lib/mock";
import {
  countByStatus,
  difference,
  effectiveValue,
  formatDifference,
  formatValue,
  projectProgress,
  relativeTime,
} from "@/lib/derive";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { LineItem, ReportSection } from "@/lib/types";

const ALL_COLUMNS = [
  "Account",
  "Document A",
  "Document B",
  "Difference",
  "Status",
  "Confidence",
  "Source",
  "Reviewer",
  "Note",
];

export default function ReportPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const toast = useToast();
  const reports = useStore((s) => s.reports);
  const projects = useStore((s) => s.projects);
  const updateReport = useStore((s) => s.updateReport);
  const moveSection = useStore((s) => s.moveSection);

  const report = reports.find((r) => r.id === params.id);
  const project = projects.find((p) => p.id === report?.projectId);

  const [editing, setEditing] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("edit=1")) setEditing(true);
  }, []);

  if (!report || !project) {
    return (
      <AppShell>
        <Topbar left={<span className="text-body font-medium">Report</span>} right={<GlobalActions />} />
        <EmptyState
          title="Report not found"
          description="It may have been archived."
          action={
            <Button variant="outline" onClick={() => router.push("/reports")}>
              Back to reports
            </Button>
          }
        />
      </AppShell>
    );
  }

  const includedSections = report.sections.filter((s) => s.included);
  const scopedItems = project.items.filter((i) =>
    includedSections.some((s) => s.id === i.statement && !s.hiddenAccounts.includes(i.id))
  );
  const counts = countByStatus(scopedItems);
  const progress = projectProgress(scopedItems);

  return (
    <AppShell>
      <Topbar
        left={
          <div className="flex min-w-0 items-center gap-3">
            <Button
              variant="ghost"
              size="iconSm"
              aria-label="Back to reports"
              onClick={() => router.push("/reports")}
            >
              <ArrowLeft />
            </Button>
            <span className="truncate text-body font-medium">{report.title}</span>
            {editing && <Tag variant="violet">Editing</Tag>}
          </div>
        }
        right={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/workspace/${project.id}`}>Open workspace</Link>
            </Button>
            {editing ? (
              <Button
                variant="brand"
                size="sm"
                onClick={() => {
                  setEditing(false);
                  toast("Report saved");
                }}
              >
                <Save />
                Save changes
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <PenLine />
                Edit report
              </Button>
            )}
            <ExportMenu scopeLabel={report.title} variant="brandSoft" />
            <GlobalActions showSearch={false} />
          </>
        }
      />

      <main id="main" className="flex-1 px-6 py-6 lg:px-10 lg:py-8">
        <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-5">
          {/* ------------------------------- masthead ------------------------------ */}
          <Card className="flex flex-col gap-4 p-5">
            {editing ? (
              <div className="flex flex-col gap-3">
                <Field label="Report title">
                  <Input
                    value={report.title}
                    onChange={(e) => updateReport(report.id, { title: e.target.value })}
                  />
                </Field>
                <Field label="Summary" hint="Appears at the top of every export.">
                  <Textarea
                    rows={2}
                    value={report.summary}
                    onChange={(e) => updateReport(report.id, { summary: e.target.value })}
                  />
                </Field>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <h1 className="text-h1 font-medium tracking-tight">{report.title}</h1>
                <p className="max-w-[72ch] text-body text-muted-foreground">{report.summary}</p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-helper text-muted-foreground">
              <Meta label="Entity" value={project.entity} />
              <Meta label="Period" value={project.period} />
              <Meta label="Source" value={project.docA.fileName} />
              <Meta label="Comparison" value={project.docB.fileName} />
              <Meta label="Updated" value={relativeTime(report.updatedAt, NOW)} />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
              <Summary label="Total items" value={scopedItems.length} />
              <Summary label="Matched" value={counts.matched ?? 0} tone="#179864" />
              <Summary label="Mismatched" value={counts.mismatched ?? 0} tone="#DC2626" />
              <Summary label="Needs review" value={counts.needs_review ?? 0} tone="#F59E0B" />
              <Summary label="Approved" value={counts.approved ?? 0} tone="#4664DC" />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between">
                <span className="text-helper text-muted-foreground">Review completion</span>
                <NumberDisplay value={`${progress.pct}%`} className="text-body-sm" />
              </div>
              <Progress value={progress.pct} tone={progress.pct === 100 ? "success" : "brand"} />
            </div>
          </Card>

          {/* ------------------------------- sections ------------------------------ */}
          {report.sections.map((section, index) => {
            const items = project.items.filter((i) => i.statement === section.id);
            if (!section.included && !editing) return null;

            return (
              <Card key={section.id} className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 border-b border-border-subtle px-4 py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    {editing ? (
                      <Input
                        value={section.title}
                        className="h-8 max-w-[320px] text-body-sm"
                        onChange={(e) =>
                          updateReport(report.id, {
                            sections: report.sections.map((s) =>
                              s.id === section.id ? { ...s, title: e.target.value } : s
                            ),
                          })
                        }
                      />
                    ) : (
                      <h2 className="text-body-lg font-medium tracking-tight">{section.title}</h2>
                    )}
                    <Tag variant="neutral">
                      {items.filter((i) => !section.hiddenAccounts.includes(i.id)).length} accounts
                    </Tag>
                  </div>

                  {editing && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="iconSm"
                        aria-label="Move section up"
                        disabled={index === 0}
                        onClick={() => moveSection(report.id, section.id, -1)}
                      >
                        <ChevronUp />
                      </Button>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        aria-label="Move section down"
                        disabled={index === report.sections.length - 1}
                        onClick={() => moveSection(report.id, section.id, 1)}
                      >
                        <ChevronDown />
                      </Button>
                      <label className="ml-1 flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1">
                        <Switch
                          checked={section.included}
                          onCheckedChange={(on) =>
                            updateReport(report.id, {
                              sections: report.sections.map((s) =>
                                s.id === section.id ? { ...s, included: on } : s
                              ),
                            })
                          }
                        />
                        <span className="text-helper text-muted-foreground">
                          {section.included ? "Included" : "Hidden"}
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                {editing && (
                  <div className="flex flex-col gap-3 border-b border-border-subtle bg-surface-secondary/40 px-4 py-3">
                    <div className="flex flex-col gap-1.5">
                      <span className="text-meta font-semibold uppercase tracking-wider text-muted-foreground">
                        Columns
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {ALL_COLUMNS.map((column) => {
                          const on = section.columns.includes(column);
                          return (
                            <button
                              key={column}
                              type="button"
                              onClick={() =>
                                updateReport(report.id, {
                                  sections: report.sections.map((s) =>
                                    s.id === section.id
                                      ? {
                                          ...s,
                                          columns: on
                                            ? s.columns.filter((c) => c !== column)
                                            : [...ALL_COLUMNS.filter(
                                                (c) => s.columns.includes(c) || c === column
                                              )],
                                        }
                                      : s
                                  ),
                                })
                              }
                              className={cn(
                                "rounded-md border px-2 py-1 text-helper transition-colors duration-fast",
                                on
                                  ? "border-brand/40 bg-[rgba(70,100,220,0.08)] text-[#2F45A8]"
                                  : "border-border text-muted-foreground hover:bg-surface-secondary"
                              )}
                            >
                              {column}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-meta font-semibold uppercase tracking-wider text-muted-foreground">
                        Included accounts
                      </span>
                      <div className="grid max-h-[168px] grid-cols-1 gap-1 overflow-y-auto scrollbar-thin rounded-lg border border-border-subtle bg-surface p-2 md:grid-cols-2">
                        {items.map((item) => {
                          const hidden = section.hiddenAccounts.includes(item.id);
                          return (
                            <label
                              key={item.id}
                              className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-surface-secondary"
                            >
                              <Checkbox
                                checked={!hidden}
                                onCheckedChange={(on) =>
                                  updateReport(report.id, {
                                    sections: report.sections.map((s) =>
                                      s.id === section.id
                                        ? {
                                            ...s,
                                            hiddenAccounts: on
                                              ? s.hiddenAccounts.filter((id) => id !== item.id)
                                              : [...s.hiddenAccounts, item.id],
                                          }
                                        : s
                                    ),
                                  })
                                }
                              />
                              <span
                                className={cn(
                                  "truncate text-body-sm",
                                  hidden && "text-muted-foreground line-through"
                                )}
                              >
                                {item.account}
                              </span>
                              {hidden ? (
                                <EyeOff className="ml-auto h-3 w-3 text-muted-foreground" />
                              ) : (
                                <Eye className="ml-auto h-3 w-3 text-muted-foreground/50" />
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <Field label="Section note" hint="Rendered above the table in exports.">
                      <Textarea
                        rows={2}
                        value={section.note ?? ""}
                        placeholder="e.g. Cost of sales differences are presentation-only and were agreed with the auditor."
                        onChange={(e) =>
                          updateReport(report.id, {
                            sections: report.sections.map((s) =>
                              s.id === section.id ? { ...s, note: e.target.value } : s
                            ),
                          })
                        }
                      />
                    </Field>
                  </div>
                )}

                {section.included && (
                  <>
                    {section.note && !editing && (
                      <p className="border-b border-border-subtle px-4 py-2.5 text-helper text-muted-foreground">
                        {section.note}
                      </p>
                    )}
                    <SectionTable
                      section={section}
                      items={items.filter((i) => !section.hiddenAccounts.includes(i.id))}
                      docALabel={project.docA.label}
                      docBLabel={project.docB.label}
                    />
                  </>
                )}
              </Card>
            );
          })}

          <p className="pb-4 text-meta text-muted-foreground">
            elimentary · {new Date(report.updatedAt).toISOString().slice(0, 10)} · Generated from{" "}
            {project.docA.fileName} and {project.docB.fileName}
          </p>
        </div>
      </main>
    </AppShell>
  );
}

function SectionTable({
  section,
  items,
  docALabel,
  docBLabel,
}: {
  section: ReportSection;
  items: LineItem[];
  docALabel: string;
  docBLabel: string;
}) {
  const header = (column: string) =>
    column === "Document A" ? docALabel : column === "Document B" ? docBLabel : column;

  const numeric = ["Document A", "Document B", "Difference"];

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full border-collapse">
        <thead className="border-b border-border bg-[#F9FBFD]">
          <tr>
            {section.columns.map((column) => (
              <th
                key={column}
                className={cn(
                  "px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
                  numeric.includes(column) ? "text-right" : "text-left"
                )}
              >
                {header(column)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-subtle">
          {items.map((item) => {
            const diff = difference(item);
            return (
              <tr key={item.id} className="transition-colors duration-fast hover:bg-surface-secondary/50">
                {section.columns.map((column) => (
                  <td
                    key={column}
                    className={cn(
                      "px-3 py-2 text-body-sm",
                      numeric.includes(column) && "tabular text-right font-mono"
                    )}
                  >
                    {column === "Account" && (
                      <span className={cn(item.isSubtotal && "font-medium", item.level === 1 && "pl-3")}>
                        {item.account}
                      </span>
                    )}
                    {column === "Document A" && formatValue(item.valueA, item.unit)}
                    {column === "Document B" && formatValue(effectiveValue(item), item.unit)}
                    {column === "Difference" && (
                      <span className={cn(diff !== 0 && "text-[#B91C1C]")}>
                        {formatDifference(diff, item.unit)}
                      </span>
                    )}
                    {column === "Status" && <ReviewStatusTag status={item.status} />}
                    {column === "Confidence" && (
                      <AIConfidenceBadge confidence={item.confidence} valueOnly />
                    )}
                    {column === "Source" && (
                      <span className="tabular font-mono text-meta text-muted-foreground">
                        p.{item.sourceA.page} · {item.sourceB.cell}
                      </span>
                    )}
                    {column === "Reviewer" &&
                      (item.reviewer ? (
                        <span className="flex items-center gap-1.5">
                          <Avatar name={item.reviewer} size="xs" />
                          <span className="truncate text-muted-foreground">{item.reviewer}</span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      ))}
                    {column === "Note" && (
                      <span className="line-clamp-1 text-muted-foreground">{item.note ?? "—"}</span>
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-meta uppercase tracking-wider text-muted-foreground/80">{label}</span>
      <span className="text-body-sm text-foreground">{value}</span>
    </span>
  );
}

function Summary({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-meta uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="tabular font-mono text-h2" style={tone ? { color: tone } : undefined}>
        {value}
      </span>
    </div>
  );
}
