"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileCheck2, PenLine, Plus } from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { GlobalActions, Topbar } from "@/components/app/Topbar";
import { ExportMenu } from "@/components/app/ExportMenu";
import { ProjectStatusTag } from "@/components/app/StatusPills";
import {
  Button,
  Card,
  IconTile,
  NumberDisplay,
  Progress,
  Separator,
  Tag,
} from "@/components/element";
import { NOW, statementLabel } from "@/lib/mock";
import { countByStatus, projectProgress, relativeTime } from "@/lib/derive";
import { useStore } from "@/lib/store";

export default function ReportsPage() {
  const router = useRouter();
  const reports = useStore((s) => s.reports);
  const projects = useStore((s) => s.projects);

  return (
    <AppShell>
      <Topbar
        left={
          <div className="flex items-center gap-2">
            <h1 className="text-body font-medium">Reports</h1>
            <Tag variant="neutral">{reports.length}</Tag>
          </div>
        }
        right={
          <>
            <GlobalActions />
            <Button variant="brand" size="sm" onClick={() => router.push("/new")}>
              <Plus />
              New Reconciliation
            </Button>
          </>
        }
      />

      <main id="main" className="flex-1 px-6 py-6 lg:px-10 lg:py-8">
        <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-h1 font-medium tracking-tight">Reconciliation reports</h2>
            <p className="text-body text-muted-foreground">
              One report per project. Structure follows the statements that were reconciled — nothing
              is forced into a single template.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {reports.map((report) => {
              const project = projects.find((p) => p.id === report.projectId);
              if (!project) return null;
              const items = project.items.filter((i) =>
                report.sections.filter((s) => s.included).some((s) => s.id === i.statement)
              );
              const counts = countByStatus(items);
              const progress = projectProgress(items);

              return (
                <Card key={report.id} className="flex flex-col overflow-hidden">
                  <div className="flex items-start gap-3 p-4">
                    <IconTile tint="#4664DC">
                      <FileCheck2 />
                    </IconTile>
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <Link
                        href={`/reports/${report.id}`}
                        className="truncate text-body-lg font-medium tracking-tight transition-colors duration-fast hover:text-brand"
                      >
                        {report.title}
                      </Link>
                      <p className="text-helper text-muted-foreground">
                        {project.entity} · {project.period} · updated{" "}
                        {relativeTime(report.updatedAt, NOW)}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        {report.sections
                          .filter((s) => s.included)
                          .map((section) => (
                            <Tag key={section.id} variant="neutral">
                              {statementLabel(section.id).replace(" Statement", "")}
                            </Tag>
                          ))}
                        <ProjectStatusTag status={project.status} />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-5 divide-x divide-border-subtle">
                    <Stat label="Items" value={items.length} />
                    <Stat label="Matched" value={counts.matched ?? 0} tone="#179864" />
                    <Stat label="Mismatched" value={counts.mismatched ?? 0} tone="#DC2626" />
                    <Stat label="Needs review" value={counts.needs_review ?? 0} tone="#F59E0B" />
                    <Stat label="Approved" value={counts.approved ?? 0} tone="#4664DC" />
                  </div>

                  <Separator />

                  <div className="flex flex-col gap-2 p-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-helper text-muted-foreground">Review completion</span>
                      <NumberDisplay value={`${progress.pct}%`} className="text-body-sm" />
                    </div>
                    <Progress value={progress.pct} tone={progress.pct === 100 ? "success" : "brand"} />
                  </div>

                  <div className="mt-auto flex items-center gap-2 border-t border-border-subtle p-3">
                    <Button variant="brandOutline" size="sm" asChild>
                      <Link href={`/reports/${report.id}`}>Open report</Link>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/reports/${report.id}?edit=1`}>
                        <PenLine />
                        Edit report
                      </Link>
                    </Button>
                    <div className="ml-auto">
                      <ExportMenu scopeLabel={report.title} />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </AppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex flex-col gap-1 p-3">
      <span className="truncate text-meta uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="tabular font-mono text-body-lg" style={tone ? { color: tone } : undefined}>
        {value}
      </span>
    </div>
  );
}
