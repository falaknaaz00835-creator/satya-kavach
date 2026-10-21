"use client";

/**
 * Session evidence ledger.
 *
 * Every forensic run writes one immutable line here — module, verdict,
 * timestamp, hash. It survives a refresh (localStorage) and can be exported
 * as a JSON dossier or printed. This is the difference between a demo and a
 * workbench: the work leaves a trace.
 */

export type Verdict = "genuine" | "suspicious" | "fraud" | "unknown";

export interface LedgerEntry {
  id: string;
  module: string;
  moduleLabel: string;
  verdict: Verdict;
  riskScore: number | null;
  summary?: string;
  hash?: string;
  at: number;
  demo?: boolean;
}

const KEY = "sk.ledger.v2";
const MAX = 250;
const EVENT = "sk:ledger";

let cache: LedgerEntry[] | null = null;

function isBrowser() {
  return typeof window !== "undefined";
}

function read(): LedgerEntry[] {
  if (!isBrowser()) return [];
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as LedgerEntry[]) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: LedgerEntry[]) {
  cache = next;
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota — keep the in-memory copy */
  }
  window.dispatchEvent(new CustomEvent(EVENT));
}

/* ─────────────────────────────────────────────
   Verdict coercion — modules return slightly
   different report shapes, so normalise here.
───────────────────────────────────────────── */
export function deriveVerdict(report: any): {
  verdict: Verdict;
  riskScore: number | null;
  summary?: string;
  hash?: string;
} {
  if (!report || typeof report !== "object") {
    return { verdict: "unknown", riskScore: null };
  }

  let verdict: Verdict = "unknown";
  const raw = String(
    report.verdict ?? report.riskLevel ?? report.status ?? ""
  ).toLowerCase();

  if (raw.includes("fraud") || raw.includes("high risk") || raw.includes("high")) {
    verdict = "fraud";
  } else if (raw.includes("suspicious") || raw.includes("caution") || raw.includes("medium")) {
    verdict = "suspicious";
  } else if (raw.includes("genuine") || raw.includes("safe") || raw.includes("low") || raw.includes("verified")) {
    verdict = "genuine";
  }

  const scoreCandidate =
    typeof report.riskScore === "number"
      ? report.riskScore
      : typeof report.confidence === "number" && verdict === "genuine"
      ? 100 - report.confidence
      : null;

  const summary =
    (typeof report.summary === "string" && report.summary) ||
    (Array.isArray(report.evidence) && typeof report.evidence[0] === "string"
      ? report.evidence[0]
      : undefined);

  const hash =
    (typeof report.sha256 === "string" && report.sha256) ||
    (typeof report.evidenceHash === "string" && report.evidenceHash) ||
    undefined;

  return {
    verdict,
    riskScore: scoreCandidate === null ? null : Math.round(scoreCandidate),
    summary: summary ? String(summary).slice(0, 180) : undefined,
    hash,
  };
}

export const MODULE_LABELS: Record<string, string> = {
  upi: "UPI Screenshot",
  qr: "QR & Link",
  job: "Job Offer",
  deepfake: "Deepfake Call",
  document: "Document",
  copilot: "Copilot consult",
};

export function addEntry(
  module: string,
  report?: any,
  extra?: { demo?: boolean; label?: string }
): LedgerEntry {
  const { verdict, riskScore, summary, hash } = deriveVerdict(report);
  const entry: LedgerEntry = {
    id:
      "SK-" +
      Date.now().toString(36).toUpperCase() +
      "-" +
      Math.random().toString(36).slice(2, 6).toUpperCase(),
    module,
    moduleLabel: extra?.label ?? MODULE_LABELS[module] ?? module,
    verdict,
    riskScore,
    summary,
    hash,
    at: Date.now(),
    demo: extra?.demo,
  };
  write([entry, ...read()].slice(0, MAX));
  return entry;
}

export function clearLedger() {
  write([]);
}

export function listLedger(): LedgerEntry[] {
  return read();
}

export function subscribeLedger(cb: () => void) {
  if (!isBrowser()) return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function summarise(entries: LedgerEntry[]) {
  return {
    total: entries.length,
    flagged: entries.filter((e) => e.verdict === "fraud").length,
    caution: entries.filter((e) => e.verdict === "suspicious").length,
    clean: entries.filter((e) => e.verdict === "genuine").length,
  };
}
