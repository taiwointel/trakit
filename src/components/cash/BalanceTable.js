"use client";

import { useMemo } from "react";
import { formatNaira } from "@/lib/format";
import { last14Days } from "@/lib/cashBalance";

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return { short: `${d.getDate()} ${MONTHS[d.getMonth()]}`, day: DAYS[d.getDay()], iso };
}

export default function BalanceTable({ entries, anchor }) {
  const rows = useMemo(
    () => last14Days(entries, anchor.anchor_date, anchor.anchor_amount),
    [entries, anchor],
  );

  // The parent only renders this once cash/page.js already knows there's a
  // reference point (a manual anchor or a bank-reported balance_after), so
  // no separate early-return is needed here — last14Days() resolves fine
  // from balance_after entries alone even with anchor.anchor_date unset.

  return (
    <div style={{ border: "1px solid var(--rule-paper)", background: "var(--paper)", borderRadius: 12, overflow: "hidden" }}>

      {/* ── Desktop table (≥ 640px) ── */}
      <table className="w-full text-sm balance-table-desktop">
        <thead>
          <tr style={{ background: "var(--paper-2)", borderBottom: "1px solid var(--rule-paper)" }}>
            {["Date", "Opening", "Net", "Closing"].map((h) => (
              <th key={h} className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const { short, day } = fmtDate(row.date);
            return (
              <tr key={row.date} style={{ borderTop: "1px solid var(--rule-paper)" }}>
                <td className="px-4 py-2" style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--paper-text-dim)" }}>
                  <span style={{ color: "var(--paper-text-dim)", fontSize: 10, marginRight: 4 }}>{day}</span>
                  {short}
                </td>
                <td className="px-4 py-2" style={{ color: "var(--paper-text)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                  {formatNaira(row.opening)}
                </td>
                <td className="px-4 py-2 font-semibold" style={{ color: row.net >= 0 ? "var(--green)" : "var(--red)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                  {row.net >= 0 ? "+" : "−"}{formatNaira(Math.abs(row.net))}
                </td>
                <td className="px-4 py-2 font-semibold" style={{ color: "var(--paper-text)", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                  {formatNaira(row.closing)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ── Mobile cards (< 640px) ── */}
      <div className="balance-table-mobile">
        {/* Header */}
        <div style={{
          display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
          padding: "8px 14px", borderBottom: "1px solid var(--rule-paper)",
          background: "var(--paper-2)",
        }}>
          {["Date", "Net", "Closing"].map((h) => (
            <span key={h} style={{ fontFamily: "var(--font-sans)", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--paper-text-dim)" }}>
              {h}
            </span>
          ))}
        </div>

        {rows.map((row, i) => {
          const { short, day } = fmtDate(row.date);
          const isPos = row.net >= 0;
          const hasActivity = row.net !== 0;

          return (
            <div
              key={row.date}
              style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                padding: "9px 14px",
                borderTop: i === 0 ? "none" : "1px solid var(--rule-paper)",
                background: hasActivity ? "transparent" : "rgba(0,0,0,0.015)",
                alignItems: "center",
              }}
            >
              {/* Date */}
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--paper-text)", fontWeight: hasActivity ? 600 : 400 }}>
                  {short}
                </span>
                <span style={{ fontFamily: "var(--font-sans)", fontSize: 9, color: "var(--paper-text-dim)", opacity: 0.7 }}>
                  {day}
                </span>
              </div>

              {/* Net */}
              <div>
                {hasActivity ? (
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700,
                    color: isPos ? "var(--green)" : "var(--red)",
                  }}>
                    {isPos ? "+" : "−"}{formatNaira(Math.abs(row.net))}
                  </span>
                ) : (
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--paper-text-dim)", opacity: 0.35 }}>—</span>
                )}
              </div>

              {/* Closing */}
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--paper-text)", fontWeight: 600 }}>
                {formatNaira(row.closing)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
