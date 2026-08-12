"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Braces, Check, ChevronDown, Download, FileSpreadsheet, FileText, Table2 } from "lucide-react";

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  useToast,
} from "@/components/element";

const FORMATS = [
  { id: "xlsx", label: "Excel Workbook", hint: ".xlsx · 4 tabs", icon: FileSpreadsheet },
  { id: "pdf", label: "PDF Report", hint: ".pdf · formatted", icon: FileText },
  { id: "csv", label: "CSV", hint: ".csv · flat rows", icon: Table2 },
  { id: "json", label: "JSON", hint: ".json · with source refs", icon: Braces },
];

export function ExportMenu({
  label = "Export",
  scopeLabel,
  variant = "outline",
  size = "sm",
}: {
  label?: string;
  scopeLabel?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
}) {
  const toast = useToast();
  const [done, setDone] = React.useState<string | null>(null);

  const run = (format: string, name: string) => {
    setDone(format);
    toast(`Report exported successfully · ${name}`);
    setTimeout(() => setDone(null), 2000);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTriggerButton variant={variant} size={size} label={label} done={Boolean(done)} />
      <DropdownMenuContent className="w-[248px]">
        <DropdownMenuLabel>{scopeLabel ?? "Export reconciliation"}</DropdownMenuLabel>
        {FORMATS.map((format) => (
          <DropdownMenuItem key={format.id} onSelect={() => run(format.id, format.label)}>
            <format.icon />
            <span className="flex min-w-0 flex-col">
              <span className="truncate">{format.label}</span>
              <span className="text-meta text-muted-foreground">{format.hint}</span>
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => run("email", "Emailed to reviewers")}>
          <Download />
          Send to reviewers
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Trigger kept separate so the check-mark confirmation can animate in place. */
function DropdownMenuTriggerButton({
  variant,
  size,
  label,
  done,
}: {
  variant: React.ComponentProps<typeof Button>["variant"];
  size: React.ComponentProps<typeof Button>["size"];
  label: string;
  done: boolean;
}) {
  return (
    <DropdownMenuTrigger asChild>
      <Button variant={variant} size={size}>
        {done ? (
          <motion.span
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-1.5"
          >
            <Check className="text-success" />
            Exported
          </motion.span>
        ) : (
          <>
            <Download />
            {label}
            <ChevronDown />
          </>
        )}
      </Button>
    </DropdownMenuTrigger>
  );
}
