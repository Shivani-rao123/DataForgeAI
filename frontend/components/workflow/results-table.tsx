"use client";

import { useMemo, useState } from "react";
import {
  ExternalLink,
  ShieldCheck,
  ShieldQuestion,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
} from "lucide-react";
import type { ExtractedRecord } from "@/lib/types";

function isUrlValue(value: string | null): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "View link";
  }
}

export function ResultsTable({ records }: { records: ExtractedRecord[] }) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const columns = useMemo(() => {
    const cols: string[] = [];
    for (const r of records) {
      for (const key of Object.keys(r.data)) {
        if (!cols.includes(key)) cols.push(key);
      }
    }
    return cols;
  }, [records]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = records;
    if (q) {
      rows = rows.filter((r) => {
        const haystack = [...Object.values(r.data), r.citation_url, r.match_reason]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      });
    }
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = (a.data[sortKey] || "").toLowerCase();
        const bv = (b.data[sortKey] || "").toLowerCase();
        const cmp = av.localeCompare(bv);
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return rows;
  }, [records, search, sortKey, sortDir]);

  const toggleSort = (col: string) => {
    if (sortKey === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(col);
      setSortDir("asc");
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="relative max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search records..."
          className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs font-mono bg-elevated border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-cyan/40"
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-border-subtle">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border-subtle bg-elevated/60">
              <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-text-muted">
                {/* match status */}
              </th>
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={() => toggleSort(col)}
                  className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-text-muted cursor-pointer hover:text-cyan transition-colors select-none whitespace-nowrap"
                >
                  <span className="inline-flex items-center gap-1">
                    {col.replace(/_/g, " ")}
                    {sortKey === col ? (
                      sortDir === "asc" ? (
                        <ArrowUp className="h-3 w-3" />
                      ) : (
                        <ArrowDown className="h-3 w-3" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3 w-3 opacity-30" />
                    )}
                  </span>
                </th>
              ))}
              <th className="px-3 py-2 text-left font-mono text-[10px] uppercase tracking-wider text-text-muted">
                Source
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((record, i) => (
              <tr
                key={i}
                className="border-b border-border-subtle/50 last:border-0 hover:bg-elevated/40 transition-colors"
              >
                <td className="px-3 py-2">
                  {record.match_status && (
                    <span
                      title={
                        record.match_status === "unconfirmed"
                          ? record.match_reason || "Could not be fully confirmed against the source"
                          : "Every field verified against its source"
                      }
                      className="cursor-help"
                    >
                      {record.match_status === "unconfirmed" ? (
                        <span className="inline-flex items-center gap-1 rounded border border-amber/30 bg-amber/10 px-1.5 py-0.5 text-[10px] font-mono text-amber whitespace-nowrap">
                          <ShieldQuestion className="h-3 w-3" />
                          Unconfirmed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded border border-emerald/30 bg-emerald/10 px-1.5 py-0.5 text-[10px] font-mono text-emerald whitespace-nowrap">
                          <ShieldCheck className="h-3 w-3" />
                          Verified
                        </span>
                      )}
                    </span>
                  )}
                  {record.flags && record.flags.length > 0 && (
                    <span title={record.flags.join("\n")} className="ml-1 inline-flex cursor-help align-middle">
                      <AlertTriangle className="h-3.5 w-3.5 text-rose" />
                    </span>
                  )}
                </td>
                {columns.map((col) => {
                  const value = record.data[col];
                  return (
                    <td key={col} className="px-3 py-2 max-w-[220px]">
                      {value ? (
                        isUrlValue(value) ? (
                          <a
                            href={value}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan hover:underline inline-flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            <span className="truncate">{hostnameOf(value)}</span>
                          </a>
                        ) : (
                          <span className="text-text-primary truncate block" title={value}>
                            {value}
                          </span>
                        )
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="px-3 py-2">
                  {record.citation_url && (
                    <a
                      href={record.citation_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan/60 hover:text-cyan transition-colors"
                      title="Open source page"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center text-text-muted text-xs py-8">
            No records match &quot;{search}&quot;
          </div>
        )}
      </div>
    </div>
  );
}