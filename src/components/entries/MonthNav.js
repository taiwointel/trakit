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

  const btnStyle = {
    width: 34, height: 34, borderRadius: 10, flexShrink: 0,
    background: "var(--ink-3)", border: "1px solid var(--rule)",
    color: "var(--ink-text-dim)", fontSize: 20, fontWeight: 300,
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", transition: "background 0.15s, color 0.15s",
    lineHeight: 1,
  };

  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "10px 20px",
      background: "linear-gradient(180deg, rgba(255,255,255,0.025) 0%, transparent 100%)",
    }}>
      <button onClick={prev} style={btnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--ink)"; e.currentTarget.style.color = "var(--ink-text)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--ink-3)"; e.currentTarget.style.color = "var(--ink-text-dim)"; }}
      >
        ‹
      </button>

      <div style={{ display: "flex", alignItems: "baseline", gap: 10, userSelect: "none" }}>
        <span style={{
          fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 700,
          color: "var(--ink-text)", letterSpacing: "0.04em", textTransform: "uppercase",
        }}>
          {MONTHS[month - 1]}
        </span>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 500,
          color: "var(--ink-text-dim)", letterSpacing: "0.12em",
        }}>
          {year}
        </span>
      </div>

      <button onClick={next} style={btnStyle}
        onMouseEnter={(e) => { e.currentTarget.style.background = "var(--ink)"; e.currentTarget.style.color = "var(--ink-text)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "var(--ink-3)"; e.currentTarget.style.color = "var(--ink-text-dim)"; }}
      >
        ›
      </button>
    </div>
  );
}
