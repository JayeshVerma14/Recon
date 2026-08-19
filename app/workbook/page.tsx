"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileCheck2, GitCompareArrows, MessageSquare, PanelsTopLeft, RefreshCw } from "lucide-react";

import { AgentHeader, AppShell } from "@/components/app/AppShell";
import { Workbook } from "@/components/workbook/Workbook";
import { ReconcileViewer } from "@/components/viewer/ReconcileViewer";
import { Button } from "@/components/element";
import { isReviewed } from "@/lib/derive";
import { buildIssues } from "@/lib/issues";
import { useActiveProject, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function WorkbookPage() {
  const router = useRouter();
  const project = useActiveProject();
  const dispositions = useStore((s) => s.commentDisposition);
  const [viewer, setViewer] = React.useState<{ open: boolean; itemId: string | null }>({
    open: false,
    itemId: null,
  });

  const reconciled = project.statements.filter((statement) => {
    const rows = project.items.filter((i) => i.statement === statement);
    return rows.length > 0 && rows.every(isReviewed);
  }).length;

  const issues = React.useMemo(() => buildIssues(project), [project]);
  const openComments = issues.filter((i) => dispositions[i.id] === undefined);

  return (
    <AppShell fill>
      <AgentHeader
        parent="Document Reconciliation"
        parentHref="/"
        title={project.name}
        description="Every reconciled figure is linked back to the page or cell it came from. Open the reconciled PDF to work through what the agent flagged."
      />

      <main
        id="main"
        className="flex min-h-0 flex-1 flex-col gap-4 bg-[linear-gradient(180deg,#F7F8FD_0%,#F3F6FC_100%)] px-4 py-4 lg:px-6 lg:py-5"
      >
        <div className="flex shrink-0 flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-2.5 text-body">
            <GitCompareArrows className="h-4 w-4 text-muted-foreground" />
            Reconciled
            <span className="tabular font-mono font-semibold">{reconciled}</span>
            <span className="text-muted-foreground">of {project.statements.length} statement(s)</span>
          </span>

          <span className="inline-flex items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-2.5 text-body">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span
              className={cn(
                "tabular font-mono font-semibold",
                openComments.length ? "text-critical" : "text-success"
              )}
            >
              {openComments.length}
            </span>
            <span className="text-muted-foreground">
              {openComments.length === 1 ? "comment open" : "comments open"}
            </span>
          </span>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              className="h-11 rounded-xl px-4"
              onClick={() => router.push(`/workspace/${project.id}`)}
            >
              <PanelsTopLeft />
              Review workspace
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-xl px-4"
              onClick={() => setViewer({ open: true, itemId: openComments[0]?.itemId ?? null })}
            >
              <FileCheck2 />
              Review reconciliation
            </Button>
            <Button
              variant="outline"
              className="h-11 rounded-xl px-4 text-body"
              onClick={() => router.push("/new")}
            >
              <RefreshCw />
              New reconciliation
            </Button>
          </div>
        </div>

        <Workbook project={project} onOpenSource={(itemId) => setViewer({ open: true, itemId })} />
      </main>

      <ReconcileViewer
        project={project}
        open={viewer.open}
        focusItemId={viewer.itemId}
        onClose={() => setViewer({ open: false, itemId: null })}
      />
    </AppShell>
  );
}
