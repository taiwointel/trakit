"use client";

import { useState, useMemo } from "react";
import { CATEGORY_NAMES, categoryDefaults } from "@/lib/categories";
import { formatNaira, formatAmountInput, parseAmount } from "@/lib/format";

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

function fmtDateLong(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

// Split "Eggs — Transfer to BUKOLA | OPay | 7033959453" into {purpose, detail}
function splitDesc(entry) {
  const desc = entry.desc || "";
  const sep  = desc.indexOf(" — ");
  if (sep !== -1) {
    return { purpose: desc.slice(0, sep).trim(), detail: desc.slice(sep + 3).trim() };
  }
  // Manual entry: desc is the purpose; beneficiary is the detail
  const bene = entry.beneficiary;
  const dir  = entry.flow === "out" ? "To" : "From";
  return { purpose: desc, detail: bene ? `${dir} ${bene}` : "" };
}

const ESSENTIALITIES = ["Essential", "Discretionary", "—"];
const NATURES        = ["Fixed", "Variable", "—"];

const SOURCE_META = {
  manual:   { label: "Manual",   color: "#A9854F", bg: "rgba(169,133,79,0.14)"  },
  telegram: { label: "Telegram", color: "#5B8FA8", bg: "rgba(91,143,168,0.14)"  },
  import:   { label: "Import",   color: "#2F7A56", bg: "rgba(47,122,86,0.14)"   },
};

function SourceTag({ source }) {
  const m = SOURCE_META[source];
  if (!m) return null;
  return (
    <span style={{
      fontSize: 9, fontFamily: "var(--font-sans)", fontWeight: 700,
      textTransform: "uppercase", letterSpacing: "0.06em",
      color: m.color, background: m.bg,
      padding: "1px 5px", borderRadius: 6, flexShrink: 0,
    }}>
      {m.label}
    </span>
  );
}

function ConfidenceDot({ status, confidence }) {
  if (status === "pending") return <span style={{ color: "var(--ink-text-dim)", fontSize: 11 }}>…</span>;
  if (status === "fallback") return (
    <span title="Keyword match — check category" style={{
      width: 7, height: 7, borderRadius: "50%", background: "var(--amber)",
      display: "inline-block", flexShrink: 0, marginTop: 2,
    }} />
  );
  const c = Number(confidence);
  const color = c >= 0.8 ? "var(--green)" : c >= 0.5 ? "var(--amber)" : "var(--red)";
  return (
    <span title={`Confidence: ${Math.round(c * 100)}%`} style={{
      width: 7, height: 7, borderRadius: "50%", background: color,
      display: "inline-block", flexShrink: 0, marginTop: 2,
    }} />
  );
}

function EditRow({ entry, onSave, onCancel }) {
  const [date,   setDate]   = useState(entry.date || "");
  const [desc,   setDesc]   = useState(() => splitDesc(entry).purpose);
  const [bene,   setBene]   = useState(entry.beneficiary || "");
  const [amount, setAmount] = useState(String(entry.amount || ""));
  const [flow,   setFlow]   = useState(entry.flow || "out");

  const s = {
    background: "var(--paper-2)", border: "1px solid var(--rule-paper)",
    color: "var(--paper-text)", fontFamily: "var(--font-sans)",
    padding: "3px 7px", borderRadius: 4, fontSize: 12, outline: "none", width: "100%",
  };

  return (
    <tr style={{ background: "var(--paper-2)" }}>
      <td className="px-2 py-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...s, fontFamily: "var(--font-mono)", width: 120 }} />
      </td>
      <td className="px-2 py-2" colSpan={2}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Purpose" style={s} />
          <input type="text" value={bene} onChange={(e) => setBene(e.target.value)} placeholder={flow === "out" ? "To (optional)" : "From (optional)"} style={{ ...s, fontSize: 11 }} />
        </div>
      </td>
      <td className="px-2 py-2">
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          <input
            type="text" inputMode="decimal"
            value={amount} onChange={(e) => setAmount(formatAmountInput(e.target.value))}
            style={{ ...s, fontFamily: "var(--font-mono)", width: 90 }}
          />
          <select value={flow} onChange={(e) => setFlow(e.target.value)} style={{ ...s, width: "auto", paddingRight: 6 }}>
            <option value="out">out</option>
            <option value="in">in</option>
          </select>
        </div>
      </td>
      <td colSpan={3} className="px-2 py-2">
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => onSave({ date, desc, beneficiary: bene || null, amount: parseAmount(amount), flow })}
            style={{ padding: "4px 12px", borderRadius: 6, background: "var(--green)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
            ✓ Save
          </button>
          <button onClick={onCancel}
            style={{ padding: "4px 10px", borderRadius: 6, background: "var(--paper-3)", color: "var(--paper-text-dim)", border: "1px solid var(--rule-paper)", cursor: "pointer", fontSize: 12 }}>
            ✕
          </button>
        </div>
      </td>
    </tr>
  );
}

function ClearWizard({ entries, onConfirm, onCancel }) {
  const dateGroups = useMemo(() => {
    const map = {};
    entries.forEach((e) => { if (!map[e.date]) map[e.date] = []; map[e.date].push(e); });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [entries]);

  const [checked, setChecked] = useState(() => {
    const s = new Set(); entries.forEach((e) => s.add(e.date)); return s;
  });
  const [expanded, setExpanded] = useState(() => new Set());

  function toggleDate(date) {
    setChecked((prev) => { const n = new Set(prev); n.has(date) ? n.delete(date) : n.add(date); return n; });
  }
  function toggleAll() {
    setChecked(checked.size === dateGroups.length ? new Set() : new Set(dateGroups.map(([d]) => d)));
  }
  function toggleExpanded(date) {
    setExpanded((prev) => { const n = new Set(prev); n.has(date) ? n.delete(date) : n.add(date); return n; });
  }

  const selectedIds = entries.filter((e) => checked.has(e.date)).map((e) => e.id);
  const allChecked  = checked.size === dateGroups.length;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9000, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "var(--ink-2)", border: "1px solid var(--rule)", borderRadius: 18, width: "100%", maxWidth: 420, maxHeight: "82vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--rule)" }}>
          <h3 style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)", fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>Delete entries</h3>
          <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 12, marginTop: 4 }}>Select dates to delete.</p>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 22px" }}>
          <div onClick={toggleAll} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", cursor: "pointer", borderBottom: "1px solid var(--rule)", marginBottom: 4 }}>
            <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${allChecked ? "var(--gold)" : "var(--rule)"}`, background: allChecked ? "var(--gold)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {allChecked && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
            </div>
            <span style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600 }}>{allChecked ? "Deselect all" : "Select all"}</span>
            <span style={{ marginLeft: "auto", color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{entries.length} total</span>
          </div>
          {dateGroups.map(([date, group]) => {
            const isOn  = checked.has(date);
            const isOpen = expanded.has(date);
            return (
              <div key={date} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0" }}>
                  <div onClick={() => toggleDate(date)} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flex: 1, minWidth: 0 }}>
                    <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${isOn ? "var(--gold)" : "var(--rule)"}`, background: isOn ? "var(--gold)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {isOn && <span style={{ color: "#fff", fontSize: 10, fontWeight: 700 }}>✓</span>}
                    </div>
                    <span style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)", fontSize: 13 }}>{fmtDateLong(date)}</span>
                    <span style={{ marginLeft: "auto", color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)", fontSize: 11 }}>{group.length} {group.length === 1 ? "entry" : "entries"}</span>
                  </div>
                  <button
                    onClick={() => toggleExpanded(date)}
                    title={isOpen ? "Hide details" : "Show details"}
                    style={{
                      background: "none", border: "none", cursor: "pointer", color: "var(--ink-text-dim)",
                      fontSize: 11, fontFamily: "var(--font-sans)", padding: "4px 2px 4px 8px", flexShrink: 0,
                      transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 150ms ease",
                    }}
                  >
                    ▸
                  </button>
                </div>
                {isOpen && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 0 10px 26px" }}>
                    {group.map((e) => {
                      const { purpose } = splitDesc(e);
                      const isIncome = e.flow === "in";
                      return (
                        <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between" }}>
                          <span style={{
                            color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 12,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0,
                          }}>
                            {purpose || "—"}
                            {e.category && (
                              <span style={{ color: "var(--ink-text-dim)", opacity: 0.7 }}> · {e.category}</span>
                            )}
                          </span>
                          <span style={{
                            flexShrink: 0, fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600,
                            color: isIncome ? "var(--green)" : "var(--red)",
                          }}>
                            {isIncome ? "+" : "−"}{formatNaira(e.amount)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div style={{ padding: "14px 22px", borderTop: "1px solid var(--rule)", display: "flex", gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "10px", borderRadius: 10, background: "var(--ink-3)", border: "1px solid var(--rule)", color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 13, cursor: "pointer" }}>Cancel</button>
          <button onClick={() => { if (selectedIds.length) onConfirm(selectedIds); }} disabled={!selectedIds.length}
            style={{ flex: 2, padding: "10px", borderRadius: 10, background: selectedIds.length ? "var(--red)" : "var(--ink-3)", border: "none", color: selectedIds.length ? "#fff" : "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 700, cursor: selectedIds.length ? "pointer" : "not-allowed" }}>
            Delete {selectedIds.length} {selectedIds.length === 1 ? "entry" : "entries"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mobile inline edit (div-based, not table row) ────────────────────────────
function MobileEditForm({ entry, onSave, onCancel }) {
  const [date,   setDate]   = useState(entry.date || "");
  const [desc,   setDesc]   = useState(() => splitDesc(entry).purpose);
  const [bene,   setBene]   = useState(entry.beneficiary || "");
  const [amount, setAmount] = useState(String(entry.amount || ""));
  const [flow,   setFlow]   = useState(entry.flow || "out");

  const s = {
    background: "var(--paper-2)", border: "1px solid var(--rule-paper)",
    color: "var(--paper-text)", fontFamily: "var(--font-sans)",
    padding: "6px 8px", borderRadius: 6, fontSize: 12, outline: "none", width: "100%", boxSizing: "border-box",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 6 }}>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ ...s, fontFamily: "var(--font-mono)", flex: "0 0 auto" }} />
        <select value={flow} onChange={(e) => setFlow(e.target.value)} style={{ ...s, width: "auto", flex: "0 0 auto", paddingRight: 6 }}>
          <option value="out">Out</option>
          <option value="in">In</option>
        </select>
      </div>
      <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Purpose" style={s} />
      <input type="text" value={bene} onChange={(e) => setBene(e.target.value)} placeholder={flow === "out" ? "To (optional)" : "From (optional)"} style={{ ...s, fontSize: 11 }} />
      <input type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(formatAmountInput(e.target.value))} placeholder="Amount" style={{ ...s, fontFamily: "var(--font-mono)" }} />
      <div style={{ display: "flex", gap: 6 }}>
        <button onClick={() => onSave({ date, desc, beneficiary: bene || null, amount: parseAmount(amount), flow })}
          style={{ flex: 1, padding: "7px", borderRadius: 6, background: "var(--green)", color: "#fff", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
          ✓ Save
        </button>
        <button onClick={onCancel}
          style={{ flex: 1, padding: "7px", borderRadius: 6, background: "var(--paper-3)", color: "var(--paper-text-dim)", border: "1px solid var(--rule-paper)", cursor: "pointer", fontSize: 12 }}>
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Mobile card view ──────────────────────────────────────────────────────────
function MobileCard({ entry, onEdit, onDelete, onUpdate }) {
  const { purpose, detail } = splitDesc(entry);
  const isIncome = entry.flow === "in";

  return (
    <div style={{
      padding: "11px 14px",
      borderBottom: "1px solid var(--rule-paper)",
      background: "transparent",
    }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        {/* Left: dot + date */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0, paddingTop: 2 }}>
          <ConfidenceDot status={entry.status} confidence={entry.confidence} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--paper-text-dim)", whiteSpace: "nowrap" }}>
            {fmtDate(entry.date)}
          </span>
        </div>

        {/* Center: purpose + detail */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "var(--font-sans)", fontSize: 13, fontWeight: 600, color: "var(--paper-text)", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {purpose || "—"}
          </div>
          {detail && (
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--paper-text-dim)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {detail}
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, flexWrap: "wrap" }}>
            <select
              value={entry.category || ""}
              onChange={(e) => { onUpdate(entry.id, { category: e.target.value, ...categoryDefaults(e.target.value) }); }}
              className="paper-select"
              style={{
                background: "var(--paper-3)", border: "1px solid var(--rule-paper)",
                color: "var(--paper-text)", fontFamily: "var(--font-sans)", fontSize: 10,
                borderRadius: 5, padding: "1px 18px 1px 5px", outline: "none",
              }}
            >
              <option value="">—</option>
              {CATEGORY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
              <option value="Income">Income</option>
              <option value="Self">Self</option>
            </select>
            {!isIncome && (
              <select
                value={entry.essentiality || ""}
                onChange={(e) => onUpdate(entry.id, { essentiality: e.target.value })}
                className="paper-select"
                style={{
                  background: "var(--paper-3)", border: "1px solid var(--rule-paper)",
                  color: entry.essentiality === "Essential" ? "var(--green)" : entry.essentiality === "Discretionary" ? "var(--amber)" : "var(--paper-text-dim)",
                  fontFamily: "var(--font-sans)", fontSize: 10,
                  borderRadius: 5, padding: "1px 18px 1px 5px", outline: "none",
                }}
              >
                {ESSENTIALITIES.map((e) => <option key={e} value={e}>{e}</option>)}
              </select>
            )}
            {entry.source && <SourceTag source={entry.source} />}
          </div>
        </div>

        {/* Right: amount + actions */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, flexShrink: 0 }}>
          <span style={{
            fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 700,
            color: isIncome ? "var(--green)" : "var(--red)",
          }}>
            {isIncome ? "+" : "−"}{formatNaira(entry.amount)}
          </span>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => onEdit(entry.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--paper-text-dim)", fontSize: 11, fontFamily: "var(--font-sans)", padding: 0 }}>Edit</button>
            <button onClick={() => { if (confirm("Delete?")) onDelete(entry.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontSize: 11, fontFamily: "var(--font-sans)", padding: 0 }}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Desktop table row ─────────────────────────────────────────────────────────
function DesktopRow({ entry, index, total, onEdit, onDelete, onUpdate }) {
  const { purpose, detail } = splitDesc(entry);
  const isIncome = entry.flow === "in";
  const isLast   = index === total - 1;

  return (
    <tr style={{ background: index % 2 === 0 ? "var(--paper)" : "var(--paper-2)", borderBottom: isLast ? "none" : "1px solid var(--rule-paper)" }}>
      {/* Date */}
      <td className="px-3 py-2 whitespace-nowrap" style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--paper-text-dim)", width: 64 }}>
        {fmtDate(entry.date)}
      </td>

      {/* Purpose */}
      <td className="px-3 py-2" style={{ maxWidth: 180 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
          <ConfidenceDot status={entry.status} confidence={entry.confidence} />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600, color: "var(--paper-text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {purpose || "—"}
            </div>
            {(entry.subcategory || entry.source) && (
              <div style={{ fontFamily: "var(--font-sans)", fontSize: 10, color: "var(--paper-text-dim)", marginTop: 1, display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                {entry.subcategory && <span>{entry.subcategory}</span>}
                {entry.subcategory && entry.source && <span style={{ opacity: 0.4 }}>·</span>}
                {entry.source && <SourceTag source={entry.source} />}
              </div>
            )}
          </div>
        </div>
      </td>

      {/* To/From + detail */}
      <td className="px-2 py-2" style={{ maxWidth: 160 }}>
        <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "var(--paper-text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={detail}>
          {detail || <span style={{ opacity: 0.3 }}>—</span>}
        </div>
      </td>

      {/* Amount */}
      <td className="px-3 py-2 whitespace-nowrap" style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 700, color: isIncome ? "var(--green)" : "var(--red)" }}>
        {isIncome ? "+" : "−"}{formatNaira(entry.amount)}
      </td>

      {/* Category */}
      <td className="px-2 py-2">
        <select
          value={entry.category || ""}
          onChange={(e) => { const d = categoryDefaults(e.target.value); onUpdate(entry.id, { category: e.target.value, ...d }); }}
          className="paper-select"
          style={{
            background: "var(--paper-2)", border: "1px solid var(--rule-paper)",
            color: "var(--paper-text)", fontFamily: "var(--font-sans)", fontSize: 10,
            borderRadius: 5, maxWidth: 148, padding: "3px 20px 3px 6px", outline: "none",
          }}
        >
          <option value="">—</option>
          {CATEGORY_NAMES.map((c) => <option key={c} value={c}>{c}</option>)}
          <option value="Income">Income</option>
          <option value="Self">Self</option>
        </select>
      </td>

      {/* Tags */}
      <td className="px-2 py-2" style={{ width: 110 }}>
        {isIncome ? (
          <span style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.3 }}>—</span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <select
              value={entry.essentiality || ""}
              onChange={(e) => onUpdate(entry.id, { essentiality: e.target.value })}
              className="paper-select"
              style={{
                background: "var(--paper-2)", border: "1px solid var(--rule-paper)",
                color: entry.essentiality === "Essential" ? "var(--green)" : entry.essentiality === "Discretionary" ? "var(--amber)" : "var(--paper-text-dim)",
                fontFamily: "var(--font-sans)", fontSize: 10, borderRadius: 5, padding: "2px 18px 2px 5px", outline: "none",
              }}
            >
              {ESSENTIALITIES.map((e) => <option key={e} value={e}>{e}</option>)}
            </select>
            <select
              value={entry.nature || ""}
              onChange={(e) => onUpdate(entry.id, { nature: e.target.value })}
              className="paper-select"
              style={{
                background: "var(--paper-2)", border: "1px solid var(--rule-paper)",
                color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)", fontSize: 10,
                borderRadius: 5, padding: "2px 18px 2px 5px", outline: "none",
              }}
            >
              {NATURES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        )}
      </td>

      {/* Actions */}
      <td className="px-2 py-2 whitespace-nowrap" style={{ width: 64 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <button onClick={() => onEdit(entry.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)", fontSize: 10, textAlign: "left", padding: "1px 0" }}>
            Edit
          </button>
          <button onClick={() => { if (confirm("Delete?")) onDelete(entry.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--red)", fontFamily: "var(--font-sans)", fontSize: 10, textAlign: "left", padding: "1px 0" }}>
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function LedgerTable({ entries, onUpdate, onDelete, onClearAll }) {
  const [editingId,       setEditingId]       = useState(null);
  const [recatProgress,   setRecatProgress]   = useState(null);
  const [recatNotice,     setRecatNotice]     = useState(null);
  const [clearWizardOpen, setClearWizardOpen] = useState(false);
  const [sortBy,          setSortBy]          = useState("date");
  const [sortDir,         setSortDir]         = useState("desc");

  function toggleSort(field) {
    if (sortBy === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(field); setSortDir(field === "date" ? "desc" : "desc"); }
  }

  const sortedEntries = useMemo(() => {
    const list = [...entries];
    const dir = sortDir === "asc" ? 1 : -1;
    // `amount` is stored unsigned regardless of flow — sort on the signed
    // value (money out as negative) so ordering matches the +/- shown in
    // the Amount column instead of ranking by raw magnitude.
    const signedAmount = (e) => (e.flow === "out" ? -1 : 1) * Number(e.amount);
    list.sort((a, b) => {
      if (sortBy === "amount") return (signedAmount(a) - signedAmount(b)) * dir;
      // date sort falls back to created_at (or id) for same-day entries so
      // ties don't jump around unpredictably on re-render
      const dateCmp = (a.date || "").localeCompare(b.date || "");
      if (dateCmp !== 0) return dateCmp * dir;
      return String(a.id).localeCompare(String(b.id)) * dir;
    });
    return list;
  }, [entries, sortBy, sortDir]);

  async function handleRecategorizeAll() {
    // Re-categorize every "money out" entry in view, not just the ones still
    // stuck on "fallback"/"pending" — the whole point of this button is to
    // let the user force a fresh AI pass over entries that were already
    // (mis)categorized, so scoping it to status !== "done" made it silently
    // do nothing on a month where everything already had *some* category.
    setRecatNotice(null);
    // Self transfers are deliberately exempt from real categorization (see
    // selfTransfer.js) — re-running them through the AI strips that and lets
    // it guess from the raw bank narration, which often reads as a payment
    // to a named person and gets misfiled as Family & Dependents.
    const targets = entries.filter(e => e.flow === "out" && e.category !== "Self");
    if (!targets.length) {
      setRecatNotice("No money-out entries in this view to re-categorize.");
      return;
    }
    setRecatProgress({ done: 0, total: targets.length });
    let failed = 0;
    for (let i = 0; i < targets.length; i++) {
      const e = targets[i];
      try {
        const { purpose } = splitDesc(e);
        const res = await fetch("/api/ai/categorize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: purpose || e.desc, amount: e.amount, beneficiary: e.beneficiary }),
        });
        if (res.ok) onUpdate(e.id, await res.json());
        else failed++;
      } catch { failed++; }
      setRecatProgress({ done: i + 1, total: targets.length });
    }
    setRecatProgress(null);
    setRecatNotice(
      failed
        ? `Re-categorized ${targets.length - failed} of ${targets.length} entries (${failed} failed).`
        : `Re-categorized ${targets.length} entr${targets.length === 1 ? "y" : "ies"}.`,
    );
  }

  if (entries.length === 0) {
    return (
      <div style={{ padding: "28px 16px", textAlign: "center", color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)", fontSize: 13 }}>
        No entries yet. Add one above.
      </div>
    );
  }

  return (
    <div style={{ background: "var(--paper)" }}>

      {/* ── Toolbar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderBottom: "1px solid var(--rule-paper)",
        background: "var(--paper-2)", flexWrap: "wrap", gap: 8,
      }}>
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
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--amber)", display: "inline-block" }} />
              Categorizing {recatProgress.done}/{recatProgress.total}…
            </>
          ) : (
            <>✦ Re-categorize with Trakit AI</>
          )}
        </button>
        {recatNotice && !recatProgress && (
          <span style={{
            fontFamily: "var(--font-sans)", fontSize: 11.5, color: "var(--paper-text-dim)",
          }}>
            {recatNotice}
          </span>
        )}
        {onClearAll && (
          <button
            onClick={() => entries.length && setClearWizardOpen(true)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)", fontSize: 12, padding: 0 }}
          >
            Clear all entries
          </button>
        )}
      </div>

      {/* ── Mobile: card list (hidden on md+) ── */}
      <div className="ledger-mobile">
        {sortedEntries.map((entry) => {
          if (editingId === entry.id) {
            return (
              <div key={entry.id} style={{ padding: "12px 14px", borderBottom: "1px solid var(--rule-paper)", background: "var(--paper-2)" }}>
                <MobileEditForm
                  entry={entry}
                  onSave={(patch) => { onUpdate(entry.id, patch); setEditingId(null); }}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            );
          }
          return (
            <MobileCard
              key={entry.id}
              entry={entry}
              onEdit={setEditingId}
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          );
        })}
      </div>

      {/* ── Desktop: table (hidden on mobile) ── */}
      <div className="ledger-desktop overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr style={{ background: "var(--paper-2)", borderBottom: "2px solid var(--rule-paper)" }}>
              {["Date", "Purpose", "Detail", "Amount", "Category", "Tags", ""].map((h) => {
                const field = h === "Date" ? "date" : h === "Amount" ? "amount" : null;
                const isSorted = field && sortBy === field;
                return (
                  <th key={h} className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)", whiteSpace: "nowrap" }}>
                    {field ? (
                      <button
                        onClick={() => toggleSort(field)}
                        style={{
                          background: "none", border: "none", cursor: "pointer", padding: 0,
                          color: isSorted ? "var(--gold)" : "var(--paper-text-dim)",
                          fontFamily: "var(--font-sans)", fontSize: "inherit", fontWeight: "inherit",
                          textTransform: "inherit", letterSpacing: "inherit",
                          display: "flex", alignItems: "center", gap: 3,
                        }}
                      >
                        {h}
                        <span style={{ fontSize: 9, opacity: isSorted ? 1 : 0.35 }}>
                          {isSorted ? (sortDir === "asc" ? "▲" : "▼") : "▼"}
                        </span>
                      </button>
                    ) : h}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedEntries.map((entry, i) => {
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
              return (
                <DesktopRow
                  key={entry.id}
                  entry={entry}
                  index={i}
                  total={sortedEntries.length}
                  onEdit={setEditingId}
                  onDelete={onDelete}
                  onUpdate={onUpdate}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {clearWizardOpen && (
        <ClearWizard
          entries={entries}
          onConfirm={(ids) => { setClearWizardOpen(false); onClearAll(ids); }}
          onCancel={() => setClearWizardOpen(false)}
        />
      )}
    </div>
  );
}
