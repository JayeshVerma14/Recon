"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Database,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

import { Button, Progress, Tag } from "@/components/element";
import { cn } from "@/lib/utils";
import type { DocumentMeta } from "@/lib/types";

const FORMATS = [".pdf", ".xlsx", ".xls", ".csv"];

const SAMPLES: DocumentMeta[] = [
  {
    id: "A",
    fileName: "Annual_Report_2024.pdf",
    kind: "pdf",
    sizeMb: 18.3,
    pages: 219,
    label: "Annual Report",
  },
  {
    id: "B",
    fileName: "Financial_Model_v12.xlsx",
    kind: "xlsx",
    sizeMb: 4.7,
    sheets: ["Cover", "IS_Model", "BS_Model", "CF_Model", "Assumptions", "Debt schedule"],
    label: "Financial Model",
  },
];

const CONNECTED = [
  { name: "Direct uploads", detail: "Excel · CSV · PDF", state: "Healthy" as const, icon: Upload },
  { name: "Vault · audit workpapers", detail: "412 documents", state: "Healthy" as const, icon: Database },
  { name: "Snowflake · prod_warehouse", detail: "synced 12s ago", state: "Healthy" as const, icon: Database },
  { name: "S3 · aster-dropzone", detail: "access key expired", state: "Error" as const, icon: Database },
];

function fromFile(file: File, slot: "A" | "B"): DocumentMeta {
  const isSheet = /\.(xlsx|xls|csv)$/i.test(file.name);
  const sizeMb = Number((file.size / 1024 / 1024).toFixed(1)) || 1.2;
  return {
    id: slot,
    fileName: file.name,
    kind: isSheet ? "xlsx" : "pdf",
    sizeMb,
    pages: isSheet ? undefined : Math.max(8, Math.round(sizeMb * 12)),
    sheets: isSheet ? ["Cover", "IS_Model", "BS_Model", "CF_Model"] : undefined,
    label: file.name.replace(/\.[^.]+$/, "").slice(0, 28),
  };
}

export function DropPanel({
  docA,
  docB,
  onChange,
}: {
  docA: DocumentMeta | null;
  docB: DocumentMeta | null;
  onChange: (patch: { docA?: DocumentMeta | null; docB?: DocumentMeta | null }) => void;
}) {
  const [dragging, setDragging] = React.useState(false);
  const [uploading, setUploading] = React.useState<{ name: string; pct: number } | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  const nextSlot = (): "A" | "B" | null => (!docA ? "A" : !docB ? "B" : null);

  const startUpload = React.useCallback(
    (doc: DocumentMeta, slot: "A" | "B") => {
      if (timer.current) clearInterval(timer.current);
      setUploading({ name: doc.fileName, pct: 0 });
      let pct = 0;
      timer.current = setInterval(() => {
        pct += 11 + Math.round(Math.random() * 16);
        if (pct >= 100) {
          if (timer.current) clearInterval(timer.current);
          setUploading({ name: doc.fileName, pct: 100 });
          setTimeout(() => {
            setUploading(null);
            onChange({ [slot === "A" ? "docA" : "docB"]: { ...doc, id: slot } });
          }, 240);
        } else {
          setUploading({ name: doc.fileName, pct });
        }
      }, 130);
    },
    [onChange]
  );

  const handleFiles = (files: FileList | null) => {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    const slot = nextSlot();
    if (!slot) return;
    startUpload(fromFile(list[0], slot), slot);
    /* a second file in the same drop fills the other slot once the first lands */
    if (list[1] && slot === "A") {
      setTimeout(() => onChange({ docB: fromFile(list[1], "B") }), 1400);
    }
  };

  const files = [docA, docB].filter(Boolean) as DocumentMeta[];
  const full = files.length >= 2;

  return (
    <div className="flex flex-col gap-6">
      {/* ------------------------------- dropzone ------------------------------- */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative flex flex-col items-center rounded-2xl border border-dashed px-6 py-10 text-center transition-colors duration-standard",
          dragging
            ? "border-brand bg-[rgba(70,100,220,0.07)]"
            : "border-[#C7D3F0] bg-[linear-gradient(180deg,#FBFCFF_0%,#F1F5FE_100%)]"
        )}
      >
        <span className="absolute right-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-[rgba(70,100,220,0.10)] px-2.5 py-1 text-meta font-semibold uppercase tracking-wider text-[#2F45A8]">
          <Sparkles className="h-3 w-3" />
          AI-mapped
        </span>

        {uploading ? (
          <div className="flex w-full max-w-[340px] flex-col gap-2 py-4">
            <div className="flex items-center justify-between text-body-sm">
              <span className="truncate text-muted-foreground">{uploading.name}</span>
              <span className="tabular font-mono">{uploading.pct}%</span>
            </div>
            <Progress value={uploading.pct} />
          </div>
        ) : (
          <>
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface shadow-[0_1px_3px_rgba(10,37,64,0.10)]">
              <Upload className="h-5 w-5 text-brand" />
            </span>

            <p className="mt-4 text-h2 font-semibold tracking-tight">
              {full ? "Both documents uploaded" : "Drop files or click to browse"}
            </p>
            <p className="mt-1.5 max-w-[52ch] text-body text-muted-foreground">
              {full
                ? "Replace either file below, or continue to choose the statements to reconcile."
                : "Upload exactly two files — at least one PDF. We'll detect the statements and map the accounts before comparing anything."}
            </p>

            <Button
              variant="brand"
              size="lg"
              className="mt-5 h-11 rounded-full px-6"
              disabled={full}
              onClick={() => inputRef.current?.click()}
            >
              Browse files
            </Button>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              {FORMATS.map((format) => (
                <span
                  key={format}
                  className="rounded-md border border-border-subtle bg-surface px-2 py-1 font-mono text-helper text-muted-foreground"
                >
                  {format}
                </span>
              ))}
            </div>

            <div className="mt-6 flex w-full max-w-[560px] items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-meta font-semibold uppercase tracking-wider text-muted-foreground">
                Or connect a source
              </span>
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={full}
                onClick={() => {
                  const slot = nextSlot();
                  if (slot) startUpload(SAMPLES[slot === "A" ? 0 : 1], slot);
                }}
              >
                <Database />
                Vault
              </Button>
              {SAMPLES.map((sample, i) => (
                <Button
                  key={sample.fileName}
                  variant="ghost"
                  size="sm"
                  disabled={full || Boolean(i === 0 ? docA : docB)}
                  onClick={() => startUpload(sample, i === 0 ? "A" : "B")}
                >
                  {sample.kind === "pdf" ? <FileText /> : <FileSpreadsheet />}
                  {sample.label}
                </Button>
              ))}
            </div>
          </>
        )}

        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* ------------------------------ uploaded files --------------------------- */}
      <AnimatePresence initial={false}>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-2"
          >
            <div className="flex items-baseline justify-between">
              <span className="text-body-sm font-medium">Documents</span>
              <span className="text-helper text-muted-foreground">
                {files.length} of 2 · {files.some((f) => f.kind === "pdf") ? "PDF present" : "needs a PDF"}
              </span>
            </div>

            {files.map((doc, i) => (
              <div
                key={doc.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    background: doc.kind === "pdf" ? "rgba(220,38,38,0.10)" : "rgba(23,152,100,0.10)",
                    color: doc.kind === "pdf" ? "#DC2626" : "#179864",
                  }}
                >
                  {doc.kind === "pdf" ? (
                    <FileText className="h-4 w-4" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                  )}
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-body font-medium">{doc.fileName}</span>
                    <Tag variant="neutral">{i === 0 ? "Source" : "Comparison"}</Tag>
                    <Tag variant="success">
                      <Check className="h-2.5 w-2.5" />
                      Uploaded
                    </Tag>
                  </div>
                  <span className="tabular font-mono text-helper text-muted-foreground">
                    {doc.kind === "pdf" ? `${doc.pages} pages` : `${doc.sheets?.length} sheets`} ·{" "}
                    {doc.sizeMb} MB · {doc.kind.toUpperCase()}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="iconSm"
                    aria-label={`Replace ${doc.fileName}`}
                    onClick={() => {
                      onChange({ [doc.id === "A" ? "docA" : "docB"]: null });
                      setTimeout(() => inputRef.current?.click(), 0);
                    }}
                  >
                    <RefreshCw />
                  </Button>
                  <Button
                    variant="ghost"
                    size="iconSm"
                    aria-label={`Remove ${doc.fileName}`}
                    onClick={() => onChange({ [doc.id === "A" ? "docA" : "docB"]: null })}
                  >
                    <X />
                  </Button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------------------------- connected sources -------------------------- */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-body-lg font-medium tracking-tight">Connected sources</span>
          <span className="text-helper text-muted-foreground">
            Watching {CONNECTED.length} sources · most recent sync sets dataset freshness.
          </span>
        </div>

        <div className="overflow-hidden rounded-xl border border-border">
          {CONNECTED.map((source, i) => (
            <div
              key={source.name}
              className={cn(
                "flex items-center gap-3 bg-surface px-3 py-2.5",
                i > 0 && "border-t border-border-subtle"
              )}
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-secondary text-muted-foreground">
                <source.icon className="h-4 w-4" />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-body-sm font-medium">{source.name}</span>
                <span className="truncate text-helper text-muted-foreground">{source.detail}</span>
              </span>
              <Tag
                variant={source.state === "Healthy" ? "success" : "critical"}
                className="ml-auto shrink-0"
              >
                {source.state}
              </Tag>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
