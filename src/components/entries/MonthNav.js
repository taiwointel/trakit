"use client";

const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

export default function MonthNav({ year, month, onChange }) {
  function prev() {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  }
  function next() {
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  }

  return (
    <div className="flex items-center justify-center gap-4 py-3">
      <button
        onClick={prev}
        className="w-7 h-7 flex items-center justify-center rounded transition-colors"
        style={{ color: "var(--ink-text-dim)" }}
      >
        ‹
      </button>
      <span
        className="text-sm font-semibold tracking-widest uppercase"
        style={{ fontFamily: "var(--font-mono)", color: "var(--ink-text)", minWidth: 140, textAlign: "center" }}
      >
        {MONTHS[month - 1]} {year}
      </span>
      <button
        onClick={next}
        className="w-7 h-7 flex items-center justify-center rounded transition-colors"
        style={{ color: "var(--ink-text-dim)" }}
      >
        ›
      </button>
    </div>
  );
}
