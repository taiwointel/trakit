"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatNaira, formatAmountInput, parseAmount } from "@/lib/format";
import InfoTooltip from "@/components/InfoTooltip";

function monthsRemaining(targetDate) {
  if (!targetDate) return 0;
  const today  = new Date();
  const target = new Date(targetDate + "T00:00:00");
  return Math.max(0,
    (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth()),
  );
}

function requiredMonthly(goal) {
  const needed = Math.max(0, Number(goal.target_amount) - Number(goal.saved_so_far));
  return needed / Math.max(1, monthsRemaining(goal.target_date));
}

export default function CustomGoalsPanel({ goals, salary, onAdd, onUpdateSaved, onDelete }) {
  const [showForm,     setShowForm]     = useState(false);
  const [name,         setName]         = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [targetDate,   setTargetDate]   = useState("");
  const [adding,       setAdding]       = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    const parsed = parseAmount(targetAmount);
    if (!name.trim() || parsed <= 0 || !targetDate) return;
    setAdding(true);
    await onAdd({ name: name.trim(), target_amount: parsed, target_date: targetDate });
    setName(""); setTargetAmount(""); setTargetDate("");
    setShowForm(false);
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p
          className="text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5"
          style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
        >
          Custom savings goals
          <InfoTooltip text="Each goal shows how much you need to save per month to hit it on time. 'On track' means that amount fits within your 20% savings budget. Note: if you have several goals, they are checked one by one, not added together, so meeting each individually does not guarantee you can fund all of them at once." />
        </p>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="text-xs px-3 py-1.5 rounded font-medium"
          style={{ background: "var(--gold)", color: "#fff", fontFamily: "var(--font-sans)" }}
        >
          {showForm ? "Cancel" : "+ Add goal"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleAdd}
          className="rounded-lg p-4 flex flex-col gap-3"
          style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
        >
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1 flex-1" style={{ minWidth: 140 }}>
              <label className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                Goal name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. MacBook Pro"
                className="px-3 py-2 rounded text-sm outline-none"
                style={{
                  background: "var(--ink-3)",
                  border:     "1px solid var(--rule)",
                  color:      "var(--ink-text)",
                  fontFamily: "var(--font-sans)",
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                Target (₦)
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={targetAmount}
                onChange={(e) => setTargetAmount(formatAmountInput(e.target.value))}
                placeholder="0"
                className="px-3 py-2 rounded text-sm outline-none w-40"
                style={{
                  background: "var(--ink-3)",
                  border:     "1px solid var(--rule)",
                  color:      "var(--ink-text)",
                  fontFamily: "var(--font-mono)",
                }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
                Target date
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="px-2 py-2 rounded text-sm outline-none"
                style={{
                  background: "var(--ink-3)",
                  border:     "1px solid var(--rule)",
                  color:      "var(--ink-text)",
                  fontFamily: "var(--font-mono)",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={adding}
              className="px-4 py-2 rounded text-sm font-semibold"
              style={{
                background: "var(--gold)",
                color:      "#fff",
                opacity:    adding ? 0.6 : 1,
                fontFamily: "var(--font-sans)",
              }}
            >
              {adding ? "…" : "Add"}
            </button>
          </div>
        </form>
      )}

      {goals.length === 0 && !showForm && (
        <p className="text-sm" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          No goals yet. Add one above to see how it adjusts your 50/30/20 budget.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {goals.map((g) => (
          <GoalCard
            key={g.id}
            goal={g}
            salary={salary}
            onUpdateSaved={onUpdateSaved}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

function GoalCard({ goal, salary, onUpdateSaved, onDelete }) {
  const router = useRouter();
  const [savedInput,     setSavedInput]     = useState(
    goal.saved_so_far ? Number(goal.saved_so_far).toLocaleString("en-NG", { maximumFractionDigits: 0 }) : "",
  );
  const [saving,         setSaving]         = useState(false);
  const [confirmDelete,  setConfirmDelete]  = useState(false);

  const target   = Number(goal.target_amount);
  const saved    = Number(goal.saved_so_far);
  const needed   = Math.max(0, target - saved);
  const months   = monthsRemaining(goal.target_date);
  const reqPer   = requiredMonthly(goal);
  const pct      = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
  const feasible = salary ? reqPer <= salary * 0.20 : true;

  function askCoachAboutGoal() {
    const msg = `I set a savings goal called "${goal.name}". Target: ${formatNaira(target)} by ${goal.target_date}. I have saved ${formatNaira(saved)} so far and need ${formatNaira(reqPer)} per month to hit it on time. Can I actually afford this? Does it fit my overall financial picture?`;
    if (typeof window !== "undefined") {
      sessionStorage.setItem("trakit7-chat-prefill", msg);
    }
    router.push("/chat");
  }

  async function handleSaveUpdate(e) {
    e.preventDefault();
    setSaving(true);
    await onUpdateSaved(goal.id, parseAmount(savedInput));
    setSaving(false);
  }

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{ background: "var(--ink-2)", border: "1px solid var(--rule)", borderLeft: "3px solid var(--violet)" }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)" }}
          >
            {goal.name}
          </p>
          <p
            className="text-xs mt-0.5"
            style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}
          >
            {formatNaira(target)} · due {goal.target_date} · {months} mo left
          </p>
        </div>
        <span
          className="text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded shrink-0"
          style={{
            background: feasible ? "var(--green-soft)" : "var(--amber-soft)",
            color:      feasible ? "var(--green)"       : "var(--amber)",
            fontFamily: "var(--font-sans)",
          }}
        >
          {feasible ? "On track" : "Tight"}
        </span>
      </div>

      {/* Gold progress bar */}
      <div>
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: 8, background: "var(--ink-3)" }}
        >
          <div
            style={{
              width:        `${pct}%`,
              height:       "100%",
              background:   "linear-gradient(90deg, var(--violet), var(--rose))",
              borderRadius: 4,
              transition:   "width 0.4s",
            }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs" style={{ color: "var(--violet)", fontFamily: "var(--font-mono)" }}>
            {pct.toFixed(1)}%
          </span>
          <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-mono)" }}>
            {formatNaira(saved)} saved · {formatNaira(needed)} to go
          </span>
        </div>
      </div>

      {/* Required per month */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs flex items-center gap-1.5" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          Required/month:
          <InfoTooltip text="How much you need to save each month from today to reach the target on time. Calculated as: (target amount minus what you have saved so far) divided by months remaining." />
        </span>
        <span
          className="text-sm font-semibold"
          style={{ color: "var(--ink-text)", fontFamily: "var(--font-mono)" }}
        >
          {formatNaira(reqPer)}
        </span>
        {!feasible && salary && (
          <span className="text-xs" style={{ color: "var(--amber)", fontFamily: "var(--font-sans)" }}>
            (exceeds 20% savings budget of {formatNaira(salary * 0.20, { compact: true })})
          </span>
        )}
      </div>

      {/* Ask Coach RBC */}
      <button
        type="button"
        onClick={askCoachAboutGoal}
        className="w-full text-sm font-medium py-2 px-4 rounded-lg text-left flex items-center gap-2"
        style={{
          background: "linear-gradient(135deg, rgba(240,74,128,0.12) 0%, rgba(155,114,214,0.10) 100%)",
          border: "1px solid rgba(240,74,128,0.22)",
          color: "var(--rose)",
          fontFamily: "var(--font-sans)",
        }}
      >
        <span style={{ fontSize: 16 }}>✦</span>
        Ask Coach RBC: Can I afford this goal?
      </button>

      {/* Update saved control */}
      <form onSubmit={handleSaveUpdate} className="flex gap-2 items-center flex-wrap">
        <span className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          Saved so far:
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={savedInput}
          onChange={(e) => setSavedInput(formatAmountInput(e.target.value))}
          className="px-2 py-1.5 rounded text-sm outline-none w-36"
          style={{
            background: "var(--ink-3)",
            border:     "1px solid var(--rule)",
            color:      "var(--ink-text)",
            fontFamily: "var(--font-mono)",
          }}
        />
        <button
          type="submit"
          disabled={saving}
          className="px-3 py-1.5 rounded text-xs font-semibold"
          style={{
            background: "var(--ink-3)",
            border:     "1px solid var(--rule)",
            color:      "var(--ink-text)",
            opacity:    saving ? 0.6 : 1,
            fontFamily: "var(--font-sans)",
          }}
        >
          {saving ? "…" : "Update"}
        </button>
        <button
          type="button"
          onClick={() => confirmDelete ? onDelete(goal.id) : setConfirmDelete(true)}
          onBlur={() => setTimeout(() => setConfirmDelete(false), 200)}
          className="ml-auto text-xs px-2 py-1.5 rounded"
          style={{
            color:      confirmDelete ? "var(--red)" : "var(--ink-text-dim)",
            fontFamily: "var(--font-sans)",
          }}
        >
          {confirmDelete ? "Confirm delete" : "✕"}
        </button>
      </form>
    </div>
  );
}
