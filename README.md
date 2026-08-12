# elimentary reconcile — Financial Reconciliation Agent (prototype)

A frontend-only prototype of an enterprise financial reconciliation product: an agent extracts and
compares two financial documents, and an analyst reviews, edits and signs off every number.

No backend, no AI calls, no real extraction. All state is local and seeded with realistic mock data.

```bash
npm install
npm run dev   # http://localhost:3200
```

## Stack

- **Next.js 14.2** (App Router) · **TypeScript** · **Tailwind CSS 3.4**
- **Element design system** — implemented in `components/element` from the Elimentary spec
  (tokens, type scale, pill/tag rules, brand button skins). No shadcn/ui.
- **Radix UI** primitives for dialog / dropdown / popover / tooltip / checkbox / switch / tabs
- **Framer Motion** for panel, toast, highlight and stage transitions
- **lucide-react** icons · **zustand** for review state

## Routes

| Route | What it is |
| --- | --- |
| `/` | Document Reconciliation agent — workbook (spreadsheet) + Reports tab + reconciled-PDF viewer |
| `/new` | Three-step flow: upload → configure → run agent |
| `/workspace/[id]` | Three-panel review workspace (statements · reconciliation table · source viewer) |
| `/reports` | Generated reconciliation reports, one per project |
| `/reports/[id]` | Report view and structural editor |

## The model

Every reconciled number carries the full chain the product is built around:

```
value → difference → status → confidence → source → reviewer → decision
```

- `lib/types.ts` — `LineItem`, `SourceRef`, `ReviewEvent`, `Project`, `ReportDoc`
- `lib/mock.ts` — three complete statements (income, balance sheet, cash flow) for Acme Corp FY2024,
  73 accounts, internally consistent: the cost-of-sales difference is a presentation reclassification
  that nets to zero at EBITDA, the tax difference flows to net income, retained earnings and cash.
- `lib/derive.ts` — difference, progress, status counts, number formatting (tabular, ISO dates)
- `lib/store.ts` — review actions, edits, notes, history, bulk decisions, report structure

## The two main surfaces

**Workbook** (`/`) — an agent page inside the workspace shell: breadcrumb header, a
Workbook / Reports card, formula bar, spreadsheet grid and sheet tabs. Tabs are generated from the
reconciliation: a Table of Contents, a Cover Page, and one tab per statement whose value columns are
named after the two source files. Clicking a `Src` cell (or double-clicking any linked cell) opens
that line in the reconciled PDF.

**Reconciled PDF viewer** — reference pane, working pane and a comments rail.
The left pane is the *reference*, and it switches renderer by file type: the filing renders as a
PDF page, the supporting workbook renders as a real spreadsheet — column letters, row numbers, sheet
tabs, and a formula bar showing what is actually in the selected cell. Flagged cells are tinted
amber and carry the same number as their comment.

Three kinds of finding, each with its own anchor and card:

| Kind | Anchored on | Card shows | Resolutions |
| --- | --- | --- | --- |
| **Value** | the number in both pages | working / reference / difference | Accept working · Use reference · Dismiss |
| **Formula** | the cell in the workbook | the cell's formula, the defect, the expected formula | Accept working · Apply expected · Dismiss |
| **Text** | the passage, highlighted in place | word-level diff of the two wordings | Use reference wording · Keep working · Dismiss |

Text findings highlight the passage inside the narrative notes on both pages, with the comment
number attached to the highlight. When a passage exists on one side only, the working page shows a
dashed "Passage not found on this document" block instead.
Marks: tick / cross tool (`t` / `c`), click a line to mark it, click the mark to clear it. Comments
are cards, not a banner — each shows working vs reference vs difference, the agent's reason, and
three resolutions: **Accept working**, **Use reference** (writes the reference value into the
working document as an edit), **Dismiss**. Resolving turns the numbered red mark green, moves the
card to Resolved, and writes a decision into the item's review history. `n` / `p` walk the
unresolved ones; hovering a line highlights the same account in the other pane; **Sync scroll**
keeps the panes together.

## What works

- Drag-and-drop or sample-document upload with progress, page/sheet counts, replace and remove
- Statement multi-select, reporting period, exact / rounding / custom tolerance matching
- A six-stage agent run with expandable stages and per-step evidence, not a spinner
- Filter by status, search, confidence filter, unreviewed-only, per-statement navigation
- Row selection with bulk approve / reject / mark for review, and a live selection count
- Inline value editing (double-click the comparison value) with `72,450 → 72,900` provenance and revert
- Approve / reject / needs-review per row, notes, and a review history with mock multi-reviewer decisions
- Click any value to open its page or cell, with the number highlighted in the mocked viewer
- Report editing: title, summary, section order, section visibility, columns per section,
  per-account inclusion, section notes — statements are not forced into one template
- Export menu (Excel / PDF / CSV / JSON) with a confirmation toast

Keyboard: `j` / `k` move between rows, `a` approves, `r` rejects.

## Notes

- `NOW` in `lib/mock.ts` is a fixed clock so relative timestamps are deterministic between
  server render and hydration.
- Panels in the workspace are drag-resizable; the source panel can be collapsed from the top bar.
