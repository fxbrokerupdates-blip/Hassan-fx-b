/** Neutralises spreadsheet formula injection (=, +, -, @, tab, CR at the start of a cell). */
export function safeCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV with UTF-8 BOM so Excel opens non-Latin text (Urdu, Arabic) correctly. */
export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  const cols = columns ?? [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const lines = [cols.map(safeCell).join(","), ...rows.map((r) => cols.map((c) => safeCell(r[c])).join(","))];
  return `﻿${lines.join("\r\n")}`;
}
