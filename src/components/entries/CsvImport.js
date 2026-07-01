"use client";

import { useState, useRef, useCallback } from "react";

// ── CSV parsing ───────────────────────────────────────────────────────────────

function parseDate(raw) {
  if (!raw) return "";
  const s = raw.trim();
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmy) {
    const [, a, b, c] = dmy;
    const year = c.length === 2 ? `20${c}` : c;
    const aNum = parseInt(a, 10), bNum = parseInt(b, 10);
    if (aNum > 12) return `${year}-${String(bNum).padStart(2,"0")}-${String(aNum).padStart(2,"0")}`;
    return `${year}-${String(aNum).padStart(2,"0")}-${String(bNum).padStart(2,"0")}`;
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  return s;
}

function parseAmt(raw) {
  if (raw == null || raw === "") return null;
  const n = parseFloat(String(raw).replace(/,/g, "").replace(/[^\d.\-]/g, ""));
  return isNaN(n) ? null : Math.abs(n);
}

function detectSep(line) {
  const t = (line.match(/\t/g) || []).length;
  const p = (line.match(/\|/g) || []).length;
  const c = (line.match(/,/g)  || []).length;
  if (t >= c && t >= p) return "\t";
  if (p >= c && p >= t) return "|";
  return ",";
}

function findCol(headers, candidates) {
  for (const c of candidates) {
    const i = headers.findIndex((h) => h.toLowerCase().includes(c.toLowerCase()));
    if (i !== -1) return i;
  }
  return -1;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const sep = detectSep(lines[0]);
  const headers = lines[0].split(sep).map((h) => h.trim().replace(/^"|"$/g, ""));

  const dateIdx   = findCol(headers, ["transaction date","trans date","posting date","date","value date"]);
  const descIdx   = findCol(headers, ["narration","description","transaction details","details","remarks","ref"]);
  const debitIdx  = findCol(headers, ["debit","dr","withdrawal","debit amount"]);
  const creditIdx = findCol(headers, ["credit","cr","deposit","credit amount"]);
  const amtIdx    = debitIdx === -1 && creditIdx === -1
    ? findCol(headers, ["amount","transaction amount"])
    : -1;

  if (dateIdx === -1 || descIdx === -1) return [];

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    const date = parseDate(cells[dateIdx] || "");
    if (!date) continue;
    const desc = (cells[descIdx] || "").trim();
    if (!desc) continue;

    let amount = null, flow = "out";
    if (debitIdx !== -1 || creditIdx !== -1) {
      const d = debitIdx  !== -1 ? parseAmt(cells[debitIdx])  : null;
      const cr = creditIdx !== -1 ? parseAmt(cells[creditIdx]) : null;
      if (d && d > 0)   { amount = d;  flow = "out"; }
      else if (cr && cr > 0) { amount = cr; flow = "in";  }
      else continue;
    } else if (amtIdx !== -1) {
      const raw    = cells[amtIdx] || "";
      const signed = parseFloat(raw.replace(/,/g,"").replace(/[^\d.\-]/g,""));
      if (isNaN(signed)) continue;
      amount = Math.abs(signed);
      flow   = signed < 0 ? "out" : "in";
    } else continue;

    rows.push({ date, desc, amount, flow, beneficiary: "" });
  }
  return rows;
}

// ── Component ─────────────────────────────────────────────────────────────────

const MAX_BYTES = 4 * 1024 * 1024;

const inputBase = {
  background:   "var(--paper-2)",
  border:       "1px solid var(--rule-paper)",
  color:        "var(--paper-text)",
  borderRadius: 4,
  padding:      "2px 6px",
  fontSize:     12,
  outline:      "none",
  width:        "100%",
};

export default function CsvImport({ onImported }) {
  const [open,       setOpen]       = useState(false);
  const [rows,       setRows]       = useState([]);
  const [dragging,   setDragging]   = useState(false);
  const [status,     setStatus]     = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [importing,  setImporting]  = useState(false);
  const fileRef = useRef(null);

  const processFile = useCallback(async (file) => {
    setStatus(null);
    setRows([]);

    if (file.size > MAX_BYTES) {
      setStatus({ type: "error", msg: "File too large (max 4 MB). For PDFs, try exporting a shorter date range from your bank." });
      return;
    }

    const ext = file.name.split(".").pop().toLowerCase();

    if (ext === "csv" || ext === "txt") {
      const text = await file.text();
      const parsed = parseCsv(text);
      if (!parsed.length) {
        setStatus({ type: "error", msg: "Could not detect columns. Make sure the file has Date, Narration, and Debit/Credit columns." });
        return;
      }
      setRows(parsed);
    } else if (ext === "pdf" || ["jpg","jpeg","png","webp"].includes(ext)) {
      setExtracting(true);
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res  = await fetch("/api/migrate/statement", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          setStatus({ type: "error", msg: data.error || "Extraction failed." });
        } else if (!data.rows?.length) {
          setStatus({ type: "error", msg: "No transactions found. Try a clearer image or a different page." });
        } else {
          setRows(data.rows);
        }
      } catch {
        setStatus({ type: "error", msg: "Network error during extraction. Please try again." });
      } finally {
        setExtracting(false);
      }
    } else {
      setStatus({ type: "error", msg: "Unsupported format. Drop a CSV, PDF, JPG, or PNG." });
    }
  }, []);

  const onDrop = (e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) processFile(f); };
  const onPick = (e) => { const f = e.target.files?.[0]; if (f) processFile(f); e.target.value = ""; };

  const updateRow = (i, field, val) =>
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: val } : r));
  const deleteRow = (i) =>
    setRows((prev) => prev.filter((_, idx) => idx !== i));

  const doImport = async () => {
    const valid = rows.filter((r) => r.date && r.desc && Number(r.amount) > 0);
    if (!valid.length) return;
    setImporting(true);
    setStatus(null);
    try {
      const res  = await fetch("/api/entries/bulk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ rows: valid }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: "error", msg: data.error || "Import failed." });
      } else {
        setStatus({ type: "success", msg: `${data.inserted} entries imported. Categories were auto-assigned — review in the ledger below.` });
        setRows([]);
        if (onImported) onImported();
      }
    } catch {
      setStatus({ type: "error", msg: "Network error. Please try again." });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div style={{ borderBottom: "1px solid var(--rule)", background: "var(--ink-2)" }}>

      {/* Toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5"
        style={{ background: "var(--ink-2)" }}
      >
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          Import from bank statement
        </span>
        <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
          {open ? "▲ Collapse" : "▼ Show"}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3">

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className="rounded-xl flex flex-col items-center justify-center gap-1.5 cursor-pointer"
            style={{
              border:     `2px dashed ${dragging ? "var(--gold)" : "var(--rule)"}`,
              background: dragging ? "rgba(169,133,79,0.08)" : "var(--ink-3)",
              padding:    "1.5rem 1rem",
            }}
          >
            <span style={{ fontSize: 24, lineHeight: 1 }}>{extracting ? "⏳" : "📄"}</span>
            {extracting ? (
              <span className="text-sm font-medium" style={{ color: "var(--gold)", fontFamily: "var(--font-sans)" }}>
                Extracting transactions with AI…
              </span>
            ) : (
              <>
                <span className="text-sm" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                  Drop your bank statement here, or{" "}
                  <span style={{ color: "var(--gold)" }}>click to select</span>
                </span>
                <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", opacity: 0.7 }}>
                  CSV · PDF · JPG · PNG — GTBank, Access, Zenith, UBA (max 4 MB)
                </span>
              </>
            )}
            <input ref={fileRef} type="file" accept=".csv,.txt,.pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={onPick} />
          </div>

          {/* Status message */}
          {status && (
            <p className="text-sm" style={{ color: status.type === "error" ? "var(--red)" : "var(--green)", fontFamily: "var(--font-sans)" }}>
              {status.msg}
            </p>
          )}

          {/* Editable table */}
          {rows.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                  {rows.length} transactions — edit or delete before importing
                </p>
                <button
                  onClick={() => setRows([])}
                  className="text-xs"
                  style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
                >
                  Clear all
                </button>
              </div>

              <div
                className="rounded-lg overflow-auto"
                style={{ background: "var(--paper)", maxHeight: 380, border: "1px solid var(--rule-paper)" }}
              >
                <table className="w-full text-xs" style={{ borderCollapse: "collapse", minWidth: 560 }}>
                  <thead>
                    <tr style={{ background: "var(--paper-2)", position: "sticky", top: 0, zIndex: 1 }}>
                      {["Date","Description","Amount (₦)","Flow",""].map((h) => (
                        <th
                          key={h}
                          className="text-left px-2 py-2"
                          style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)", borderBottom: "1px solid var(--rule-paper)", fontWeight: 600 }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--rule-paper)", background: i % 2 === 0 ? "var(--paper)" : "var(--paper-2)" }}>
                        <td className="px-2 py-1" style={{ minWidth: 110 }}>
                          <input
                            type="date"
                            defaultValue={row.date}
                            onBlur={(e) => updateRow(i, "date", e.target.value)}
                            style={{ ...inputBase, fontFamily: "var(--font-mono)", width: 110 }}
                          />
                        </td>
                        <td className="px-2 py-1" style={{ minWidth: 180 }}>
                          <input
                            type="text"
                            defaultValue={row.desc}
                            onBlur={(e) => updateRow(i, "desc", e.target.value)}
                            style={{ ...inputBase, fontFamily: "var(--font-sans)" }}
                          />
                        </td>
                        <td className="px-2 py-1" style={{ minWidth: 110 }}>
                          <input
                            type="text"
                            inputMode="decimal"
                            defaultValue={row.amount}
                            onBlur={(e) => {
                              const v = parseFloat(String(e.target.value).replace(/,/g,""));
                              updateRow(i, "amount", isNaN(v) ? row.amount : v);
                            }}
                            style={{ ...inputBase, fontFamily: "var(--font-mono)", width: 100 }}
                          />
                        </td>
                        <td className="px-2 py-1" style={{ minWidth: 70 }}>
                          <select
                            value={row.flow}
                            onChange={(e) => updateRow(i, "flow", e.target.value)}
                            style={{ ...inputBase, width: "auto", paddingRight: 20 }}
                          >
                            <option value="out">Out</option>
                            <option value="in">In</option>
                          </select>
                        </td>
                        <td className="px-2 py-1">
                          <button
                            onClick={() => deleteRow(i)}
                            title="Remove row"
                            className="text-xs"
                            style={{ color: "var(--red)" }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={doImport}
                disabled={importing}
                className="rounded-lg px-4 py-2 text-sm font-semibold"
                style={{
                  background:  "var(--gold)",
                  color:       "#fff",
                  fontFamily:  "var(--font-sans)",
                  opacity:     importing ? 0.6 : 1,
                  cursor:      importing ? "not-allowed" : "pointer",
                }}
              >
                {importing ? "Importing…" : `Import ${rows.filter((r) => r.date && r.desc && Number(r.amount) > 0).length} rows`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
