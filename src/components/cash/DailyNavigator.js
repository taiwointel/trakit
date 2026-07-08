"use client";

import { useState, useMemo } from "react";
import { formatNaira, todayISO } from "@/lib/format";
import { openingBalance, closingBalance, netFlowForDate } from "@/lib/cashBalance";

export default function DailyNavigator({ entries, anchor }) {
  const [date, setDate] = useState(todayISO());

  const anchorDate   = anchor.anchor_date;
  const anchorAmount = anchor.anchor_amount;

  const opening = useMemo(
    () => openingBalance(entries, anchorDate, anchorAmount, date),
    [entries, anchorDate, anchorAmount, date],
  );
  const closing = useMemo(
    () => closingBalance(entries, anchorDate, anchorAmount, date),
    [entries, anchorDate, anchorAmount, date],
  );
  const net = useMemo(() => netFlowForDate(entries, date), [entries, date]);

  const dayEntries = useMemo(
    () => entries.filter((e) => e.date === date).sort((a, b) => (a.created_at || "").localeCompare(b.created_at || "")),
    [entries, date],
  );

  // closingBalance()/openingBalance() can resolve from bank-reported
  // balance_after entries alone, with no manual anchor set at all — only
  // treat this as "nothing to show" when there's truly no reference point
  // of any kind (both come back null).
  const noAnchor = opening === null && closing === null;

  function goDay(delta) {
    const [y, m, d] = date.split("-").map(Number);
    const dt = new Date(y, m - 1, d + delta); // local date, no UTC offset issues
    setDate(
      `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`
    );
  }

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-4"
      style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
    >
      <p
        className="text-xs font-semibold uppercase tracking-widest"
        style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
      >
        Daily balance navigator
      </p>

      {/* Date controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => goDay(-1)}
          className="px-2 py-1.5 rounded text-sm"
          style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text)" }}
        >
          ‹
        </button>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-2 py-1.5 rounded text-sm outline-none"
          style={{
            background: "var(--ink-3)",
            border:     "1px solid var(--rule)",
            color:      "var(--ink-text)",
            fontFamily: "var(--font-mono)",
          }}
        />
        <button
          onClick={() => goDay(1)}
          className="px-2 py-1.5 rounded text-sm"
          style={{ background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text)" }}
        >
          ›
        </button>
        <button
          onClick={() => setDate(todayISO())}
          className="px-3 py-1.5 rounded text-xs font-medium"
          style={{ background: "var(--gold)", color: "#fff", fontFamily: "var(--font-sans)" }}
        >
          Today
        </button>
      </div>

      {noAnchor ? (
        <p className="text-sm" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          Set your opening balance above to see daily figures.
        </p>
      ) : (
        <>
          {/* Three-stat row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Opening", val: opening, color: "var(--ink-text)" },
              { label: "Net",     val: net,     color: net >= 0 ? "var(--green)" : "var(--red)" },
              { label: "Closing", val: closing, color: "var(--gold)" },
            ].map(({ label, val, color }) => (
              <div key={label} className="flex flex-col gap-1">
                <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                  {label}
                </span>
                <span className="text-lg font-bold" style={{ color, fontFamily: "var(--font-mono)" }}>
                  {val !== null ? formatNaira(val) : "—"}
                </span>
              </div>
            ))}
          </div>

          {/* Day's entries */}
          {dayEntries.length > 0 ? (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                {dayEntries.length} transaction{dayEntries.length !== 1 ? "s" : ""} this day
              </p>
              {dayEntries.map((e) => {
                const isSelf = e.category === "Self";
                return (
                  <div
                    key={e.id}
                    className="flex items-center gap-3 py-1.5 border-t text-sm"
                    style={{ borderColor: "var(--rule)", opacity: isSelf ? 0.55 : 1 }}
                  >
                    <span className="flex-1" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>
                      {e.desc}
                      {e.beneficiary && (
                        <span style={{ color: "var(--ink-text-dim)" }}> · {e.flow === "out" ? "to" : "from"} {e.beneficiary}</span>
                      )}
                      {isSelf && (
                        <span
                          className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(91,143,168,0.18)", color: "var(--blue-accent)", fontFamily: "var(--font-sans)" }}
                        >
                          Self · excluded
                        </span>
                      )}
                    </span>
                    <span
                      className="font-semibold"
                      style={{ color: isSelf ? "var(--ink-text-dim)" : e.flow === "in" ? "var(--green)" : "var(--red)", fontFamily: "var(--font-mono)" }}
                    >
                      {e.flow === "in" ? "+" : "−"}{formatNaira(e.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
              No transactions on this day.
            </p>
          )}
        </>
      )}
    </div>
  );
}
