"use client";

import { useMemo } from "react";
import { formatNaira } from "@/lib/format";
import { last14Days } from "@/lib/cashBalance";

export default function BalanceTable({ entries, anchor }) {
  const rows = useMemo(
    () => last14Days(entries, anchor.anchor_date, anchor.anchor_amount),
    [entries, anchor],
  );

  if (!anchor.anchor_date) return null;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{ border: "1px solid var(--rule-paper)", background: "var(--paper)" }}
    >
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: "var(--paper-2)", borderBottom: "1px solid var(--rule-paper)" }}>
            {["Date", "Opening", "Net", "Closing"].map((h) => (
              <th
                key={h}
                className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.date}
              className="border-t"
              style={{ borderColor: "var(--rule-paper)" }}
            >
              <td className="px-4 py-2" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-mono)", fontSize: "0.75rem" }}>
                {row.date}
              </td>
              <td className="px-4 py-2" style={{ color: "var(--paper-text)", fontFamily: "var(--font-mono)" }}>
                {formatNaira(row.opening)}
              </td>
              <td
                className="px-4 py-2 font-semibold"
                style={{ color: row.net >= 0 ? "var(--green)" : "var(--red)", fontFamily: "var(--font-mono)" }}
              >
                {row.net >= 0 ? "+" : ""}{formatNaira(row.net)}
              </td>
              <td className="px-4 py-2 font-semibold" style={{ color: "var(--paper-text)", fontFamily: "var(--font-mono)" }}>
                {formatNaira(row.closing)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
