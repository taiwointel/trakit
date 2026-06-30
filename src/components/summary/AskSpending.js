"use client";

import { useState } from "react";
import { formatNaira } from "@/lib/format";

export default function AskSpending({ entries }) {
  const [question, setQuestion] = useState("");
  const [result,   setResult]   = useState(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function ask() {
    if (!question.trim()) return;
    setLoading(true); setError(""); setResult(null);
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, entries }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setResult(data);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div
      className="rounded-lg p-4 flex flex-col gap-4"
      style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
        Ask about your spending
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") ask(); }}
          placeholder='e.g. "how much on Fuel last month?"'
          className="flex-1 px-3 py-2 rounded text-sm outline-none"
          style={{
            background:  "var(--ink-3)",
            border:      "1px solid var(--rule)",
            color:       "var(--ink-text)",
            fontFamily:  "var(--font-sans)",
          }}
        />
        <button
          onClick={ask}
          disabled={loading || !question.trim()}
          className="px-4 py-2 rounded text-sm font-semibold transition-opacity"
          style={{ background: "var(--gold)", color: "#fff", opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "…" : "Ask"}
        </button>
      </div>

      {error && <p className="text-sm" style={{ color: "var(--red)" }}>{error}</p>}

      {result && (
        <div className="flex flex-col gap-3">
          {/* Headline total */}
          <div className="text-3xl font-bold" style={{ color: "var(--gold)", fontFamily: "var(--font-mono)" }}>
            {formatNaira(result.total)}
          </div>

          {/* AI narrative */}
          {result.narrative && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>
              {result.narrative}
            </p>
          )}

          {/* Matching entries */}
          {result.matches?.length > 0 && (
            <div className="flex flex-col gap-1 mt-1">
              <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                {result.matches.length} matching transaction{result.matches.length !== 1 ? "s" : ""}
              </p>
              {result.matches.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 py-1.5 border-t"
                  style={{ borderColor: "var(--rule)" }}
                >
                  <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)", width: 80 }}>
                    {e.date}
                  </span>
                  <span className="flex-1 text-sm" style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}>
                    {e.desc}
                  </span>
                  <span className="text-sm font-semibold" style={{ color: e.flow === "in" ? "var(--green)" : "var(--red)", fontFamily: "var(--font-mono)" }}>
                    {formatNaira(e.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
