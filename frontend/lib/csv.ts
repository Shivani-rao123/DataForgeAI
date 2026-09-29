import type { ExtractedRecord } from "./types";

function escapeCsvValue(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function recordsToCsv(records: ExtractedRecord[]): string {
  if (records.length === 0) return "";
  // Union of every field across all records, in first-seen order — a later record
  // may have a field an earlier one lacked.
  const headers: string[] = [];
  for (const r of records) {
    for (const key of Object.keys(r.data)) {
      if (!headers.includes(key)) headers.push(key);
    }
  }
  const rows = [headers.map(escapeCsvValue).join(",")];
  for (const r of records) {
    rows.push(headers.map((h) => escapeCsvValue(r.data[h])).join(","));
  }
  return rows.join("\r\n");
}

export function downloadCsv(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}