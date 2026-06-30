"use client";

import { useState, useMemo } from "react";
import { CATEGORY_COLORS } from "@/lib/categories";
import { formatNaira, formatDateShort } from "@/lib/format";

export default function CategoryExplorer({ entries }) {
  const outEntries = entries.filter((e) => e.flow === "out" && e.category);

  const byCategory = useMemo(() => {
    const map = {};
    for (const e of outEntries) {
      if (!map[e.category]) map[e.category] = { total: 0, items: [] };
      map[e.category].total += Number(e.amount);
      map[e.category].items.push(e);
    }
    return Object.entries(map)
      .sort(([, a], [, b]) => b.total - a.total)
      .map(([cat, { total, items }], i) => ({
        category: cat,
        total,
        items:    items.sort((a, b) => b.date.localeCompare(a.date)),
        color:    CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      }));
  }, [outEntries]);

  const [openCat, setOpenCat]     = useState(byCategory[0]?.category || null);
  const [allOpen, setAllOpen]     = useState(false);

  if (byCategory.length === 0) {
    return (
      <div className="rounded-lg p-4" style={{ background: "var(--paper)", border: "1px solid var(--rule-paper)" }}>
        <p className="text-sm text-center py-4" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>
          No categorized expenses yet.
        </p>
      </div>
    );
  }

  function toggle(cat) {
    if (allOpen) { setAllOpen(false); setOpenCat(cat); }
    else setOpenCat((prev) => (prev === cat ? null : cat));
  }

  const isOpen = (cat) => allOpen || openCat === cat;

  return (
    <div className="rounded-lg overflow-hidden" style={{ background: "var(--paper)", border: "1px solid var(--rule-paper)" }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "var(--rule-paper)", background: "var(--paper-2)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>
          Category Explorer
        </p>
        <button
          onClick={() => { setAllOpen((v) => !v); setOpenCat(null); }}
          className="text-xs"
          style={{ color: "var(--gold)", fontFamily: "var(--font-sans)" }}
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      {byCategory.map((cat, idx) => (
        <div
          key={cat.category}
          style={{ borderBottom: idx < byCategory.length - 1 ? "1px solid var(--rule-paper)" : "none" }}
        >
          {/* Category row */}
          <button
            onClick={() => toggle(cat.category)}
            className="w-full flex items-center gap-3 px-4 py-3 transition-colors text-left"
            style={{ background: isOpen(cat.category) ? "var(--paper-2)" : "transparent" }}
          >
            <div style={{ width: 10, height: 10, borderRadius: 2, background: cat.color, flexShrink: 0 }} />
            <span className="flex-1 text-sm font-medium" style={{ color: "var(--paper-text)", fontFamily: "var(--font-sans)" }}>
              {cat.category}
            </span>
            <span className="text-sm" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-mono)" }}>
              {formatNaira(cat.total)}
            </span>
            <span className="text-xs ml-1" style={{ color: "var(--paper-text-dim)" }}>
              {isOpen(cat.category) ? "▲" : "▼"}
            </span>
          </button>

          {/* Expanded items */}
          {isOpen(cat.category) && (
            <div style={{ background: "var(--paper)" }}>
              {cat.items.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 px-8 py-2 border-t"
                  style={{ borderColor: "var(--rule-paper)" }}
                >
                  <span className="text-xs w-20 shrink-0" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-mono)" }}>
                    {e.date}
                  </span>
                  <span className="flex-1 text-sm" style={{ color: "var(--paper-text)", fontFamily: "var(--font-sans)" }}>
                    {e.desc}
                    {e.beneficiary && (
                      <span className="ml-1 text-xs" style={{ color: "var(--paper-text-dim)" }}>
                        · To {e.beneficiary}
                      </span>
                    )}
                  </span>
                  <span className="text-sm font-medium" style={{ color: "var(--red)", fontFamily: "var(--font-mono)" }}>
                    {formatNaira(e.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
