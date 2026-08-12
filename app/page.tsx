"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileCheck2, GitCompareArrows, MessageSquare, PanelsTopLeft, RefreshCw } from "lucide-react";

import { AgentHeader, AppShell } from "@/components/app/AppShell";
import { Workbook } from "@/components/workbook/Workbook";
import { ReconcileViewer } from "@/components/viewer/ReconcileViewer";
import { Button } from "@/components/element";
import { isReviewed } from "@/lib/derive";
import { useActiveProject, useStore } from "@/lib/store";

export default function DocumentReconciliationPage() {
  const router = useRouter();
  const project = useActiveProject();
  const resolved = useStore((s) => s.resolvedComments);
  const [viewer, setViewer] = React.useState<{ open: boolean; itemId: string | null }>({
    open: false,
    itemId: null,
  });

  const reconciled = project.statements.filter((statement) => {
    const rows = project.items.filter((i) => i.statement === statement);
    return rows.length > 0 && rows.every(isReviewed);
  }).length;

  const openComments = project.items.filter((i) => i.explanation && !resolved.includes(i.id));

  return (
    <AppShell>
      <AgentHeader
        parent="Agents"
        title="Document Reconciliation"
        description="Reconcile two documents (PDF + PDF, or PDF + Excel) — or two consecutive filings plus their supporting workbook — statement by statement, with PDF source linking."
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

          <button
            type="button"
            disabled={openComments.length === 0}
            onClick={() => setViewer({ open: true, itemId: openComments[0]?.id ?? null })}
            className="inline-flex items-center gap-2.5 rounded-xl border border-border bg-surface px-4 py-2.5 text-body transition-colors duration-fast hover:border-brand/40 disabled:opacity-60 disabled:hover:border-border"
          >
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="tabular font-mono font-semibold text-critical">
              {openComments.length}
            </span>
            <span className="text-muted-foreground">
              {openComments.length === 1 ? "comment to resolve" : "comments to resolve"}
            </span>
          </button>

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
              onClick={() => setViewer({ open: true, itemId: openComments[0]?.id ?? null })}
            >
              <FileCheck2 />
              Reconciled PDF
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
