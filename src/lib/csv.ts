/**
 * Minimal CSV writer.
 * - Quotes fields containing commas, quotes or newlines.
 * - Neutralises spreadsheet formula injection: a text cell starting with = + - @ (or tab/CR) gets a leading
 *   apostrophe, so Excel/Sheets show it as text instead of running it. Numbers are written as-is.
 */
export type Cell = string | number | boolean | Date | null | undefined;

const FORMULA_START = /^[=+\-@\t\r]/;

function cell(v: Cell): string {
  if (v == null) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  if (typeof v === "boolean") return v ? "true" : "false";
  let s = v instanceof Date ? v.toISOString() : v;
  if (FORMULA_START.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  // BOM so Excel opens it as UTF-8
  return "﻿" + [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n") + "\r\n";
}

/** "2026-11-12 14:05" in Indian Standard Time. */
export function fmtIst(d: Date | null | undefined): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}
