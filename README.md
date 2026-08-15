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

The reconciled document in the middle is **read-only** — it is the output, not a draft. Nothing in
the viewer writes to it. A comment is closed by a *disposition*, never by applying a value:

| Disposition | Meaning | Recorded |
| --- | --- | --- |
| **Resolve** | checked and agreed, the reconciled figure stands | line approved, entry in review history |
| **Flag source** | the source document needs correcting — back to the preparer | line set to Needs Review, named against the offending document |
| **Dismiss** | immaterial to the reconciliation | note only, no approval |

### Scaling past two sources

A reconciliation is rarely two documents, so the viewer carries five: the filing, the model, a
prior-year 10-K, a trial balance export and a board pack. Three things keep that legible.

**The card collapses agreement.** Outliers are listed with their signed delta; every source that
matches the reconciled figure collapses into one `4 sources agree` line that expands on demand. At
five sources or fifteen the card is the same height, because the interesting fact is who is out.

**The rail groups by shape, not by subset.** Grouping by "which documents disagree" is
combinatorial; grouping by the shape of the disagreement is three stable buckets no matter how many
sources there are:

| Group | Meaning | What to do |
| --- | --- | --- |
| Sources agree, reconciled differs | every source lands on the same figure and the output does not | re-read the extraction |
| One source out | the rest agree | raise a correction against that document |
| Sources split | no majority | someone has to decide which stands |

**The source lens.** A source selector above the panes. Picking one keeps its findings at full
strength and drops the rest to a dimmed outline — still on the page, still clickable, still counted,
so a page never looks cleaner than it is. Alongside it, an optional **agreement grid** puts a strip
of per-source cells beside every line: a red column is a document that is wrong everywhere, a red
row is an account nobody agrees on. Neither the card nor the lens can show that pattern.

Source identity is deliberately *not* encoded in colour — colour already carries review status
(open, resolved, flagged, dismissed), and a second colour dimension would collide with it and break
past four sources.

Every finding also names **which document is the outlier**, because "they differ" is not actionable
on its own — a correction has to be raised against a specific document:

- **Filing differs** — the workbook and the reconciled statement agree; the PDF is out
- **Workbook differs** — the filing and the reconciled statement agree; the model is out
- **Sources disagree** — the two sources contradict each other, and the card shows how far apart

Each card carries a three-row ledger — Reconciled / Filing / Workbook — with `agrees` against the
source that matches and a signed delta against the one that does not, so the odd one out is visible
without arithmetic. Findings are grouped in the rail under those three headings, marks appear only
in the document actually implicated, and selecting a card opens that document's pane.

Three kinds of finding, each with its own anchor and card:

| Kind | Anchored on | Card shows |
| --- | --- | --- |
| **Value** | the number in every page it appears on | the three-source ledger |
| **Formula** | the cell in the workbook | the cell's formula, the defect, the expected formula |
| **Text** | the passage, highlighted in place | word-level diff of the two wordings |

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
