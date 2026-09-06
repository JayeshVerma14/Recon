import type { DocumentMeta } from "@/lib/types";

/**
 * The agent's findings, said in a way a reviewer can read.
 *
 * The raw note is written for the machine that produced it. It names documents
 * by filename — "StarMountain LMMC - 10Q - 9.30.25 Draft 7.pdf" some two
 * hundred and fifty times across one run — leads with the verdict the card
 * already carries in its chip, repeats the figures the ledger already lists,
 * and joins three unrelated clauses with semicolons. All of that is true and
 * none of it is legible.
 *
 * So nothing here invents or softens a finding. It drops what the card says
 * elsewhere, names documents the way the rest of the interface does, and puts
 * the one clause that explains the difference first — because that clause is
 * the only part the reviewer cannot work out for themselves.
 */
export interface ReadableReason {
  /** The sentence worth reading first. Empty when the evidence says it all. */
  lead: string;
  /** Everything else worth keeping, one sentence each. */
  detail: string[];
  /** How the figure was built, where it was assembled from several rows. */
  buildout?: string;
}

/* ------------------------------ document names ----------------------------- */

/**
 * Sources not in this run that the agent still cites. They are named in the
 * notes but were never uploaded, so they have no card and no short label of
 * their own — one is given here rather than leaving a filename in the prose.
 */
const OFF_RUN_LABELS: [RegExp, string][] = [
  [/SBIC Affiliates Testing[^,;.]*\.xlsx/g, "the SBIC affiliates testing"],
];

/** Swap every filename for the short name the rest of the interface uses. */
export function withDocumentLabels(text: string, documents: DocumentMeta[]) {
  let out = text;
  /* longest first, so one filename cannot eat the head of another */
  [...documents]
    .sort((a, b) => b.fileName.length - a.fileName.length)
    .forEach((doc) => {
      out = out.split(doc.fileName).join(doc.label);
      /* the agent sometimes drops the extension */
      const stem = doc.fileName.replace(/\.[^.]+$/, "");
      out = out.split(stem).join(doc.label);
    });
  OFF_RUN_LABELS.forEach(([pattern, label]) => {
    out = out.replace(pattern, label);
  });
  return out;
}

/* --------------------------------- clauses --------------------------------- */

/**
 * Clauses the card states somewhere better. "Value differs" is the chip; the
 * figures and the delta are the ledger; a bare "differs by 1,418" is the
 * subtraction the reader can already see done.
 */
const REDUNDANT = [
  /^value differs$/i,
  /^values? differ$/i,
  /^differs by [\d,.()-]+$/i,
  /^n\/a$/i,
  /^[\d,.$()-]+$/,
];

/** Machine phrasing, and the sentence it was trying to be. */
const REWRITES: [RegExp, string | ((m: RegExpMatchArray) => string)][] = [
  [/^not found in reference$/i, "No other source carries this line."],
  [
    /^No figure for this row was found in (.+?)\.?$/i,
    (m) => `${m[1]} has no figure for this line.`,
  ],
  [/^agrees after rounding to the nearest unit$/i, "Agrees to the nearest dollar."],
  [
    /^value matches reference line '(.+?)'$/i,
    (m) => `Matched to “${m[1]}” — the two documents caption the line differently.`,
  ],
  [
    /^(\d+) sentences? agree(?:s)? with (.+?)\.?$/i,
    (m) =>
      `${m[1] === "1" ? "One sentence agrees" : `${m[1]} sentences agree`} with ${m[2]}.`,
  ],
  [
    /^section caption not found in reference under th(is|e) heading\.?$/i,
    "The caption is not printed under this heading in the other document.",
  ],
  [
    /^The (\d+) components? sum to (.+?), the stated total\.?$/i,
    (m) =>
      `The ${m[1]} components sum to ${m[2]}, which is the total stated.`,
  ],
  [/^Stated only by (.+?)\.?$/i, (m) => `Only ${m[1]} states this.`],
  [/^Titled as in (.+?)\.?$/i, (m) => `Titled as it is in ${m[1]}.`],
  [/^Dropped since the prior filing: (.+)$/is, (m) => `Dropped since the prior filing: ${m[1]}`],
  [/^Not in the prior filing: (.+)$/is, (m) => `New in this filing: ${m[1]}`],
];

const SMALL = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"];

/** `"Interest income" + "Interest income" summed` says the same name twice. */
function collapseBuildout(clause: string) {
  const quoted = [...clause.matchAll(/“([^”]+)”|"([^"]+)"/g)].map((m) => m[1] ?? m[2]);
  if (quoted.length < 2) return clause;
  const unique = Array.from(new Set(quoted));
  if (unique.length === 1) {
    const count = SMALL[quoted.length] ?? String(quoted.length);
    return `${count} rows, both captioned “${unique[0]}”, added together`;
  }
  return `${unique.map((q) => `“${q}”`).join(" + ")}, added together`;
}

/**
 * The agent hedges its plurals — "3 sentence(s)", "signatory(ies)" — because it
 * writes one string for every count. The count is known by the time a reviewer
 * reads it, so the hedge is just noise on the page.
 */
function resolvePlurals(text: string) {
  return text
    .replace(/(\d[\d,]*)\s+([A-Za-z]+)\(s\)/g, (_m, n: string, word: string) =>
      n === "1" ? `${n} ${word}` : `${n} ${word}s`
    )
    .replace(/([A-Za-z]+)y\(ies\)/g, "$1ies")
    .replace(/([A-Za-z]+)\(s\)/g, "$1s")
    .replace(/\s*->\s*/g, " → ");
}

const SENTENCE_END = /[.!?:]$/;

function tidy(clause: string) {
  const text = clause.trim().replace(/\s+/g, " ");
  if (!text) return "";
  const cased = /^[a-z]/.test(text) ? text[0].toUpperCase() + text.slice(1) : text;
  return SENTENCE_END.test(cased) ? cased : `${cased}.`;
}

/* ---------------------------------- public --------------------------------- */

/**
 * Read one of the agent's notes.
 *
 * `kind` is the finding's own kind, used only to decide what the card is
 * already saying — on a line nobody could check there is no ledger to defer
 * to, so nothing is dropped as redundant.
 */
export function readReason(
  raw: string,
  documents: DocumentMeta[],
  kind?: "value" | "text" | "formula" | "gap"
): ReadableReason {
  if (!raw?.trim()) return { lead: "", detail: [] };

  const named = resolvePlurals(withDocumentLabels(raw, documents));

  /* the em dash usually separates the finding from the explanation of it, and
     the explanation is the half the reviewer cannot reconstruct */
  let buildout: string | undefined;
  const clauses = named
    .split(/\s*;\s*/)
    .flatMap((clause) => clause.split(/\s+—\s+/))
    .map((clause) => clause.trim())
    .filter(Boolean);

  const kept: string[] = [];
  clauses.forEach((clause) => {
    if (kind !== "gap" && REDUNDANT.some((p) => p.test(clause))) return;

    /* "the buildout:" is the agent's word for how it assembled the figure —
       the instruction that follows is the part a reviewer acts on */
    const plain = clause.replace(/^the buildout:\s*/i, "");

    if (/summed/i.test(plain)) {
      const cleaned = collapseBuildout(plain);
      if (!buildout) {
        buildout = tidy(cleaned.replace(/\s*summed\s*$/i, ", added together"));
        return;
      }
    }

    const rewritten = REWRITES.reduce<string | null>((found, [pattern, replacement]) => {
      if (found !== null) return found;
      const m = plain.match(pattern);
      if (!m) return null;
      return typeof replacement === "function" ? replacement(m) : replacement;
    }, null);

    kept.push(tidy(rewritten ?? plain));
  });

  if (!kept.length) return { lead: "", detail: [], buildout };

  /* an explanation earns the lead over a restatement of the evidence */
  const explanatory = kept.findIndex((c) =>
    /because|since|where|so that|the working paper|the filing prints|carve|treat/i.test(c)
  );
  const order = explanatory > 0 ? [kept[explanatory], ...kept.filter((_, i) => i !== explanatory)] : kept;

  return { lead: order[0], detail: order.slice(1), buildout };
}
