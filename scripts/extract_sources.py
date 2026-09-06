"""Turn a real reconciliation's two files into the fixture the app reads.

The workbook is the agent's output: one sheet per statement, note or check,
each row a line the filing was read against one supporting source. The PDF is
what the reviewer opens — the filing itself, with findings attached as comments.

Neither is parsed at runtime. This writes data/fixture.json, and lib/fixture.ts
types it. Run it again when the sources change:

    python scripts/extract_sources.py
"""

import html
import io
import json
import os
import re
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = os.path.join(ROOT, "data", "sources", "StarMountain_workbook_export.xlsx")
PDF = os.path.join(
    ROOT, "data", "sources", "StarMountain_LMMC_10Q_9.30.25_Draft7_reconciled.pdf"
)
OUT = os.path.join(ROOT, "data", "fixture.json")

# --------------------------------------------------------------------------- #
#                                  the sources                                 #
# --------------------------------------------------------------------------- #

# "B" is the filing under review — every sheet reads against it, so it is the
# working document and never a reference. The rest are what it was read against.
DOCUMENTS = [
    {
        "id": "A",
        "fileName": "StarMountain NAV Proof Q1 9.30.2025 v5.xlsx",
        "kind": "xlsx",
        "label": "NAV Proof",
        "sizeMb": 6.2,
        "sheets": ["SAL", "SoOPS", "Cash Flow", "TB", "Shares", "Support"],
    },
    {
        "id": "B",
        "fileName": "StarMountain LMMC - 10Q - 9.30.25 Draft 7.pdf",
        "kind": "pdf",
        "label": "10-Q Draft 7",
        "sizeMb": 1.1,
        "pages": 58,
    },
    {
        "id": "C",
        "fileName": "StarMountain LMMC - 10Q - 6.30.25 vF.pdf",
        "kind": "pdf",
        "label": "Prior 10-Q (Q2)",
        "sizeMb": 1.0,
        "pages": 56,
    },
    {
        "id": "D",
        "fileName": "Q1 2026 Balances and Valuations_BDC_vSOI_Hardcoded_v8.xlsx",
        "kind": "xlsx",
        "label": "Balances & valuations",
        "sizeMb": 3.4,
        "sheets": ["Balances", "Valuations", "SOI", "Hardcoded"],
    },
]

WORKING_DOC = "B"

# Every sheet in the workbook, in the order a reviewer works through the filing.
#
# `family` and `period` are what let one line carry several readings: sheets
# that reconcile the same statement at the same date are reading the same line
# against different sources, which is the whole point of the comment cards.
#
# A footing sheet reads the filing against itself, so its reference is "B".
SHEETS = [
    # sheet name, id, label, short label, group, family, period, reference, page
    ("Cover-Page-2025", "cover-page", "Cover Page", "Cover", "Front matter", "cover", "", "C", 1),
    ("Table-of-Contents", "table-of-contents", "Table of Contents", "Contents", "Front matter", "toc", "", "C", 2),
    ("Balance-Sheet-SAL-2025", "balance-sheet", "Balance Sheet", "Balance", "Statements", "balance", "2025-09-30", "A", 3),
    ("Balance-Sheet-2024", "balance-sheet-2024", "Balance Sheet — Dec 2024", "Balance 2024", "Statements", "balance", "2024-12-31", "C", 3),
    ("Balance-Sheet-SAL-2024", "balance-sheet-sal-2024", "Balance Sheet — Dec 2024 vs NAV Proof", "Balance SAL 2024", "Statements", "balance", "2024-12-31", "A", 3),
    ("Income-Statement-SoOPS-3M-2025", "income-statement", "Income Statement", "Income", "Statements", "income", "3M-2025", "A", 4),
    ("Income-Statement-SoOPS-3M-2024", "income-statement-2024", "Income Statement — 3M 2024", "Income 2024", "Statements", "income", "3M-2024", "A", 4),
    ("Income Statement", "income-statement-prior", "Income Statement vs prior 10-Q", "Income vs Q2", "Statements", "income", "2025-09-30", "C", 4),
    ("Changes-in-Net-Assets", "changes-in-net-assets", "Changes in Net Assets", "Net Assets", "Statements", "changes", "2025-09-30", "C", 5),
    ("Cash Flow Statement", "cash-flow-statement", "Cash Flow Statement", "Cash Flow", "Statements", "cashflow", "2025-09-30", "C", 6),
    ("Schedule-of-Investments-2025", "schedule-of-investments", "Schedule of Investments", "Investments", "Statements", "soi", "2025-09-30", "C", 7),
    ("Balance-Sheet-Footing", "balance-sheet-footing", "Balance Sheet — footing", "BS footing", "Checks", "balance", "2025-09-30", "B", 3),
    ("Balance-Sheet-Ties", "balance-sheet-ties", "Balance Sheet — ties", "BS ties", "Checks", "balance", "2025-09-30", "D", 3),
    ("Income-Statement-Footing", "income-statement-footing", "Income Statement — footing", "IS footing", "Checks", "income", "2025-09-30", "B", 4),
    ("Cash-Flow-Statement-Footing", "cash-flow-footing", "Cash Flow — footing", "CF footing", "Checks", "cashflow", "2025-09-30", "B", 6),
    ("Cash-Flow-Statement-Support", "cash-flow-support", "Cash Flow — support", "CF support", "Checks", "cashflow", "2025-09-30", "A", 6),
    ("Cash-Flow-Statement-Ties", "cash-flow-ties-nav", "Cash Flow — ties to NAV Proof", "CF ties", "Checks", "cashflow", "2025-09-30", "A", 6),
    ("Cash-Flow-Ties", "cash-flow-ties-prior", "Cash Flow — ties to prior 10-Q", "CF ties Q2", "Checks", "cashflow", "2025-09-30", "C", 6),
    ("Statement-Ties", "statement-ties", "Statement Ties", "Ties", "Checks", "ties", "2025-09-30", "C", 3),
    ("Note-1-2025", "note-1", "Note 1 — Organization", "Note 1", "Notes", "note-1", "2025-09-30", "C", 17),
    ("Note-2-2025", "note-2", "Note 2 — Accounting Policies", "Note 2", "Notes", "note-2", "2025-09-30", "C", 17),
    ("Note-3-2025", "note-3", "Note 3 — Investments", "Note 3", "Notes", "note-3", "2025-09-30", "C", 22),
    ("Note-4-2025", "note-4", "Note 4 — Fair Value", "Note 4", "Notes", "note-4", "2025-09-30", "C", 24),
    ("Note-5-2025", "note-5", "Note 5 — Affiliated Companies", "Note 5", "Notes", "note-5", "2025-09-30", "C", 28),
    ("Note-6", "note-6", "Note 6 — Related Parties", "Note 6", "Notes", "note-6", "2025-09-30", "C", 29),
    ("Note-7-2025", "note-7", "Note 7 — Borrowings", "Note 7", "Notes", "note-7", "2025-09-30", "C", 32),
    ("Note-8-2025", "note-8", "Note 8 — Income Taxes", "Note 8", "Notes", "note-8", "2025-09-30", "C", 33),
    ("Note-9", "note-9", "Note 9 — Stock Issuances", "Note 9", "Notes", "note-9", "2025-09-30", "C", 35),
    ("Note-10", "note-10", "Note 10 — Repurchases", "Note 10", "Notes", "note-10", "2025-09-30", "C", 36),
    ("Note-11-2024", "note-11", "Note 11 — Commitments", "Note 11", "Notes", "note-11", "2025-09-30", "C", 37),
    ("Note-12-2025", "note-12", "Note 12 — Cash", "Note 12", "Notes", "note-12", "2025-09-30", "C", 20),
    ("Presentation", "presentation", "Presentation", "Presentation", "Narrative", "presentation", "", "C", 17),
    ("Narrative-Disclosures", "narrative-disclosures", "Narrative Disclosures", "Narrative", "Narrative", "narrative", "", "C", 29),
    ("MD&A", "mdna", "MD&A", "MD&A", "Narrative", "mdna", "", "C", 40),
]

# --------------------------------------------------------------------------- #
#                                   workbook                                   #
# --------------------------------------------------------------------------- #

CELL = re.compile(r'<c r="([A-Z]+)\d+"[^>]*?(?:/>|>(.*?)</c>)', re.S)
INLINE = re.compile(r"<t[^>]*>(.*?)</t>", re.S)
VALUE = re.compile(r"<v>(.*?)</v>", re.S)
ROW = re.compile(r"<row[^>]*>(.*?)</row>", re.S)

# The four rows every sheet opens with are provenance, not findings.
PREAMBLE = {"Company Name", "Report / Table Name", "Report Date", "Report Year"}


def column_index(letters):
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n - 1


def read_sheet(xml):
    rows = []
    for rm in ROW.finditer(xml):
        cells = {}
        for cm in CELL.finditer(rm.group(1)):
            body = cm.group(2) or ""
            t = INLINE.search(body)
            v = VALUE.search(body)
            text = t.group(1) if t else (v.group(1) if v else "")
            cells[column_index(cm.group(1))] = html.unescape(text).strip()
        rows.append([cells.get(i, "") for i in range(max(cells) + 1)] if cells else [])
    return rows


def read_workbook(path):
    with zipfile.ZipFile(path) as z:
        rels = z.read("xl/_rels/workbook.xml.rels").decode("utf-8")
        targets = {}
        for rel in re.finditer(r"<Relationship([^>]*)/>", rels):
            attrs = dict(re.findall(r'([A-Za-z]+)="([^"]*)"', rel.group(1)))
            if "Id" in attrs and "Target" in attrs:
                targets[attrs["Id"]] = attrs["Target"].lstrip("/")

        book = z.read("xl/workbook.xml").decode("utf-8")
        sheets = {}
        for m in re.finditer(r"<sheet\s([^>]*)/>", book):
            attrs = dict(re.findall(r'([A-Za-z:]+)="([^"]*)"', m.group(1)))
            name, rid = html.unescape(attrs.get("name", "")), attrs.get("r:id", "")
            if name and targets.get(rid):
                sheets[name] = read_sheet(z.read(targets[rid]).decode("utf-8"))
    return sheets


def parse_number(raw):
    """Figures arrive as text: some parenthesised, some carrying float noise."""
    if raw in ("", "N/A", "-", "—"):
        return None
    text = raw.replace(",", "").replace("$", "").strip()
    negative = text.startswith("(") and text.endswith(")")
    if negative:
        text = text[1:-1]
    try:
        value = float(text)
    except ValueError:
        return None
    value = -value if negative else value
    return round(value, 2)


def findings(rows):
    header_at = next((i for i, r in enumerate(rows) if r and r[0] == "Line Item"), None)
    if header_at is None:
        return []
    out = []
    for offset, r in enumerate(rows[header_at + 1 :]):
        if not r or not r[0] or r[0] in PREAMBLE:
            continue
        # the row this line occupies in the agent's own workbook
        sheet_row = header_at + offset + 2
        cell = lambda i: r[i] if len(r) > i else ""  # noqa: E731
        out.append(
            {
                "account": r[0],
                "sheetRow": sheet_row,
                "referenceText": cell(1),
                "workingText": cell(2),
                "referenceValue": parse_number(cell(1)),
                "workingValue": parse_number(cell(2)),
                "variance": parse_number(cell(3)),
                "status": cell(4) or "Matched",
                "textMatch": cell(5),
                "reason": cell(6) if cell(6) != "N/A" else "",
            }
        )
    return out


# --------------------------------------------------------------------------- #
#                              shape of a line                                 #
# --------------------------------------------------------------------------- #

SUBTOTAL = re.compile(r"^(total|net (increase|decrease|assets|investment)|gross )", re.I)


def shape(account):
    """A caption, a subtotal, or a line — inferred from how the filing reads."""
    if account.endswith(":") and not re.search(r"\d", account):
        return 0, False
    if SUBTOTAL.match(account):
        return 0, True
    return 1, False


def base_account(account):
    """Sheets suffix the period onto the line; the line itself is the key."""
    return account.split(" — ")[0].strip()


# --------------------------------------------------------------------------- #
#                                     pdf                                      #
# --------------------------------------------------------------------------- #


def read_annotations(path):
    try:
        import fitz  # PyMuPDF
    except ImportError:
        print("PyMuPDF not installed — no PDF comments extracted", file=sys.stderr)
        return []

    doc = fitz.open(path)
    out = []
    for index, page in enumerate(doc):
        for annot in page.annots() or []:
            body = (annot.info.get("content") or "").strip()
            if body:
                out.append({"page": index + 1, "kind": annot.info.get("title", ""), "body": body})
    return out


# --------------------------------------------------------------------------- #

def main():
    raw = read_workbook(XLSX)
    missing = [s[0] for s in SHEETS if s[0] not in raw]
    if missing:
        print("sheets named in this script but absent from the workbook:", missing, file=sys.stderr)

    # every reading of a line, keyed by the statement and date it was read at
    by_line = {}
    for name, sid, _l, _s, _g, family, period, ref, _p in SHEETS:
        for row in findings(raw.get(name, [])):
            key = (family, period, base_account(row["account"]))
            by_line.setdefault(key, []).append((ref, name, row))

    sections = []
    for name, sid, label, short, group, family, period, ref, page in SHEETS:
        rows = []
        for index, row in enumerate(findings(raw.get(name, []))):
            key = (family, period, base_account(row["account"]))
            level, is_subtotal = shape(row["account"])

            # this sheet's own reading first, so a sibling never displaces it
            siblings = by_line.get(key, [])
            ordered = [s for s in siblings if s[1] == name] + [
                s for s in siblings if s[1] != name
            ]
            readings = []
            for other_ref, _sheet, other in ordered:
                if any(r["docId"] == other_ref for r in readings):
                    continue
                reading = {
                    "docId": other_ref,
                    "value": other["referenceValue"],
                    "status": other["status"],
                }
                # text only where there is no figure to compare, and the reason
                # only where it says something the row's own does not
                if other["referenceValue"] is None and other["referenceText"]:
                    reading["text"] = other["referenceText"]
                if other["reason"] and other["reason"] != row["reason"]:
                    reading["reason"] = other["reason"]
                readings.append(reading)

            rows.append(
                {
                    "id": "%s-%02d" % (sid, index + 1),
                    "account": row["account"],
                    "sheet": name,
                    "sheetRow": row["sheetRow"],
                    "working": row["workingValue"],
                    "workingText": row["workingText"],
                    "variance": row["variance"],
                    "status": row["status"],
                    "textMatch": row["textMatch"],
                    "reason": row["reason"],
                    "level": level,
                    "isSubtotal": is_subtotal,
                    "readings": readings,
                }
            )

        sections.append(
            {
                "id": sid,
                "label": label,
                "shortLabel": short,
                "group": group,
                "family": family,
                "period": period,
                "referenceDoc": ref,
                "page": page,
                "rows": rows,
            }
        )

    payload = {
        "entity": "Star Mountain Lower Middle-Market Capital Corp.",
        "period": "Q3 2025",
        "comparisonPeriod": "Q2 2025",
        "workingDoc": WORKING_DOC,
        "documents": DOCUMENTS,
        "sections": sections,
        "comments": read_annotations(PDF),
    }
    io.open(OUT, "w", encoding="utf-8").write(json.dumps(payload, ensure_ascii=False, indent=1))

    total = sum(len(s["rows"]) for s in sections)
    open_rows = sum(1 for s in sections for r in s["rows"] if r["status"] != "Matched")
    print("%d sections, %d lines, %d open" % (len(sections), total, open_rows))
    print("%d PDF comments" % len(payload["comments"]))
    print("wrote", os.path.relpath(OUT, ROOT))


if __name__ == "__main__":
    main()
