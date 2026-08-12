"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, FileSpreadsheet, FileText, RefreshCw, Upload, X } from "lucide-react";

import { Button, Progress, Tag } from "@/components/element";
import { cn } from "@/lib/utils";
import type { DocumentMeta } from "@/lib/types";

const SAMPLES: Record<"A" | "B", DocumentMeta[]> = {
  A: [
    {
      id: "A",
      fileName: "Annual_Report_2024.pdf",
      kind: "pdf",
      sizeMb: 18.3,
      pages: 219,
      label: "Annual Report",
    },
    {
      id: "A",
      fileName: "Audited_Financials_2024.pdf",
      kind: "pdf",
      sizeMb: 12.6,
      pages: 142,
      label: "Audited Financials",
    },
  ],
  B: [
    {
      id: "B",
      fileName: "Financial_Model_v12.xlsx",
      kind: "xlsx",
      sizeMb: 4.7,
      sheets: ["Cover", "IS_Model", "BS_Model", "CF_Model", "Assumptions", "Debt schedule"],
      label: "Financial Model",
    },
    {
      id: "B",
      fileName: "Management_Accounts_2024.pdf",
      kind: "pdf",
      sizeMb: 7.4,
      pages: 88,
      label: "Management Accounts",
    },
  ],
};

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

export function UploadZone({
  slot,
  title,
  description,
  value,
  onChange,
}: {
  slot: "A" | "B";
  title: string;
  description: string;
  value: DocumentMeta | null;
  onChange: (doc: DocumentMeta | null) => void;
}) {
  const [dragging, setDragging] = React.useState(false);
  const [progress, setProgress] = React.useState<number | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const timer = React.useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => () => void (timer.current && clearInterval(timer.current)), []);

  const startUpload = React.useCallback(
    (doc: DocumentMeta) => {
      if (timer.current) clearInterval(timer.current);
      setProgress(0);
      onChange(null);
      let pct = 0;
      timer.current = setInterval(() => {
        pct += 9 + Math.round(Math.random() * 14);
        if (pct >= 100) {
          if (timer.current) clearInterval(timer.current);
          setProgress(100);
          setTimeout(() => {
            setProgress(null);
            onChange(doc);
          }, 260);
        } else {
          setProgress(pct);
        }
      }, 140);
    },
    [onChange]
  );

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    startUpload(fromFile(file, slot));
  };

  const uploading = progress !== null;
  const Icon = value?.kind === "xlsx" ? FileSpreadsheet : FileText;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-body-sm font-medium">{title}</span>
        <span className="text-meta text-muted-foreground">{description}</span>
      </div>

      {value ? (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3"
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: value.kind === "pdf" ? "rgba(220,38,38,0.10)" : "rgba(23,152,100,0.10)",
              color: value.kind === "pdf" ? "#DC2626" : "#179864",
            }}
          >
            <Icon className="h-4 w-4" />
          </span>

          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-body font-medium">{value.fileName}</span>
              <Tag variant="success" className="shrink-0">
                <Check className="h-2.5 w-2.5" />
                Uploaded
              </Tag>
            </div>
            <span className="tabular font-mono text-helper text-muted-foreground">
              {value.kind === "pdf"
                ? `${value.pages} pages`
                : `${value.sheets?.length} sheets`}{" "}
              · {value.sizeMb} MB · {value.kind.toUpperCase()}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="iconSm"
              aria-label="Replace document"
              onClick={() => inputRef.current?.click()}
            >
              <RefreshCw />
            </Button>
            <Button
              variant="ghost"
              size="iconSm"
              aria-label="Remove document"
              onClick={() => onChange(null)}
            >
              <X />
            </Button>
          </div>
        </motion.div>
      ) : (
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
            "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-8 text-center transition-colors duration-fast",
            dragging ? "border-brand bg-[rgba(70,100,220,0.05)]" : "border-border bg-surface-secondary/40"
          )}
        >
          {uploading ? (
            <div className="flex w-full max-w-[320px] flex-col gap-2">
              <div className="flex items-center justify-between text-helper">
                <span className="text-muted-foreground">Uploading…</span>
                <span className="tabular font-mono">{progress}%</span>
              </div>
              <Progress value={progress ?? 0} />
            </div>
          ) : (
            <>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[rgba(70,100,220,0.10)] text-brand">
                <Upload className="h-4 w-4" />
              </span>
              <p className="text-body-sm font-medium">Drop a document here</p>
              <p className="text-helper text-muted-foreground">PDF or Excel · up to 50 MB</p>
              <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
                <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
                  Browse files
                </Button>
                {SAMPLES[slot].map((sample) => (
                  <Button
                    key={sample.fileName}
                    size="sm"
                    variant="ghost"
                    onClick={() => startUpload(sample)}
                  >
                    {sample.label}
                  </Button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
