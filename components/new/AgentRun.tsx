"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronRight, Loader2 } from "lucide-react";

import { Button, Card, Progress, Tag } from "@/components/element";
import { cn } from "@/lib/utils";
import { statementLabel } from "@/lib/mock";
import type { Draft } from "@/lib/store";
import type { StatementId } from "@/lib/types";

interface Step {
  id: string;
  label: string;
  /** Evidence lines revealed once the step completes. */
  detail: string[];
  ms: number;
}

interface Stage {
  id: string;
  title: string;
  steps: Step[];
}

function buildStages(draft: Draft): Stage[] {
  const docA = draft.docA?.fileName ?? "Document A";
  const docB = draft.docB?.fileName ?? "Document B";
  const pagesA = draft.docA?.pages ?? 219;
  const sheetsB = draft.docB?.sheets?.length ?? 6;
  const statements = draft.statements.length ? draft.statements : (["income"] as StatementId[]);

  return [
    {
      id: "prepare",
      title: "Preparing documents",
      steps: [
        {
          id: "upload",
          label: "Documents uploaded",
          ms: 700,
          detail: [`${docA} · ${draft.docA?.sizeMb ?? 18.3} MB`, `${docB} · ${draft.docB?.sizeMb ?? 4.7} MB`],
        },
        {
          id: "pdf",
          label: "PDF structure identified",
          ms: 1100,
          detail: [
            `${pagesA} pages parsed · text layer present`,
            "Table of contents detected on page 3",
          ],
        },
        {
          id: "sheets",
          label: draft.docB?.kind === "xlsx" ? "Workbook sheets identified" : "Second PDF structure identified",
          ms: 900,
          detail:
            draft.docB?.kind === "xlsx"
              ? [`${sheetsB} sheets · IS_Model, BS_Model, CF_Model flagged as statements`]
              : ["88 pages parsed · scanned pages: 0"],
        },
      ],
    },
    {
      id: "extract",
      title: "Extracting information",
      steps: [
        {
          id: "tables",
          label: "Extracting tables",
          ms: 1500,
          detail: ["47 candidate tables found", "9 retained after structure scoring"],
        },
        {
          id: "identify",
          label: "Identifying financial statements",
          ms: 1200,
          detail: statements.map(
            (s) =>
              `${statementLabel(s)} located · ${
                s === "income" ? "pages 42–43" : s === "balance" ? "pages 46–47" : "pages 49–50"
              }`
          ),
        },
        {
          id: "periods",
          label: "Reading reporting periods",
          ms: 900,
          detail: [`Primary period ${draft.period}`, `Comparative ${draft.comparisonPeriod}`],
        },
      ],
    },
    {
      id: "map",
      title: "Mapping",
      steps: [
        {
          id: "accounts",
          label: "Mapping account names",
          ms: 1600,
          detail: [
            "73 accounts matched by label and position",
            "“Cost of sales” → “Cost of goods sold” (synonym)",
            "2 accounts unmapped and set aside",
          ],
        },
        {
          id: "periodmatch",
          label: "Matching reporting periods",
          ms: 800,
          detail: [`${draft.period} column aligned in both sources`],
        },
        {
          id: "units",
          label: "Normalising units",
          ms: 700,
          detail: ["Document A in $ thousands", "Document B in $ units → scaled by 1/1000"],
        },
      ],
    },
    {
      id: "reconcile",
      title: "Reconciliation",
      steps: statements.map((s) => ({
        id: `rec-${s}`,
        label: `Reconciling ${statementLabel(s)}`,
        ms: 1400,
        detail: [
          s === "income"
            ? "19 accounts compared · 4 differences"
            : s === "balance"
              ? "25 accounts compared · 7 differences"
              : "21 accounts compared · 5 differences",
          `Rule: ${
            draft.matching === "exact"
              ? "exact match"
              : draft.matching === "rounding"
                ? "allow rounding differences"
                : `custom tolerance ±${draft.tolerance}`
          }`,
        ],
      })),
    },
    {
      id: "validate",
      title: "Validation",
      steps: [
        {
          id: "mismatch",
          label: "Detecting mismatches",
          ms: 1200,
          detail: ["11 differences confirmed", "5 flagged as classification differences"],
        },
        {
          id: "confidence",
          label: "Assigning confidence scores",
          ms: 900,
          detail: ["Mean confidence 92%", "6 items below the 80% threshold"],
        },
        {
          id: "links",
          label: "Linking source references",
          ms: 1000,
          detail: ["Every value linked to a page or cell", "0 unlinked values"],
        },
      ],
    },
    {
      id: "report",
      title: "Report",
      steps: [
        {
          id: "gen",
          label: "Generating reconciliation report",
          ms: 1100,
          detail: [`${statements.length} statement sections drafted`],
        },
        {
          id: "workbook",
          label: "Preparing workbook",
          ms: 800,
          detail: ["Excel export ready · 4 tabs"],
        },
      ],
    },
  ];
}

export function AgentRun({ draft, onDone }: { draft: Draft; onDone: () => void }) {
  const stages = React.useMemo(() => buildStages(draft), [draft]);
  const flat = React.useMemo(() => stages.flatMap((s) => s.steps.map((step) => ({ stage: s.id, step }))), [stages]);

  const [index, setIndex] = React.useState(0);
  const [expanded, setExpanded] = React.useState<string[]>([stages[0].id]);
  const done = index >= flat.length;

  React.useEffect(() => {
    if (done) return;
    const current = flat[index];
    const timer = setTimeout(() => {
      setIndex((i) => i + 1);
      const next = flat[index + 1];
      if (next && next.stage !== current.stage) {
        setExpanded((prev) => (prev.includes(next.stage) ? prev : [...prev, next.stage]));
      }
    }, current.step.ms);
    return () => clearTimeout(timer);
  }, [index, flat, done]);

  const progress = Math.round((Math.min(index, flat.length) / flat.length) * 100);
  const currentStageId = done ? null : flat[index]?.stage;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-border-subtle px-4 py-3">
          <div className="flex items-center gap-2">
            {done ? (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-success text-white">
                <Check className="h-3 w-3" strokeWidth={3} />
              </span>
            ) : (
              <Loader2 className="h-4 w-4 animate-spin text-brand" />
            )}
            <span className="text-body font-medium">
              {done ? "Reconciliation complete" : "Reconciliation in progress"}
            </span>
          </div>
          <span className="tabular font-mono text-helper text-muted-foreground">
            {Math.min(index, flat.length)}/{flat.length} steps · {progress}%
          </span>
        </div>

        <div className="px-4 pt-3">
          <Progress value={progress} tone={done ? "success" : "brand"} />
        </div>

        <div className="flex flex-col gap-1 p-3">
          {stages.map((stage) => {
            const stageSteps = stage.steps.map((step) => flat.findIndex((f) => f.step.id === step.id));
            const firstIdx = stageSteps[0];
            const lastIdx = stageSteps[stageSteps.length - 1];
            const state = index > lastIdx ? "done" : index >= firstIdx ? "running" : "pending";
            const isOpen = expanded.includes(stage.id);

            return (
              <div key={stage.id} className="rounded-lg">
                <button
                  type="button"
                  onClick={() =>
                    setExpanded((prev) =>
                      prev.includes(stage.id) ? prev.filter((x) => x !== stage.id) : [...prev, stage.id]
                    )
                  }
                  className={cn(
                    "flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors duration-fast hover:bg-surface-secondary",
                    state === "running" && "bg-[rgba(70,100,220,0.05)]"
                  )}
                >
                  <ChevronRight
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-fast",
                      isOpen && "rotate-90"
                    )}
                  />
                  <StepGlyph state={state} />
                  <span
                    className={cn(
                      "text-body font-medium",
                      state === "pending" ? "text-muted-foreground" : "text-foreground"
                    )}
                  >
                    {stage.title}
                  </span>
                  {state === "running" && (
                    <Tag variant="brand" className="ml-1">
                      Running
                    </Tag>
                  )}
                  <span className="ml-auto tabular font-mono text-meta text-muted-foreground">
                    {Math.max(0, Math.min(stage.steps.length, index - firstIdx))}/{stage.steps.length}
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="ml-[26px] flex flex-col gap-1 border-l border-border-subtle pb-1 pl-3.5">
                        {stage.steps.map((step) => {
                          const stepIdx = flat.findIndex((f) => f.step.id === step.id);
                          const stepState =
                            index > stepIdx ? "done" : index === stepIdx ? "running" : "pending";
                          return (
                            <div key={step.id} className="flex flex-col gap-0.5 py-0.5">
                              <div className="flex items-center gap-2">
                                <StepGlyph state={stepState} small />
                                <span
                                  className={cn(
                                    "text-body-sm",
                                    stepState === "pending"
                                      ? "text-muted-foreground"
                                      : "text-foreground"
                                  )}
                                >
                                  {step.label}
                                </span>
                              </div>
                              {stepState === "done" && (
                                <motion.ul
                                  initial={{ opacity: 0, y: -2 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="ml-5 flex flex-col gap-0.5"
                                >
                                  {step.detail.map((line) => (
                                    <li key={line} className="text-helper text-muted-foreground">
                                      {line}
                                    </li>
                                  ))}
                                </motion.ul>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card className="p-4">
          <p className="mb-3 text-body-sm font-medium">Run configuration</p>
          <dl className="flex flex-col gap-2 text-helper">
            <Row label="Source" value={draft.docA?.fileName ?? "—"} />
            <Row label="Comparison" value={draft.docB?.fileName ?? "—"} />
            <Row
              label="Statements"
              value={draft.statements.map((s) => statementLabel(s).replace(" Statement", "")).join(", ")}
            />
            <Row label="Period" value={draft.period} />
            <Row
              label="Matching"
              value={
                draft.matching === "exact"
                  ? "Exact match"
                  : draft.matching === "rounding"
                    ? "Allow rounding"
                    : `Tolerance ±${draft.tolerance}`
              }
            />
          </dl>
        </Card>

        <Card className="flex flex-col gap-2 p-4">
          <p className="text-body-sm font-medium">
            {done ? "Ready for review" : "What happens next"}
          </p>
          <p className="text-helper text-muted-foreground">
            {done
              ? "The agent has proposed a status for every account. Nothing is final until an analyst approves it."
              : "Each value stays linked to the page or cell it came from, so every proposal can be checked against the source."}
          </p>
          <Button
            variant={done ? "brand" : "outline"}
            className="mt-2"
            disabled={!done}
            onClick={onDone}
          >
            {done ? "Open reconciliation" : "Waiting for the agent…"}
          </Button>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="truncate text-right text-foreground">{value}</dd>
    </div>
  );
}

function StepGlyph({ state, small }: { state: "done" | "running" | "pending"; small?: boolean }) {
  const size = small ? "h-3 w-3" : "h-4 w-4";
  if (state === "done") {
    return (
      <span
        className={cn(
          "flex shrink-0 items-center justify-center rounded-full bg-success text-white",
          size
        )}
      >
        <Check className={small ? "h-2 w-2" : "h-2.5 w-2.5"} strokeWidth={3} />
      </span>
    );
  }
  if (state === "running") {
    return (
      <span className={cn("relative flex shrink-0 items-center justify-center", size)}>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand/40" />
        <span className={cn("relative rounded-full bg-brand", small ? "h-1.5 w-1.5" : "h-2 w-2")} />
      </span>
    );
  }
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border border-border bg-surface",
        small ? "h-3 w-3" : "h-4 w-4"
      )}
    />
  );
}
