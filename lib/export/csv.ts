export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

/** Characters that make Excel/Sheets treat a cell as a formula ("CSV injection"). */
const FORMULA_START = /^[=+\-@\t\r]/;

function escapeCell(value: string | number): string {
  // Numbers are written as-is (so "-500" stays a number); text that looks like a formula is
  // prefixed with an apostrophe so a description such as "=HYPERLINK(...)" is never executed.
  let text = typeof value === 'number' ? String(value) : value;
  if (typeof value === 'string' && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Builds RFC 4180 CSV: fields containing a comma, quote or newline are wrapped in quotes and
 * quotes are doubled. Starts with a BOM so Excel opens the UTF-8 text (₵, –, accents) correctly.
 */
export function toCSV<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [
    columns.map((column) => escapeCell(column.header)).join(','),
    ...rows.map((row) => columns.map((column) => escapeCell(column.value(row))).join(',')),
  ];
  return '﻿' + lines.join('\r\n');
}

/** Saves text or a Blob as a file in the browser. */
export function downloadFile(
  content: string | Blob,
  filename: string,
  mime = 'text/csv;charset=utf-8',
): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke after the click has been handled, so the download isn't cancelled.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
