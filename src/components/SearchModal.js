"use client";

import { useState, useEffect, useRef } from "react";

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
}

function formatAmount(amount) {
  if (amount == null) return "₦0";
  return "₦" + Number(amount).toLocaleString("en-NG", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function getDateRangeBounds(filter) {
  const now = new Date();
  if (filter === "all") return null;
  if (filter === "year") {
    const start = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
    return { start, end: now.toISOString().slice(0, 10) };
  }
  if (filter === "90d") {
    const start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return { start, end: now.toISOString().slice(0, 10) };
  }
  return null;
}

export default function SearchModal({ open, onClose, entries = [] }) {
  const [query, setQuery]         = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [flowFilter, setFlowFilter] = useState("all");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setDateFilter("all");
      setFlowFilter("all");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const dateRange = getDateRangeBounds(dateFilter);
  const q = query.trim().toLowerCase();

  const filtered = entries.filter((entry) => {
    if (q) {
      const desc = (entry.desc || "").toLowerCase();
      const ben  = (entry.beneficiary || "").toLowerCase();
      const cat  = (entry.category || "").toLowerCase();
      if (!desc.includes(q) && !ben.includes(q) && !cat.includes(q)) return false;
    }
    if (dateRange) {
      const d = entry.date || "";
      if (d < dateRange.start || d > dateRange.end) return false;
    }
    if (flowFilter !== "all") {
      if (entry.flow !== flowFilter) return false;
    }
    return true;
  });

  const MAX = 50;
  const shown = filtered.slice(0, MAX);
  const hasMore = filtered.length > MAX;

  const pillBase = {
    fontFamily: "var(--font-sans)",
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 999,
    padding: "4px 12px",
    cursor: "pointer",
    border: "1px solid var(--rule)",
    transition: "all 0.15s",
  };

  function Pill({ label, value, active, onClick }) {
    return (
      <button
        onClick={onClick}
        style={{
          ...pillBase,
          background: active ? "var(--gold)" : "var(--ink-3)",
          color: active ? "#fff" : "var(--ink-text-dim)",
          borderColor: active ? "var(--gold)" : "var(--rule)",
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(12px)" }}
    >
      <div className="max-w-2xl w-full mx-auto mt-16 px-4 flex flex-col gap-4">

        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by description, payee, or category..."
            className="w-full py-3 px-4 rounded-xl text-base"
            style={{
              background: "var(--ink-2)",
              border: "1px solid var(--rule)",
              color: "var(--ink-text)",
              fontFamily: "var(--font-sans)",
              outline: "none",
            }}
          />
          <button
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center rounded-lg text-sm"
            style={{ color: "var(--ink-text-dim)", background: "var(--ink-3)", border: "1px solid var(--rule)" }}
            aria-label="Close search"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Pill label="All time"    value="all"  active={dateFilter === "all"}  onClick={() => setDateFilter("all")} />
          <Pill label="This year"   value="year" active={dateFilter === "year"} onClick={() => setDateFilter("year")} />
          <Pill label="Last 90 days" value="90d" active={dateFilter === "90d"}  onClick={() => setDateFilter("90d")} />
          <div style={{ width: 1, background: "var(--rule)", margin: "0 4px" }} />
          <Pill label="All flows"   value="all" active={flowFilter === "all"} onClick={() => setFlowFilter("all")} />
          <Pill label="Out only"    value="out" active={flowFilter === "out"} onClick={() => setFlowFilter("out")} />
          <Pill label="In only"     value="in"  active={flowFilter === "in"}  onClick={() => setFlowFilter("in")} />
        </div>

        <p
          className="text-xs"
          style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
        >
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </p>

        <div className="flex flex-col gap-2 overflow-y-auto" style={{ maxHeight: "calc(100vh - 280px)" }}>
          {shown.length === 0 ? (
            <p
              className="text-sm py-8 text-center"
              style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
            >
              No transactions match. Try a different description, payee, or category name.
            </p>
          ) : (
            shown.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: "var(--paper)", border: "1px solid var(--rule-paper)" }}
              >
                <span
                  className="shrink-0 text-xs"
                  style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-mono)", minWidth: 72 }}
                >
                  {formatDate(entry.date)}
                </span>
                <span
                  className="flex-1 text-sm font-semibold truncate"
                  style={{ color: "var(--paper-text)", fontFamily: "var(--font-sans)" }}
                >
                  {entry.desc}
                </span>
                <span
                  className="shrink-0 text-sm font-semibold"
                  style={{
                    color: entry.flow === "in" ? "var(--green)" : "var(--red)",
                    fontFamily: "var(--font-mono)",
                  }}
                >
                  {entry.flow === "in" ? "+" : "-"}{formatAmount(entry.amount)}
                </span>
                {entry.category && (
                  <span
                    className="shrink-0 text-xs px-2 py-0.5 rounded-full"
                    style={{
                      background: "rgba(169,133,79,0.12)",
                      color: "var(--gold)",
                      fontFamily: "var(--font-sans)",
                      letterSpacing: "0.02em",
                    }}
                  >
                    {entry.category}
                  </span>
                )}
              </div>
            ))
          )}
          {hasMore && (
            <p
              className="text-xs text-center py-2"
              style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
            >
              Showing first {MAX} of {filtered.length} results. Refine your search to narrow it down.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
