"use client";

import * as React from "react";
import {
  ArrowRight,
  Check,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  MessageSquarePlus,
  MousePointerClick,
  Minus,
  Plus,
  X,
} from "lucide-react";

import { PdfPage, SheetView } from "@/components/workspace/DocumentViewer";
import { ReviewStatusTag } from "@/components/app/StatusPills";
import {
  AIConfidenceBadge,
  Avatar,
  Button,
  EmptyState,
  InlineAlert,
  Separator,
  Tag,
  Textarea,
  Tooltip,
} from "@/components/element";
import { NOW, statementLabel } from "@/lib/mock";
import {
  STATUS_LABEL,
  difference,
  effectiveValue,
  formatDifference,
  formatValue,
  relativeTime,
} from "@/lib/derive";
import { useActiveItem, useActiveProject, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function SourcePanel() {
  const project = useActiveProject();
  const item = useActiveItem();
  const sourceDoc = useStore((s) => s.sourceDoc);
  const setSourceDoc = useStore((s) => s.setSourceDoc);
  const setActiveItem = useStore((s) => s.setActiveItem);
  const setStatus = useStore((s) => s.setStatus);
  const addNote = useStore((s) => s.addNote);

  const [page, setPage] = React.useState(item?.sourceA.page ?? 42);
  const [zoom, setZoom] = React.useState(1);
  const [noteDraft, setNoteDraft] = React.useState("");
  const [noteOpen, setNoteOpen] = React.useState(false);

  React.useEffect(() => {
    if (item?.sourceA.page) setPage(item.sourceA.page);
    setNoteOpen(false);
    setNoteDraft(item?.note ?? "");
  }, [item?.id, item?.sourceA.page, item?.note]);

  const activeSource = item ? (sourceDoc === "A" ? item.sourceA : item.sourceB) : null;
  const doc = sourceDoc === "A" ? project.docA : project.docB;
  const diff = item ? difference(item) : 0;

  return (
    <div className="flex h-full min-w-0 flex-col bg-surface">
      {/* --------------------------- document switcher --------------------------- */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border-subtle px-2 py-2">
        {(["A", "B"] as const).map((id) => {
          const d = id === "A" ? project.docA : project.docB;
          const active = sourceDoc === id;
          const Icon = d.kind === "pdf" ? FileText : FileSpreadsheet;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSourceDoc(id)}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors duration-fast",
                active ? "bg-surface-secondary" : "hover:bg-surface-secondary/60"
              )}
            >
              <Icon
                className="h-3.5 w-3.5 shrink-0"
                style={{ color: d.kind === "pdf" ? "#DC2626" : "#179864" }}
              />
              <span className="flex min-w-0 flex-col">
                <span
                  className={cn(
                    "truncate text-body-sm",
                    active ? "font-medium text-foreground" : "text-muted-foreground"
                  )}
                >
                  {d.label}
                </span>
                <span className="truncate text-meta text-muted-foreground">{d.fileName}</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* -------------------------------- viewer --------------------------------- */}
      <div className="flex shrink-0 items-center gap-1 border-b border-border-subtle px-2 py-1.5">
        {doc.kind === "pdf" ? (
          <>
            <Button
              variant="ghost"
              size="iconXs"
              aria-label="Previous page"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft />
            </Button>
            <span className="tabular font-mono text-helper text-muted-foreground">
              Page {page} of {doc.pages}
            </span>
            <Button
              variant="ghost"
              size="iconXs"
              aria-label="Next page"
              onClick={() => setPage((p) => Math.min(doc.pages ?? 999, p + 1))}
            >
              <ChevronRight />
            </Button>
          </>
        ) : (
          <span className="px-1 font-mono text-helper text-muted-foreground">
            {item?.sourceB.sheet ?? "IS_Model"} · {item?.sourceB.cell ?? "—"}
          </span>
        )}

        <div className="ml-auto flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="iconXs"
            aria-label="Zoom out"
            onClick={() => setZoom((z) => Math.max(0.7, Number((z - 0.1).toFixed(2))))}
          >
            <Minus />
          </Button>
          <span className="tabular w-9 text-center font-mono text-meta text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            variant="ghost"
            size="iconXs"
            aria-label="Zoom in"
            onClick={() => setZoom((z) => Math.min(1.4, Number((z + 0.1).toFixed(2))))}
          >
            <Plus />
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
        {doc.kind === "pdf" ? (
          <PdfPage
            project={project}
            page={page}
            items={project.items}
            activeItemId={item?.id ?? null}
            onPickItem={(id) => setActiveItem(id, "A")}
            zoom={zoom}
          />
        ) : (
          <SheetView
            project={project}
            sheet={item?.sourceB.sheet ?? "IS_Model"}
            items={project.items}
            activeItemId={item?.id ?? null}
            onPickItem={(id) => setActiveItem(id, "B")}
          />
        )}

      </div>

      {/* ------------------------------- item detail ------------------------------ */}
      <div className="max-h-[54%] shrink-0 overflow-auto scrollbar-thin border-t border-border">
        {item ? (
          <div className="flex flex-col gap-3 p-3">
            <section className="flex flex-col gap-2">
              <SectionLabel>Source</SectionLabel>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-lg border border-border-subtle bg-surface-secondary/50 p-2.5">
                <Row label="Document" value={doc.fileName} mono={false} />
                <Row
                  label={doc.kind === "pdf" ? "Page" : "Cell"}
                  value={doc.kind === "pdf" ? String(activeSource?.page) : String(activeSource?.cell)}
                />
                <Row label="Location" value={activeSource?.location ?? ""} mono={false} />
                <div className="flex flex-col gap-0.5">
                  <dt className="text-meta uppercase tracking-wider text-muted-foreground">
                    Confidence
                  </dt>
                  <dd>
                    <AIConfidenceBadge confidence={activeSource?.confidence ?? null} valueOnly />
                  </dd>
                </div>
              </dl>
            </section>

            <section className="flex flex-col gap-2">
              <SectionLabel>Comparison</SectionLabel>
              <div className="rounded-lg border border-border-subtle">
                <div className="flex items-center justify-between gap-2 border-b border-border-subtle px-2.5 py-2">
                  <span className="truncate text-body-sm font-medium">{item.account}</span>
                  <ReviewStatusTag status={item.status} />
                </div>

                <div className="grid grid-cols-3 divide-x divide-border-subtle">
                  <ValueBlock label={project.docA.label} value={formatValue(item.valueA, item.unit)} />
                  <ValueBlock
                    label={project.docB.label}
                    value={formatValue(effectiveValue(item), item.unit)}
                    edited={item.editedValue !== undefined}
                  />
                  <ValueBlock
                    label="Difference"
                    value={formatDifference(diff, item.unit)}
                    tone={diff === 0 ? "muted" : item.status === "needs_review" ? "warning" : "critical"}
                  />
                </div>

                {item.explanation && (
                  <div className="border-t border-border-subtle p-2.5">
                    <p className="text-helper text-muted-foreground">{item.explanation}</p>
                  </div>
                )}

                {!item.explanation && diff === 0 && (
                  <div className="border-t border-border-subtle p-2.5">
                    <p className="text-helper text-muted-foreground">
                      Both sources report the same value for {item.account} in {project.period}.
                    </p>
                  </div>
                )}
              </div>

              {item.editedValue !== undefined && (
                <InlineAlert tone="info" title="Value edited">
                  <span className="tabular font-mono">
                    {formatValue(item.valueB, item.unit)}
                  </span>{" "}
                  <ArrowRight className="inline h-3 w-3" />{" "}
                  <span className="tabular font-mono">
                    {formatValue(item.editedValue, item.unit)}
                  </span>{" "}
                  · Edited by {item.reviewer ?? "you"}
                </InlineAlert>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <SectionLabel>Decision</SectionLabel>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  variant={item.status === "approved" ? "successSoft" : "outline"}
                  size="sm"
                  onClick={() => setStatus([item.id], "approved")}
                >
                  <Check />
                  Approve
                </Button>
                <Button
                  variant={item.status === "rejected" ? "destructiveSoft" : "outline"}
                  size="sm"
                  onClick={() => setStatus([item.id], "rejected")}
                >
                  <X />
                  Reject
                </Button>
                <Button variant="outline" size="sm" onClick={() => setStatus([item.id], "needs_review")}>
                  Needs review
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setNoteOpen((o) => !o)}>
                  <MessageSquarePlus />
                  {item.note ? "Edit note" : "Add note"}
                </Button>
              </div>

              {item.note && !noteOpen && (
                <p className="rounded-lg border border-border-subtle bg-surface-secondary/50 p-2.5 text-helper text-muted-foreground">
                  “{item.note}”
                </p>
              )}

              {noteOpen && (
                <div className="flex flex-col gap-2">
                  <Textarea
                    rows={3}
                    autoFocus
                    value={noteDraft}
                    placeholder="Note for the next reviewer"
                    onChange={(e) => setNoteDraft(e.target.value)}
                    className="text-body-sm"
                  />
                  <div className="flex justify-end gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => setNoteOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="brand"
                      size="sm"
                      onClick={() => {
                        addNote(item.id, noteDraft);
                        setNoteOpen(false);
                      }}
                    >
                      Save note
                    </Button>
                  </div>
                </div>
              )}
            </section>

            <section className="flex flex-col gap-2 pb-2">
              <SectionLabel>Review history</SectionLabel>
              <ol className="flex flex-col">
                {item.history.map((entry, i) => (
                  <li key={entry.id} className="flex gap-2">
                    <div className="flex flex-col items-center">
                      {entry.actor === "Reconciliation Agent" ? (
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(70,100,220,0.12)] text-[9px] font-semibold text-[#2F45A8]">
                          AI
                        </span>
                      ) : (
                        <Avatar name={entry.actor} size="xs" className="mt-0.5" />
                      )}
                      {i < item.history.length - 1 && (
                        <span className="my-1 w-px flex-1 bg-border-subtle" />
                      )}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5 pb-3">
                      <p className="text-body-sm">
                        <span className="font-medium">{entry.actor}</span>{" "}
                        <span className="text-muted-foreground">
                          {entry.action === "extracted"
                            ? "extracted this value"
                            : entry.action === "commented"
                              ? "added a note"
                              : entry.action === "edited"
                                ? "edited the value"
                                : `set status to ${STATUS_LABEL[
                                    entry.action === "approved"
                                      ? "approved"
                                      : entry.action === "rejected"
                                        ? "rejected"
                                        : "needs_review"
                                  ]}`}
                        </span>
                      </p>
                      {entry.from && entry.to && (
                        <p className="tabular font-mono text-meta text-muted-foreground">
                          {entry.from} → {entry.to}
                        </p>
                      )}
                      {entry.note && (
                        <p className="text-helper text-muted-foreground">“{entry.note}”</p>
                      )}
                      <p className="text-meta text-muted-foreground/80">
                        {relativeTime(entry.at, NOW)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>

              {item.reviewer && (
                <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-secondary/50 p-2.5">
                  <Avatar name={item.reviewer} size="sm" />
                  <div className="flex min-w-0 flex-col">
                    <span className="text-body-sm">
                      {STATUS_LABEL[item.status]} by{" "}
                      <span className="font-medium">{item.reviewer}</span>
                    </span>
                    <span className="text-meta text-muted-foreground">
                      {item.reviewedAt ? relativeTime(item.reviewedAt, NOW) : "—"} ·{" "}
                      {statementLabel(item.statement)}
                    </span>
                  </div>
                  <Tooltip content="Any reviewer can send this back for a second look">
                    <span className="ml-auto">
                      <Tag variant="neutral">Reversible</Tag>
                    </span>
                  </Tooltip>
                </div>
              )}
            </section>
          </div>
        ) : (
          <div>
            <EmptyState
              icon={<MousePointerClick />}
              title="Select a value to see its source"
              description="Clicking any number opens the page or cell it was read from, with the evidence, the difference and the review history."
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-meta font-semibold uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  );
}

function Row({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-meta uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={cn("truncate text-body-sm", mono && "tabular font-mono")}>{value}</dd>
    </div>
  );
}

function ValueBlock({
  label,
  value,
  tone = "default",
  edited,
}: {
  label: string;
  value: string;
  tone?: "default" | "muted" | "warning" | "critical";
  edited?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 p-2.5">
      <span className="truncate text-meta uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "tabular font-mono text-body-lg",
          tone === "muted" && "text-muted-foreground/70",
          tone === "warning" && "text-[#B45309]",
          tone === "critical" && "text-[#B91C1C]",
          edited && "text-[#6D28D9]"
        )}
      >
        {value}
      </span>
    </div>
  );
}
