"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Play, Scale, X } from "lucide-react";

import { AgentRun } from "@/components/new/AgentRun";
import { GitCompareArrows } from "lucide-react";
import { DropPanel } from "@/components/new/DropPanel";
import { Logo } from "@/components/app/AppShell";
import { GlobalActions, Topbar } from "@/components/app/Topbar";
import {
  Button,
  Card,
  Field,
  Input,
  InlineAlert,
  OptionRow,
  Select,
  SegmentedControl,
  Separator,
  Tag,
} from "@/components/element";
import { STATEMENTS, statementLabel } from "@/lib/mock";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { MatchingRule, StatementId } from "@/lib/types";

const STEPS = ["Upload documents", "Configure", "Run agent"];

export default function NewReconciliationPage() {
  const router = useRouter();
  const draft = useStore((s) => s.draft);
  const setDraft = useStore((s) => s.setDraft);
  const commitDraft = useStore((s) => s.commitDraft);
  const [step, setStep] = React.useState(0);
  const projectId = React.useRef<string | null>(null);

  const canContinue = step === 0 ? Boolean(draft.docA && draft.docB) : draft.statements.length > 0;

  const runAgent = () => {
    projectId.current = commitDraft();
    setStep(2);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Topbar
        left={
          <div className="flex items-center gap-3">
            <Logo />
            <Separator orientation="vertical" className="h-4" />
            <span className="text-body-sm text-muted-foreground">New reconciliation</span>
          </div>
        }
        right={
          <>
            <GlobalActions showSearch={false} />
            <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
              <X />
              Cancel
            </Button>
          </>
        }
      />

      <main id="main" className="flex-1 px-6 py-8 lg:px-10">
        <div className="mx-auto flex w-full max-w-[920px] flex-col gap-6">
          <Stepper step={step} />

          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="flex flex-col gap-4"
            >
              {step === 0 && (
                <>
                  <div className="flex items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[rgba(70,100,220,0.10)] text-brand">
                      <GitCompareArrows className="h-6 w-6" />
                    </span>
                    <div className="flex flex-col gap-1 pt-0.5">
                      <h2 className="text-h1 font-semibold tracking-tight">Reconcile two documents</h2>
                      <p className="text-body-lg text-muted-foreground">
                        Upload exactly two files (at least one PDF), then choose the statements to
                        reconcile.
                      </p>
                    </div>
                  </div>

                  <DropPanel
                    docA={draft.docA}
                    docB={draft.docB}
                    onChange={(patch) => setDraft(patch)}
                  />

                  <Card className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                    <Field label="Project name" hint="Shown on the dashboard and the report.">
                      <Input
                        value={draft.name}
                        placeholder="Acme Corp FY2024 Reconciliation"
                        onChange={(e) => setDraft({ name: e.target.value })}
                      />
                    </Field>
                    <Field label="Entity">
                      <Input
                        value={draft.entity}
                        placeholder="Acme Corporation"
                        onChange={(e) => setDraft({ entity: e.target.value })}
                      />
                    </Field>
                  </Card>
                </>
              )}

              {step === 1 && <ConfigureStep />}

              {step === 2 && (
                <AgentRun
                  draft={draft}
                  onDone={() => router.push("/workbook")}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {step < 2 && (
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="ghost"
                onClick={() => (step === 0 ? router.push("/") : setStep(step - 1))}
              >
                <ArrowLeft />
                {step === 0 ? "Back to agent" : "Back"}
              </Button>

              {step === 0 ? (
                <Button variant="brand" disabled={!canContinue} onClick={() => setStep(1)}>
                  Configure reconciliation
                  <ArrowRight />
                </Button>
              ) : (
                <Button variant="brand" disabled={!canContinue} onClick={runAgent}>
                  <Play />
                  Run Reconciliation
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ConfigureStep() {
  const draft = useStore((s) => s.draft);
  const setDraft = useStore((s) => s.setDraft);

  const toggleStatement = (id: StatementId, on: boolean) =>
    setDraft({
      statements: on
        ? [...draft.statements, id].sort(
            (a, b) => STATEMENTS.findIndex((s) => s.id === a) - STATEMENTS.findIndex((s) => s.id === b)
          )
        : draft.statements.filter((s) => s !== id),
    });

  return (
    <>
      <Card className="flex flex-col gap-5 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-h3 font-medium tracking-tight">Configure reconciliation</h2>
          <p className="text-body-sm text-muted-foreground">
            Choose what the agent compares and how strict it should be.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-body-sm font-medium">Statements</span>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {STATEMENTS.map((statement) => (
              <OptionRow
                key={statement.id}
                checked={draft.statements.includes(statement.id)}
                onCheckedChange={(on) => toggleStatement(statement.id, on)}
                title={statement.label}
                description={
                  statement.id === "income"
                    ? "19 accounts detected"
                    : statement.id === "balance"
                      ? "25 accounts detected"
                      : "21 accounts detected"
                }
              />
            ))}
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Field label="Reporting period">
            <Select value={draft.period} onChange={(e) => setDraft({ period: e.target.value })}>
              {["FY2024", "FY2023", "Q1 FY2025", "Q2 FY2025", "Q3 FY2024", "Q4 FY2024"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Comparative period" hint="Used to sanity-check period alignment.">
            <Select
              value={draft.comparisonPeriod}
              onChange={(e) => setDraft({ comparisonPeriod: e.target.value })}
            >
              {["FY2023", "FY2022", "Q1 FY2024", "None"].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
        </div>

        <Separator />

        <div className="flex flex-col gap-2">
          <span className="text-body-sm font-medium">Matching rule</span>
          <div className="flex flex-wrap items-center gap-3">
            <SegmentedControl<MatchingRule>
              value={draft.matching}
              onChange={(matching) => setDraft({ matching })}
              options={[
                { value: "exact", label: "Exact match" },
                { value: "rounding", label: "Allow rounding" },
                { value: "custom", label: "Custom tolerance" },
              ]}
            />
            {draft.matching === "custom" && (
              <div className="flex items-center gap-2">
                <span className="text-body-sm text-muted-foreground">±</span>
                <Input
                  type="number"
                  className="h-8 w-24"
                  value={draft.tolerance}
                  min={0}
                  onChange={(e) => setDraft({ tolerance: Number(e.target.value) })}
                />
                <span className="text-body-sm text-muted-foreground">thousands</span>
              </div>
            )}
          </div>
          <p className="text-helper text-muted-foreground">
            {draft.matching === "exact"
              ? "Any difference at all is reported as a mismatch."
              : draft.matching === "rounding"
                ? "Differences of 1 or less are treated as rounding and reported as matched."
                : `Differences up to ${draft.tolerance} are treated as immaterial.`}
          </p>
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <div className="flex items-center gap-2">
          <Scale className="h-4 w-4 text-brand" />
          <span className="text-body-sm font-medium">Before you run</span>
        </div>
        <ul className="flex flex-col gap-1.5 text-body-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            <span>
              {draft.docA?.fileName ?? "Source"} will be treated as the source of truth;{" "}
              {draft.docB?.fileName ?? "comparison"} will be checked against it.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            <span>
              {draft.statements.length
                ? draft.statements.map((s) => statementLabel(s)).join(", ")
                : "No statements selected"}{" "}
              for {draft.period}.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
            <span>Every proposed status stays unapproved until an analyst signs off.</span>
          </li>
        </ul>
        {draft.statements.length === 0 && (
          <InlineAlert tone="warning" title="Select at least one statement">
            The agent needs a statement to reconcile before it can run.
          </InlineAlert>
        )}
      </Card>
    </>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map((label, i) => {
        const state = i < step ? "done" : i === step ? "current" : "todo";
        return (
          <React.Fragment key={label}>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium",
                  state === "done" && "bg-success text-white",
                  state === "current" && "bg-foreground text-background",
                  state === "todo" && "border border-border bg-surface text-muted-foreground"
                )}
              >
                {state === "done" ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-body-sm",
                  state === "todo" ? "text-muted-foreground" : "font-medium text-foreground"
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className="h-px w-8 bg-border" />}
          </React.Fragment>
        );
      })}
      <Tag variant="neutral" className="ml-auto">
        Draft
      </Tag>
    </div>
  );
}
