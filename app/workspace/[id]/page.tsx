"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileCheck2, PanelRightClose, PanelRightOpen, Users } from "lucide-react";

import { Logo } from "@/components/app/AppShell";
import { GlobalActions, Topbar } from "@/components/app/Topbar";
import { ExportMenu } from "@/components/app/ExportMenu";
import { ProjectStatusTag } from "@/components/app/StatusPills";
import { ReconciliationTable } from "@/components/workspace/ReconciliationTable";
import { SourcePanel } from "@/components/workspace/SourcePanel";
import { StatementNav } from "@/components/workspace/StatementNav";
import { ResizeHandle, useResizable } from "@/components/workspace/useResizable";
import {
  AvatarStack,
  Button,
  Progress,
  Separator,
  Tooltip,
} from "@/components/element";
import { projectProgress } from "@/lib/derive";
import { useActiveProject, useStore } from "@/lib/store";

export default function WorkspacePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const project = useActiveProject();
  const setActiveProject = useStore((s) => s.setActiveProject);
  const projects = useStore((s) => s.projects);

  const left = useResizable(248, 200, 380, "left");
  const right = useResizable(384, 320, 640, "right");
  const [showSource, setShowSource] = React.useState(true);

  React.useEffect(() => {
    if (projects.some((p) => p.id === params.id) && project.id !== params.id) {
      setActiveProject(params.id);
    }
  }, [params.id, project.id, projects, setActiveProject]);

  const progress = projectProgress(project.items);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Topbar
        left={
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" size="iconSm" aria-label="Back" onClick={() => router.push("/")}>
              <ArrowLeft />
            </Button>
            <Logo className="hidden xl:flex" />
            <Separator orientation="vertical" className="hidden h-4 xl:block" />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-body font-medium">{project.name}</span>
              <span className="truncate text-meta text-muted-foreground">
                {project.docA.fileName} ↔ {project.docB.fileName} · {project.period}
              </span>
            </div>
            <ProjectStatusTag status={project.status} />
          </div>
        }
        right={
          <>
            <div className="hidden w-[168px] flex-col gap-1 md:flex">
              <div className="flex items-baseline justify-between">
                <span className="text-meta text-muted-foreground">Review progress</span>
                <span className="tabular font-mono text-meta">{progress.pct}%</span>
              </div>
              <Progress value={progress.pct} size="sm" />
            </div>

            <Tooltip content={`Reviewers: ${project.reviewers.join(", ")}`}>
              <span className="hidden items-center gap-1.5 lg:flex">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                <AvatarStack names={project.reviewers} />
              </span>
            </Tooltip>

            <Separator orientation="vertical" className="h-4" />

            <Button
              variant="ghost"
              size="iconSm"
              aria-label={showSource ? "Hide source panel" : "Show source panel"}
              onClick={() => setShowSource((v) => !v)}
            >
              {showSource ? <PanelRightClose /> : <PanelRightOpen />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/reports/rep-${project.id}`)}
            >
              <FileCheck2 />
              Report
            </Button>
            <ExportMenu scopeLabel="Export reconciliation" />
            <GlobalActions showSearch={false} />
          </>
        }
      />

      <div className="flex min-h-0 flex-1">
        <aside
          className="hidden shrink-0 flex-col border-r border-border bg-surface-secondary/30 lg:flex"
          style={{ width: left.width }}
        >
          <StatementNav />
        </aside>
        <ResizeHandle handleProps={left.handleProps} className="hidden lg:block" />

        <main id="main" className="min-w-0 flex-1">
          <ReconciliationTable />
        </main>

        {showSource && (
          <>
            <ResizeHandle handleProps={right.handleProps} className="hidden xl:block" />
            <aside
              className="hidden shrink-0 flex-col border-l border-border xl:flex"
              style={{ width: right.width }}
            >
              <SourcePanel />
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
