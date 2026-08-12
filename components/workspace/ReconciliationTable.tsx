"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  ChevronDown,
  Filter,
  MessageSquarePlus,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Sparkles,
  Undo2,
  X,
} from "lucide-react";

import { ReviewStatusTag } from "@/components/app/StatusPills";
import {
  AIConfidenceBadge,
  Avatar,
  Button,
  Checkbox,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Popover,
  PopoverContent,
  PopoverTrigger,
  SearchInput,
  Select,
  Switch,
  Tag,
  Textarea,
  Tooltip,
} from "@/components/element";
import { NOW, statementLabel } from "@/lib/mock";
import {
  STATUS_LABEL,
  countByStatus,
  difference,
  effectiveValue,
  formatDifference,
  formatValue,
  isReviewed,
  relativeTime,
} from "@/lib/derive";
import { useActiveProject, useStore, type StatusFilter } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { LineItem, ReviewStatus } from "@/lib/types";

const FILTER_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "matched", label: "Matched" },
  { value: "mismatched", label: "Mismatched" },
  { value: "needs_review", label: "Needs Review" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "edited", label: "Edited" },
];

export function ReconciliationTable() {
  const project = useActiveProject();
  const statement = useStore((s) => s.statement);
  const filters = useStore((s) => s.filters);
  const setFilters = useStore((s) => s.setFilters);
  const resetFilters = useStore((s) => s.resetFilters);
  const selection = useStore((s) => s.selection);
  const toggleSelect = useStore((s) => s.toggleSelect);
  const selectMany = useStore((s) => s.selectMany);
  const clearSelection = useStore((s) => s.clearSelection);
  const activeItemId = useStore((s) => s.activeItemId);
  const setActiveItem = useStore((s) => s.setActiveItem);
  const setStatement = useStore((s) => s.setStatement);
  const setStatus = useStore((s) => s.setStatus);
  const editValue = useStore((s) => s.editValue);
  const revertEdit = useStore((s) => s.revertEdit);
  const addNote = useStore((s) => s.addNote);

  const [editing, setEditing] = React.useState<string | null>(null);
  const [noteFor, setNoteFor] = React.useState<LineItem | null>(null);
  const [noteDraft, setNoteDraft] = React.useState("");

  const statementItems = React.useMemo(
    () => project.items.filter((i) => i.statement === statement),
    [project.items, statement]
  );

  const counts = React.useMemo(() => countByStatus(statementItems), [statementItems]);

  const rows = React.useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return statementItems.filter((item) => {
      if (filters.status !== "all" && item.status !== filters.status) return false;
      if (filters.unreviewedOnly && isReviewed(item)) return false;
      if (filters.confidence !== "all") {
        const c = item.confidence;
        if (filters.confidence === "high" && c < 90) return false;
        if (filters.confidence === "medium" && (c < 70 || c >= 90)) return false;
        if (filters.confidence === "low" && c >= 70) return false;
      }
      if (query && !item.account.toLowerCase().includes(query) && !item.section.toLowerCase().includes(query))
        return false;
      return true;
    });
  }, [statementItems, filters]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, LineItem[]>();
    rows.forEach((item) => {
      const list = map.get(item.section) ?? [];
      list.push(item);
      map.set(item.section, list);
    });
    return Array.from(map.entries());
  }, [rows]);

  const allSelected = rows.length > 0 && rows.every((r) => selection.includes(r.id));
  const someSelected = selection.length > 0 && !allSelected;

  /* keyboard review — j/k to move, a/r to decide */
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable) return;
      if (!rows.length) return;
      const index = rows.findIndex((r) => r.id === activeItemId);

      if (e.key === "j" || e.key === "ArrowDown") {
        e.preventDefault();
        setActiveItem(rows[Math.min(rows.length - 1, index + 1)]?.id ?? rows[0].id);
      } else if (e.key === "k" || e.key === "ArrowUp") {
        e.preventDefault();
        setActiveItem(rows[Math.max(0, index - 1)]?.id ?? rows[0].id);
      } else if (activeItemId && (e.key === "a" || e.key === "r")) {
        e.preventDefault();
        setStatus([activeItemId], e.key === "a" ? "approved" : "rejected");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rows, activeItemId, setActiveItem, setStatus]);

  const openNote = (item: LineItem) => {
    setNoteFor(item);
    setNoteDraft(item.note ?? "");
  };

  return (
    <div className="flex h-full min-w-0 flex-col">
      {/* ------------------------------- toolbar ------------------------------- */}
      <div className="shrink-0 border-b border-border-subtle bg-surface/80 backdrop-blur-sm">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin px-3 pt-2.5">
          {FILTER_TABS.map((tab) => {
            const count =
              tab.value === "all" ? statementItems.length : (counts[tab.value as ReviewStatus] ?? 0);
            const active = filters.status === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilters({ status: tab.value })}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-[12px] font-medium transition-all duration-fast",
                  active
                    ? "bg-foreground text-background shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.label}
                <span
                  className={cn(
                    "tabular font-mono text-[11px]",
                    active ? "text-background/70" : "text-muted-foreground/70"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 px-2 py-2.5">
          <SearchInput
            placeholder="Search accounts"
            value={filters.query}
            onChange={(e) => setFilters({ query: e.target.value })}
            wrapperClassName="w-[220px]"
          />

          <Select
            className="h-8 w-[150px] text-body-sm"
            value={statement}
            onChange={(e) => setStatement(e.target.value as LineItem["statement"])}
          >
            {project.statements.map((s) => (
              <option key={s} value={s}>
                {statementLabel(s)}
              </option>
            ))}
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter />
                Confidence
                {filters.confidence !== "all" && (
                  <Tag variant="brand" className="ml-1">
                    {filters.confidence}
                  </Tag>
                )}
                <ChevronDown />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[220px] p-2">
              <p className="px-1 pb-1.5 text-meta uppercase tracking-wider text-muted-foreground">
                Agent confidence
              </p>
              {[
                { value: "all", label: "Any confidence" },
                { value: "high", label: "High · 90% and above" },
                { value: "medium", label: "Medium · 70–89%" },
                { value: "low", label: "Low · below 70%" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFilters({ confidence: opt.value as typeof filters.confidence })}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-body-sm transition-colors duration-fast hover:bg-surface-secondary",
                    filters.confidence === opt.value && "font-medium text-foreground"
                  )}
                >
                  {opt.label}
                  {filters.confidence === opt.value && <Check className="ml-auto h-3.5 w-3.5" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border px-2 py-1.5">
            <Switch
              checked={filters.unreviewedOnly}
              onCheckedChange={(v) => setFilters({ unreviewedOnly: v })}
            />
            <span className="text-body-sm text-muted-foreground">Unreviewed only</span>
          </label>

          {(filters.status !== "all" ||
            filters.query ||
            filters.confidence !== "all" ||
            filters.unreviewedOnly) && (
            <Button variant="ghost" size="sm" onClick={resetFilters}>
              <RotateCcw />
              Clear
            </Button>
          )}

          <span className="ml-auto whitespace-nowrap text-helper text-muted-foreground">
            {rows.length} of {statementItems.length} accounts
          </span>
        </div>
      </div>

      {/* -------------------------------- table -------------------------------- */}
      <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10 bg-[#F9FBFD]">
            <tr className="border-b border-border">
              <th className="w-8 px-2 py-2.5">
                <Checkbox
                  aria-label="Select all"
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={(v) => (v ? selectMany(rows.map((r) => r.id)) : clearSelection())}
                />
              </th>
              <Th className="w-[184px] text-left">Account</Th>
              <Th className="text-right">{project.docA.label}</Th>
              <Th className="text-right">{project.docB.label}</Th>
              <Th className="text-right">Difference</Th>
              <Th className="text-left">Status</Th>
              <Th className="text-left">Conf.</Th>
              <Th className="w-[76px] text-left">Src</Th>
              <Th className="sticky right-0 w-[108px] border-l border-border bg-[#F9FBFD] text-right">
                Review
              </Th>
            </tr>
          </thead>

          <tbody>
            {grouped.map(([section, items]) => (
              <React.Fragment key={section}>
                <tr className="bg-surface-secondary/60">
                  <td colSpan={9} className="px-2 py-1.5">
                    <span className="text-meta font-semibold uppercase tracking-wider text-muted-foreground">
                      {section}
                    </span>
                  </td>
                </tr>

                {items.map((item) => {
                  const diff = difference(item);
                  const isActive = activeItemId === item.id;
                  const isSelected = selection.includes(item.id);
                  const edited = item.editedValue !== undefined;

                  return (
                    <tr
                      key={item.id}
                      data-selected={isSelected}
                      data-active={isActive}
                      onClick={() => setActiveItem(item.id)}
                      className={cn(
                        "group cursor-pointer border-b border-border-subtle transition-colors duration-fast",
                        "hover:bg-surface-secondary/60",
                        isSelected && "bg-[rgba(70,100,220,0.05)]",
                        isActive && "bg-[rgba(70,100,220,0.07)]"
                      )}
                    >
                      <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          aria-label={`Select ${item.account}`}
                          checked={isSelected}
                          onCheckedChange={() => toggleSelect(item.id)}
                        />
                      </td>

                      <td className="px-2 py-1.5">
                        <div
                          className={cn("flex items-center gap-1.5", item.level === 1 && "pl-3")}
                        >
                          <span
                            className={cn(
                              "truncate text-body-sm",
                              item.isSubtotal ? "font-medium text-foreground" : "text-foreground",
                              item.level === 1 && "text-muted-foreground"
                            )}
                          >
                            {item.account}
                          </span>
                          {item.note && (
                            <Tooltip content={item.note}>
                              <MessageSquarePlus className="h-3 w-3 shrink-0 text-muted-foreground" />
                            </Tooltip>
                          )}
                        </div>
                      </td>

                      <ValueCell
                        item={item}
                        value={item.valueA}
                        doc="A"
                        onOpen={() => setActiveItem(item.id, "A")}
                      />

                      <td
                        className="px-2 py-1.5 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {editing === item.id ? (
                          <InlineEditor
                            initial={effectiveValue(item)}
                            onCancel={() => setEditing(null)}
                            onCommit={(v) => {
                              editValue(item.id, v);
                              setEditing(null);
                            }}
                          />
                        ) : (
                          <button
                            type="button"
                            onDoubleClick={() => setEditing(item.id)}
                            onClick={() => setActiveItem(item.id, "B")}
                            className="group/val inline-flex items-baseline gap-1.5 rounded px-1 py-0.5 transition-colors duration-fast hover:bg-[rgba(70,100,220,0.08)]"
                          >
                            {edited && (
                              <span className="tabular font-mono text-meta text-muted-foreground line-through">
                                {formatValue(item.valueB, item.unit)}
                              </span>
                            )}
                            <span
                              className={cn(
                                "tabular font-mono text-body-sm",
                                edited ? "font-medium text-[#6D28D9]" : "text-foreground"
                              )}
                            >
                              {formatValue(effectiveValue(item), item.unit)}
                            </span>
                          </button>
                        )}
                      </td>

                      <td className="px-2 py-1.5 text-right">
                        <span
                          className={cn(
                            "tabular font-mono text-body-sm",
                            diff === 0
                              ? "text-muted-foreground/60"
                              : item.status === "needs_review"
                                ? "text-[#B45309]"
                                : "text-[#B91C1C]"
                          )}
                        >
                          {formatDifference(diff, item.unit)}
                        </span>
                      </td>

                      <td className="px-2 py-1.5">
                        <ReviewStatusTag status={item.status} />
                      </td>

                      <td className="px-2 py-1.5">
                        <Tooltip
                          content={`Agent confidence in the extraction and mapping of this account: ${item.confidence}%`}
                        >
                          <span>
                            <AIConfidenceBadge confidence={item.confidence} valueOnly />
                          </span>
                        </Tooltip>
                      </td>

                      <td className="px-2 py-1.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-1">
                          <SourceChip
                            label={`p.${item.sourceA.page}`}
                            onClick={() => setActiveItem(item.id, "A")}
                          />
                          <SourceChip
                            label={item.sourceB.cell ?? `p.${item.sourceB.page}`}
                            onClick={() => setActiveItem(item.id, "B")}
                          />
                        </div>
                      </td>

                      <td
                        className={cn(
                          "sticky right-0 border-l border-border-subtle px-2 py-1.5",
                          isActive
                            ? "bg-[#F1F4FD]"
                            : isSelected
                              ? "bg-[#F5F7FE]"
                              : "bg-surface group-hover:bg-[#F7FAFC]"
                        )}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-0.5">
                          {item.reviewer && isReviewed(item) ? (
                            <Tooltip
                              content={`${STATUS_LABEL[item.status]} by ${item.reviewer} · ${relativeTime(
                                item.reviewedAt ?? "",
                                NOW
                              )}`}
                            >
                              <span className="mr-1 group-hover:hidden">
                                <Avatar name={item.reviewer} size="xs" />
                              </span>
                            </Tooltip>
                          ) : null}

                          <div className="hidden items-center gap-0.5 group-hover:flex focus-within:flex">
                            <Tooltip content="Approve (a)">
                              <Button
                                variant="ghost"
                                size="iconXs"
                                aria-label="Approve"
                                onClick={() => setStatus([item.id], "approved")}
                              >
                                <Check className="text-success" />
                              </Button>
                            </Tooltip>
                            <Tooltip content="Reject (r)">
                              <Button
                                variant="ghost"
                                size="iconXs"
                                aria-label="Reject"
                                onClick={() => setStatus([item.id], "rejected")}
                              >
                                <X className="text-critical" />
                              </Button>
                            </Tooltip>
                            <Tooltip content="Edit value">
                              <Button
                                variant="ghost"
                                size="iconXs"
                                aria-label="Edit value"
                                onClick={() => setEditing(item.id)}
                              >
                                <Pencil />
                              </Button>
                            </Tooltip>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="iconXs" aria-label="More actions">
                                <MoreHorizontal />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuLabel>{item.account}</DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => setStatus([item.id], "needs_review")}>
                                <Sparkles />
                                Mark for review
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => openNote(item)}>
                                <MessageSquarePlus />
                                {item.note ? "Edit note" : "Add note"}
                              </DropdownMenuItem>
                              {item.editedValue !== undefined && (
                                <DropdownMenuItem onSelect={() => revertEdit(item.id)}>
                                  <Undo2 />
                                  Revert to extracted value
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => setActiveItem(item.id, "A")}>
                                Open in {project.docA.label}
                              </DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setActiveItem(item.id, "B")}>
                                Open in {project.docB.label}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </React.Fragment>
            ))}

            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-16 text-center">
                  <p className="text-body font-medium">No accounts match these filters</p>
                  <p className="mt-1 text-body-sm text-muted-foreground">
                    Try clearing the status filter or searching for a different account.
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={resetFilters}>
                    Clear filters
                  </Button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ------------------------------ bulk review ----------------------------- */}
      <AnimatePresence>
        {selection.length > 0 && (
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="shrink-0 border-t border-border bg-surface px-2 py-2.5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-body-sm font-medium">{selection.length} items selected</span>
              <span className="text-helper text-muted-foreground">
                in {statementLabel(statement)}
              </span>
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <Button
                  variant="successSoft"
                  size="sm"
                  onClick={() => {
                    setStatus(selection, "approved");
                    clearSelection();
                  }}
                >
                  <Check />
                  Approve selected
                </Button>
                <Button
                  variant="destructiveSoft"
                  size="sm"
                  onClick={() => {
                    setStatus(selection, "rejected");
                    clearSelection();
                  }}
                >
                  <X />
                  Reject selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatus(selection, "needs_review");
                    clearSelection();
                  }}
                >
                  Mark for review
                </Button>
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  Clear
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* -------------------------------- notes -------------------------------- */}
      <Dialog open={Boolean(noteFor)} onOpenChange={(open) => !open && setNoteFor(null)}>
        <DialogContent>
          <DialogHeader
            title="Add note"
            description={noteFor ? `${noteFor.account} · ${statementLabel(noteFor.statement)}` : ""}
          />
          <DialogBody>
            <Textarea
              rows={4}
              autoFocus
              placeholder="Explain what you checked, or what the next reviewer should look at."
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
            />
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNoteFor(null)}>
              Cancel
            </Button>
            <Button
              variant="brand"
              onClick={() => {
                if (noteFor) addNote(noteFor.id, noteDraft);
                setNoteFor(null);
              }}
            >
              Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* --------------------------------- helpers --------------------------------- */

function Th({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <th
      className={cn(
        "px-2 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground",
        className
      )}
    >
      {children}
    </th>
  );
}

function ValueCell({
  item,
  value,
  doc,
  onOpen,
}: {
  item: LineItem;
  value: number;
  doc: "A" | "B";
  onOpen: () => void;
}) {
  return (
    <td className="px-2 py-1.5 text-right" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={onOpen}
        title={`Open source · ${doc === "A" ? `page ${item.sourceA.page}` : item.sourceB.cell}`}
        className="tabular rounded px-1 py-0.5 font-mono text-body-sm transition-colors duration-fast hover:bg-[rgba(70,100,220,0.08)]"
      >
        {formatValue(value, item.unit)}
      </button>
    </td>
  );
}

function SourceChip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="tabular rounded border border-border-subtle bg-surface-secondary px-1 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors duration-fast hover:border-brand/40 hover:text-brand"
    >
      {label}
    </button>
  );
}

function InlineEditor({
  initial,
  onCommit,
  onCancel,
}: {
  initial: number;
  onCommit: (value: number) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = React.useState(String(initial));

  return (
    <span className="inline-flex items-center gap-1">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const parsed = Number(value.replace(/[^0-9.-]/g, ""));
            if (!Number.isNaN(parsed)) onCommit(parsed);
          }
          if (e.key === "Escape") onCancel();
        }}
        onBlur={onCancel}
        className="tabular h-6 w-24 rounded border border-brand bg-surface px-1.5 text-right font-mono text-body-sm"
      />
      <Button
        variant="ghost"
        size="iconXs"
        aria-label="Save value"
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          const parsed = Number(value.replace(/[^0-9.-]/g, ""));
          if (!Number.isNaN(parsed)) onCommit(parsed);
        }}
      >
        <Check className="text-success" />
      </Button>
    </span>
  );
}
