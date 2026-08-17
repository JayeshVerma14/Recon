"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, GitCompareArrows, Play } from "lucide-react";

import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/element";
import { NOW } from "@/lib/mock";
import { projectProgress, relativeTime } from "@/lib/derive";
import { useActiveProject } from "@/lib/store";

const TAGS = ["Reconciliation", "Document comparison", "Financial statements"];

const CAPABILITIES = [
  "Reconciles two documents (PDF + PDF, or PDF + Excel)",
  "Side-by-side value matrices per financial statement",
  "Links each reconciled figure back to its PDF source page",
  "Annotates the working PDF with matched / mismatched values",
  "Reconciles all relevant periods within each statement",
  "You choose the statements to reconcile (multi-select)",
];

export default function AgentLandingPage() {
  const router = useRouter();
  const project = useActiveProject();
  const progress = projectProgress(project.items);

  return (
    <AppShell>
      <header className="shrink-0 border-b border-border bg-surface px-6 py-3.5 lg:px-8">
        <div className="flex items-center gap-2 text-body-lg">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground transition-colors duration-fast hover:text-foreground"
          >
            <span aria-hidden>←</span>
            Agents
          </Link>
          <span className="text-muted-foreground/50">›</span>
          <h1 className="font-semibold tracking-tight text-foreground">Document Reconciliation</h1>
        </div>
      </header>

      <main
        id="main"
        className="flex-1 overflow-y-auto scrollbar-thin bg-[linear-gradient(180deg,#F7F8FD_0%,#F3F6FC_100%)] px-4 py-4 lg:px-6 lg:py-5"
      >
        <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-4">
          {/* ------------------------------- hero card ------------------------------ */}
          <section className="relative overflow-hidden rounded-2xl bg-[linear-gradient(155deg,#0C2947_0%,#0A2540_45%,#102F53_100%)] px-8 py-8 lg:px-10 lg:py-10">
            <div className="absolute right-6 top-6 flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[rgba(23,152,100,0.18)] px-2.5 py-1 text-meta font-semibold uppercase tracking-wider text-[#5CE0A4]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#3DD68C]" />
                Live
              </span>
              <span className="tabular font-mono text-helper text-white/50">v1.0</span>
            </div>

            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-cta text-white">
                <GitCompareArrows className="h-7 w-7" />
              </span>
              <div className="flex flex-col gap-1 pt-1">
                <h2 className="text-[40px] font-semibold leading-[46px] tracking-[-1px] text-white">
                  Document Reconciliation
                </h2>
                <p className="text-body-lg text-white/55">Reconciliation</p>
              </div>
            </div>

            <p className="mt-6 max-w-[68ch] text-[19px] leading-[32px] text-white/85">
              Reconcile values across two uploaded documents (PDF + PDF, or PDF + Excel) and produce
              side-by-side matrices with PDF source linking. Pick which financial statements to
              reconcile — Income Statement, Balance Sheet, Cash Flow Statement — and each is delivered
              as a workbook tab with the source figures linked back to the annotated PDF.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-2">
              {TAGS.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-white/[0.08] px-2.5 py-1.5 text-body-sm text-white/80"
                >
                  {tag}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={() => router.push("/new")}
              className="mt-7 inline-flex h-14 items-center gap-3 rounded-xl bg-white px-7 text-h3 font-semibold text-[#0A2540] transition-transform duration-fast hover:scale-[1.01] active:scale-[0.99]"
            >
              <Play className="h-5 w-5 fill-current" />
              Run agent
            </button>

            <div className="mt-9 border-t border-white/10 pt-6">
              <p className="mb-4 text-meta font-semibold uppercase tracking-[0.14em] text-white/45">
                What this agent can do
              </p>
              <ul className="grid grid-cols-1 gap-x-10 gap-y-3 lg:grid-cols-2">
                {CAPABILITIES.map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <Check className="mt-1 h-4 w-4 shrink-0 text-[#5CE0A4]" strokeWidth={3} />
                    <span className="text-body-lg leading-6 text-white/85">{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* ------------------------------ latest run ------------------------------ */}
          <Link
            href="/workbook"
            className="group flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 transition-colors duration-fast hover:border-brand/40"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[rgba(70,100,220,0.10)] text-brand">
              <GitCompareArrows className="h-4 w-4" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-body font-medium">{project.name}</span>
              <span className="truncate text-helper text-muted-foreground">
                {project.docA.fileName} ↔ {project.docB.fileName} · {progress.pct}% reviewed · last
                run {relativeTime(project.lastModified, NOW)}
              </span>
            </span>
            <Button variant="brandOutline" size="sm" className="ml-auto shrink-0" asChild>
              <span>
                Open workbook
                <ArrowRight />
              </span>
            </Button>
          </Link>
        </div>
      </main>
    </AppShell>
  );
}
