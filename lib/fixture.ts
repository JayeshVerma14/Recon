import rawFixture from "@/data/fixture.json";

import type { DocKind } from "@/lib/types";

/**
 * A real reconciliation, read straight out of the two files it produced.
 *
 * `data/fixture.json` is generated — `python scripts/extract_sources.py` reads
 * the workbook and the reviewed PDF in `data/sources/` and writes it. Nothing
 * here is authored by hand, which is the point: the figures, the variances and
 * the agent's own words for why a line did not tie are the ones a reviewer
 * actually sees.
 */

/** How the agent classified a line against one supporting source. */
export type FixtureStatus = "Matched" | "Partial" | "Unmatched";

export interface FixtureDoc {
  id: string;
  fileName: string;
  kind: DocKind;
  label: string;
  sizeMb: number;
  pages?: number;
  sheets?: string[];
}

/** What one source had to say about one line. */
export interface FixtureReading {
  docId: string;
  /** null where the source carried no figure — a caption, or nothing at all. */
  value: number | null;
  status: FixtureStatus;
  /** Wording, where there was no figure to compare. */
  text?: string;
  /** Only present where this source's reason differs from the line's own. */
  reason?: string;
}

export interface FixtureRow {
  id: string;
  account: string;
  /** The sheet in the agent's workbook this line was written on. */
  sheet: string;
  /** Its row there — column B holds the source, column C the filing. */
  sheetRow: number;
  /** The figure the filing prints. */
  working: number | null;
  workingText: string;
  variance: number | null;
  status: FixtureStatus;
  /** "Yes" | "No" | "N/A" — whether the wording matched, where wording matters. */
  textMatch: string;
  /** The agent's own explanation. Empty where there was nothing to explain. */
  reason: string;
  level: 0 | 1;
  isSubtotal: boolean;
  readings: FixtureReading[];
}

export interface FixtureSection {
  id: string;
  label: string;
  shortLabel: string;
  group: string;
  /** Statement this section belongs to — several sections share one family. */
  family: string;
  period: string;
  referenceDoc: string;
  page: number;
  rows: FixtureRow[];
}

/** A finding the agent pinned to a page of the filing. */
export interface FixtureComment {
  page: number;
  kind: string;
  body: string;
}

export interface Fixture {
  entity: string;
  period: string;
  comparisonPeriod: string;
  workingDoc: string;
  documents: FixtureDoc[];
  sections: FixtureSection[];
  comments: FixtureComment[];
}

export const FIXTURE = rawFixture as unknown as Fixture;

export const FIXTURE_SECTIONS = FIXTURE.sections;

const SECTION_BY_ID = new Map(FIXTURE_SECTIONS.map((s) => [s.id, s]));

export function sectionById(id: string): FixtureSection | undefined {
  return SECTION_BY_ID.get(id);
}

/** Every line in the reconciliation, section order preserved. */
export const FIXTURE_ROWS: { section: FixtureSection; row: FixtureRow }[] =
  FIXTURE_SECTIONS.flatMap((section) => section.rows.map((row) => ({ section, row })));

const ROW_BY_ID = new Map(FIXTURE_ROWS.map(({ section, row }) => [row.id, { section, row }]));

export function rowById(id: string) {
  return ROW_BY_ID.get(id);
}

/** The order sections are offered in — front matter, statements, then the rest. */
export const GROUP_ORDER = ["Statements", "Checks", "Notes", "Narrative", "Front matter"];

export function groupsOfSections(sections: FixtureSection[] = FIXTURE_SECTIONS) {
  return GROUP_ORDER.map((group) => ({
    group,
    sections: sections.filter((s) => s.group === group),
  })).filter((g) => g.sections.length > 0);
}
