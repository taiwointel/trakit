"use client";

import { useState, useRef, useCallback } from "react";

function parseDate(raw) {
  if (!raw) return null;
  const s = raw.trim();
  const dmyMatch = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (dmyMatch) {
    const [, a, b, c] = dmyMatch;
    const year  = c.length === 2 ? `20${c}` : c;
    const aNum  = parseInt(a, 10);
    const bNum  = parseInt(b, 10);
    if (aNum > 12) {
      return `${year}-${String(bNum).padStart(2, "0")}-${String(aNum).padStart(2, "0")}`;
    }
    return `${year}-${String(aNum).padStart(2, "0")}-${String(bNum).padStart(2, "0")}`;
  }
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  return null;
}

function parseAmount(raw) {
  if (!raw && raw !== 0) return null;
  const s = String(raw).replace(/,/g, "").replace(/[^\d.\-]/g, "");
  const n = parseFloat(s);
  return isNaN(n) ? null : Math.abs(n);
}

function detectSep(line) {
  const commas = (line.match(/,/g) || []).length;
  const tabs   = (line.match(/\t/g) || []).length;
  const pipes  = (line.match(/\|/g) || []).length;
  if (tabs  >= commas && tabs  >= pipes) return "\t";
  if (pipes >= commas && pipes >= tabs)  return "|";
  return ",";
}

function findColIdx(headers, candidates) {
  for (const c of candidates) {
    const idx = headers.findIndex((h) => h.toLowerCase().includes(c.toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const sep    = detectSep(lines[0]);
  const header = lines[0].split(sep).map((h) => h.trim().replace(/^"|"$/g, ""));

  const dateIdx   = findColIdx(header, ["transaction date", "date", "value date", "trans date", "posting date"]);
  const descIdx   = findColIdx(header, ["narration", "description", "details", "remarks", "transaction details", "ref"]);
  const debitIdx  = findColIdx(header, ["debit", "dr", "withdrawal", "debit amount"]);
  const creditIdx = findColIdx(header, ["credit", "cr", "deposit", "credit amount"]);
  const amtIdx    = debitIdx === -1 && creditIdx === -1
    ? findColIdx(header, ["amount", "transaction amount"])
    : -1;

  if (dateIdx === -1 || (descIdx === -1)) return [];

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(sep).map((c) => c.trim().replace(/^"|"$/g, ""));
    if (!cells[dateIdx]) continue;

    const date = parseDate(cells[dateIdx]);
    if (!date) continue;

    const desc = descIdx !== -1 ? (cells[descIdx] || "").trim() : "";
    if (!desc) continue;

    let amount = null;
    let flow   = "out";

    if (debitIdx !== -1 || creditIdx !== -1) {
      const debitVal  = debitIdx  !== -1 ? parseAmount(cells[debitIdx])  : null;
      const creditVal = creditIdx !== -1 ? parseAmount(cells[creditIdx]) : null;
      if (debitVal && debitVal > 0) {
        amount = debitVal; flow = "out";
      } else if (creditVal && creditVal > 0) {
        amount = creditVal; flow = "in";
      } else {
        continue;
      }
    } else if (amtIdx !== -1) {
      const raw = cells[amtIdx] || "";
      const signed = parseFloat(raw.replace(/,/g, "").replace(/[^\d.\-]/g, ""));
      if (isNaN(signed)) continue;
      amount = Math.abs(signed);
      flow   = signed < 0 ? "out" : "in";
    } else {
      continue;
    }

    rows.push({ date, desc, amount, flow, beneficiary: null });
  }
  return rows;
}

export default function CsvImport({ onImported }) {
  const [open,       setOpen]       = useState(false);
  const [preview,    setPreview]    = useState([]);
  const [allRows,    setAllRows]    = useState([]);
  const [dragging,   setDragging]   = useState(false);
  const [status,     setStatus]     = useState(null);
  const [importing,  setImporting]  = useState(false);
  const fileRef = useRef(null);

  const processFile = useCallback((file) => {
    setStatus(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const rows = parseCsv(text);
      if (rows.length === 0) {
        setStatus({ type: "error", msg: "Could not parse any rows. Check the file format." });
        setAllRows([]);
        setPreview([]);
        return;
      }
      setAllRows(rows);
      setPreview(rows.slice(0, 5));
      setStatus(null);
    };
    reader.readAsText(file);
  }, []);

  const onFilePick = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const doImport = async () => {
    if (!allRows.length) return;
    setImporting(true);
    setStatus(null);
    try {
      const res  = await fetch("/api/entries/bulk", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ rows: allRows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ type: "error", msg: data.error || "Import failed." });
      } else {
        setStatus({ type: "success", msg: `${data.inserted} entries imported successfully.` });
        setAllRows([]);
        setPreview([]);
        if (onImported) onImported();
      }
    } catch {
      setStatus({ type: "error", msg: "Network error. Please try again." });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div
      style={{ borderBottom: "1px solid var(--rule)", background: "var(--ink-2)" }}
    >
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2.5"
        style={{ background: "var(--ink-2)" }}
      >
        <span
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
        >
          Import from bank statement CSV
        </span>
        <span
          className="text-xs"
          style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}
        >
          {open ? "▲ Collapse" : "▼ Show"}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className="rounded-xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all"
            style={{
              border: `2px dashed ${dragging ? "var(--gold)" : "var(--rule)"}`,
              background: dragging ? "rgba(169,133,79,0.08)" : "var(--ink-3)",
              padding: "2rem 1rem",
              minHeight: "100px",
            }}
          >
            <span
              className="text-2xl"
              style={{ lineHeight: 1 }}
            >
              📄
            </span>
            <span
              className="text-sm text-center"
              style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
            >
              Drag & drop your CSV file here, or{" "}
              <span style={{ color: "var(--gold)" }}>click to select</span>
            </span>
            <span
              className="text-xs"
              style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
            >
              Supports GTBank, Access, Zenith, UBA formats (.csv, .txt)
            </span>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={onFilePick}
            />
          </div>

          {preview.length > 0 && (
            <div className="flex flex-col gap-2">
              <p
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
              >
                Preview — first {preview.length} of {allRows.length} rows
              </p>
              <div
                className="rounded-lg overflow-auto"
                style={{ background: "var(--paper)", maxHeight: "220px" }}
              >
                <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "var(--paper-2)" }}>
                      {["Date", "Description", "Amount", "Flow"].map((h) => (
                        <th
                          key={h}
                          className="text-left px-3 py-2"
                          style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)", borderBottom: "1px solid var(--rule-paper)" }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--rule-paper)" }}>
                        <td className="px-3 py-1.5" style={{ color: "var(--paper-text)", fontFamily: "var(--font-mono)" }}>{row.date}</td>
                        <td className="px-3 py-1.5 max-w-xs truncate" style={{ color: "var(--paper-text)", fontFamily: "var(--font-sans)" }}>{row.desc}</td>
                        <td className="px-3 py-1.5" style={{ color: row.flow === "out" ? "var(--red)" : "var(--green)", fontFamily: "var(--font-mono)" }}>
                          ₦{Number(row.amount).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-3 py-1.5" style={{ color: "var(--paper-text-dim)", fontFamily: "var(--font-sans)" }}>
                          {row.flow === "out" ? "Out" : "In"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button
                onClick={doImport}
                disabled={importing}
                className="rounded-lg px-4 py-2 text-sm font-semibold transition-opacity"
                style={{
                  background: "var(--gold)",
                  color: "#fff",
                  fontFamily: "var(--font-sans)",
                  opacity: importing ? 0.6 : 1,
                  cursor: importing ? "not-allowed" : "pointer",
                }}
              >
                {importing ? "Importing…" : `Import ${allRows.length} rows`}
              </button>
            </div>
          )}

          {status && (
            <p
              className="text-sm"
              style={{
                color: status.type === "error" ? "var(--red)" : "var(--green)",
                fontFamily: "var(--font-sans)",
              }}
            >
              {status.msg}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
