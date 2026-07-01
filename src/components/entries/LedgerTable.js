"use client";

import { useState } from "react";
import { CATEGORY_NAMES, categoryDefaults } from "@/lib/categories";
import { formatNaira, formatAmountInput, parseAmount } from "@/lib/format";

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

const ESSENTIALITIES = ["Essential", "Discretionary", "—"];
const NATURES        = ["Fixed", "Variable", "—"];

const SOURCE_META = {
  manual:   { label: "Manual",   color: "#A9854F", bg: "rgba(169,133,79,0.14)",  icon: "✏" },
  telegram: { label: "Telegram", color: "#5B8FA8", bg: "rgba(91,143,168,0.14)",  icon: "✈" },
  import:   { label: "Import",   color: "#2F7A56", bg: "rgba(47,122,86,0.14)",   icon: "📄" },
};

function SourceTag({ source }) {
  const m = SOURCE_META[source];
  if (!m) return null;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 3,
      fontSize: 9, fontFamily: "var(--font-sans)", fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.07em",
      color: m.color, background: m.bg,
      padding: "1px 5px", borderRadius: 8, flexShrink: 0,
    }}>
      {m.icon} {m.label}
    </span>
  );
}

function ConfidenceDot({ status, confidence }) {
  if (status === "pending") return <span className="text-xs" style={{ color: "var(--ink-text-dim)" }}>…</span>;
  if (status === "fallback") return (
    <span title="Auto-categorised by keyword. Check and confirm category." style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--amber)", flexShrink: 0,
    }} />
  );
  const c = Number(confidence);
  const color = c >= 0.8 ? "var(--green)" : c >= 0.5 ? "var(--amber)" : "var(--red)";
  return (
    <span title={`AI confidence: ${Math.round(c * 100)}%`} style={{
      display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0,
    }} />
  );
}

function EditRow({ entry, onSave, onCancel }) {
  const [date,   setDate]   = useState(entry.date || "");
  const [desc,   setDesc]   = useState(entry.desc || "");
  const [bene,   setBene]   = useState(entry.beneficiary || "");
  const [amount, setAmount] = useState(String(entry.amount || ""));
  const [flow,   setFlow]   = useState(entry.flow || "out");

  const inputStyle = {
    background: "var(--paper-2)",
    border:     "1px solid var(--rule-paper)",
    color:      "var(--paper-text)",
    fontFamily: "var(--font-sans)",
    padding:    "3px 6px",
    borderRadius: 4,
    fontSize:   13,
    width:      "100%",
    outline:    "none",
  };

  return (
    <tr style={{ background: "var(--paper-2)" }}>
      <td className="px-3 py-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...inputStyle, fontFamily: "var(--font-mono)" }} />
      </td>
      <td className="px-3 py-2" colSpan={2}>
        <div className="flex flex-col gap-1">
          <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Description" style={inputStyle} />
          <input type="text" value={bene} onChange={(e) => setBene(e.target.value)} placeholder={flow === "out" ? "To…" : "From…"} style={inputStyle} />
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(formatAmountInput(e.target.value))}
            style={{ ...inputStyle, fontFamily: "var(--font-mono)", width: 100 }}
          />
          <select value={flow} onChange={(e) => setFlow(e.target.value)} style={{ ...inputStyle, width: "auto" }}>
            <option value="out">out</option>
            <option value="in">in</option>
          </select>
        </div>
      </td>
      <td colSpan={2} className="px-3 py-2">
        <div className="flex gap-2">
          <button
            onClick={() => onSave({ date, desc, beneficiary: bene || null, amount: parseAmount(amount), flow })}
            className="px-3 py-1 rounded text-xs font-semibold"
            style={{ background: "var(--green)", color: "#fff" }}
          >✓ Save</button>
          <button
            onClick={onCancel}
            className="px-3 py-1 rounded text-xs"
            style={{ background: "var(--paper-3)", color: "var(--paper-text-dim)", border: "1px solid var(--rule-paper)" }}
          >✕</button>
        </div>
      </td>
    </tr>
  );
}

export default function LedgerTable({ entries, onUpdate, onDelete, onClearAll }) {
  const [editingId,      setEditingId]      = useState(null);
  const [recatProgress,  setRecatProgress]  = useState(null); // null | { done, total }

  async function handleRecategorizeAll() {
    const targets = entries.filter(e => e.flow === "out" && e.status !== "done");
    if (!targets.length) return;
    setRecatProgress({ done: 0, total: targets.length });
    for (let i = 0; i < targets.length; i++) {
      const e = targets[i];
      try {
        const res = await fetch("/api/ai/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: e.desc, amount: e.amount }),
        });
        if (res.ok) {
          const ai = await res.json();
          onUpdate(e.id, ai);
        }
      } catch { /* skip failed entries */ }
      setRecatProgress({ done: i + 1, total: targets.length });
    }
    setRecatProgress(null);
  }

  function handleClearAll() {
    if (!onClearAll) return;
    if (confirm("Delete ALL entries permanently? This cannot be undone.")) {
      onClearAll();
    }
  }

  if (entries.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>
        No entries yet. Add one above.
      </div>
    );
  }

  return (
    <div style={{ background: "var(--paper)" }}>
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr style={{ background: "var(--paper-2)", borderBottom: "1px solid var(--rule-paper)" }}>
            {["Date", "Description", "Amount", "Category", "Tags", ""].map((h) => (
              <th
                key={h}
                className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider"
                style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => {
            if (editingId === entry.id) {
              return (
                <EditRow
                  key={entry.id}
                  entry={entry}
                  onSave={(patch) => { onUpdate(entry.id, patch); setEditingId(null); }}
                  onCancel={() => setEditingId(null)}
                />
              );
            }

            const borderStyle = i < entries.length - 1 ? "1px solid var(--rule-paper)" : "none";

            return (
              <tr
                key={entry.id}
                style={{ background: i % 2 === 0 ? "var(--paper)" : "var(--paper-2)", borderBottom: borderStyle }}
              >
                {/* Date */}
                <td className="px-3 py-2 whitespace-nowrap" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--paper-text-dim)" }}>
                  {fmtDate(entry.date)}
                </td>

                {/* Description */}
                <td className="px-3 py-2" style={{ maxWidth: 260 }}>
                  <div className="flex items-start gap-1.5">
                    <ConfidenceDot status={entry.status} confidence={entry.confidence} />
                    <div>
                      <div className="font-medium" style={{ color: "var(--paper-text)", fontFamily: "var(--font-sans)" }}>
                        {entry.desc}
                      </div>
                      <div className="text-xs mt-0.5 flex items-center gap-1.5 flex-wrap" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>
                        {[entry.subcategory, entry.note, entry.beneficiary && `${entry.flow === "out" ? "To" : "From"} ${entry.beneficiary}`]
                          .filter(Boolean).join(" · ")}
                        {entry.source && <SourceTag source={entry.source} />}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Amount */}
                <td className="px-3 py-2 whitespace-nowrap" style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: entry.flow === "in" ? "var(--green)" : "var(--red)" }}>
                  {entry.flow === "in" ? "+" : "−"}{formatNaira(entry.amount)}
                </td>

                {/* Category */}
                <td className="px-3 py-2">
                  <select
                    value={entry.category || ""}
                    onChange={(e) => {
                      const defaults = categoryDefaults(e.target.value);
                      onUpdate(entry.id, { category: e.target.value, ...defaults });
                    }}
                    className="paper-select text-xs rounded py-1"
                    style={{
                      background:  "var(--paper-2)",
                      border:      "1px solid var(--rule-paper)",
                      color:       "var(--paper-text)",
                      fontFamily:  "var(--font-sans)",
                      maxWidth:    160,
                      paddingLeft:  6,
                      paddingRight: 24,
                    }}
                  >
                    <option value="">—</option>
                    {CATEGORY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
                    <option value="Income">Income</option>
                  </select>
                </td>

                {/* Tags: Essentiality + Nature stacked */}
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-1">
                    <select
                      value={entry.essentiality || ""}
                      onChange={(e) => onUpdate(entry.id, { essentiality: e.target.value })}
                      className="paper-select text-xs rounded py-0.5"
                      style={{
                        background:   "var(--paper-2)",
                        border:       "1px solid var(--rule-paper)",
                        color:        entry.essentiality === "Essential" ? "var(--green)" : entry.essentiality === "Discretionary" ? "var(--amber)" : "var(--paper-text-dim)",
                        fontFamily:   "var(--font-sans)",
                        paddingLeft:  6,
                        paddingRight: 22,
                      }}
                    >
                      {ESSENTIALITIES.map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                    <select
                      value={entry.nature || ""}
                      onChange={(e) => onUpdate(entry.id, { nature: e.target.value })}
                      className="paper-select text-xs rounded py-0.5"
                      style={{
                        background:   "var(--paper-2)",
                        border:       "1px solid var(--rule-paper)",
                        color:        "var(--paper-text-dim)",
                        fontFamily:   "var(--font-sans)",
                        paddingLeft:  6,
                        paddingRight: 22,
                      }}
                    >
                      {NATURES.map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                </td>

                {/* Actions */}
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingId(entry.id)}
                      className="text-xs"
                      style={{ color: "var(--paper-text-dim)" }}
                      title="Edit"
                    >✎</button>
                    <button
                      onClick={() => { if (confirm("Delete this entry?")) onDelete(entry.id); }}
                      className="text-xs"
                      style={{ color: "var(--red)" }}
                      title="Delete"
                    >✕</button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>

      {/* ── Footer actions ─────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderTop: "1px solid var(--rule-paper)",
        background: "var(--paper-2)", flexWrap: "wrap", gap: 8,
      }}>
        {/* Re-categorize with AI */}
        <button
          onClick={handleRecategorizeAll}
          disabled={!!recatProgress}
          style={{
            background: "none", border: "none", cursor: recatProgress ? "default" : "pointer",
            color: recatProgress ? "var(--paper-text-dim)" : "var(--blue-accent)",
            fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, padding: 0,
            display: "flex", alignItems: "center", gap: 5,
          }}
        >
          {recatProgress ? (
            <>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "var(--amber)", animation: "pulse 1s infinite" }} />
              Categorizing {recatProgress.done}/{recatProgress.total}…
            </>
          ) : (
            <>✦ Auto-categorize all with AI</>
          )}
        </button>

        {/* Clear all */}
        {onClearAll && (
          <button
            onClick={handleClearAll}
            style={{
              background: "none", border: "none", cursor: "pointer",
              color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)",
              fontSize: 12, padding: 0,
            }}
          >
            Clear all entries
          </button>
        )}
      </div>
    </div>
  );
}
