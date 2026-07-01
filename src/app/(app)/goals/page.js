"use client";

import { useMemo } from "react";
import { getSalaryCycle } from "@/lib/format";
import { useEntries }        from "@/hooks/useEntries";
import { useGoals }          from "@/hooks/useGoals";
import { useEmergencyFund }  from "@/hooks/useEmergencyFund";
import { useCustomGoals }    from "@/hooks/useCustomGoals";
import { useUser }           from "@/hooks/useUser";

import PaydayWidget       from "@/components/summary/PaydayWidget";
import SalarySetup        from "@/components/goals/SalarySetup";
import MonthlyTargets     from "@/components/goals/MonthlyTargets";
import EmergencyFundPanel from "@/components/goals/EmergencyFundPanel";
import CustomGoalsPanel   from "@/components/goals/CustomGoalsPanel";

export default function GoalsPage() {
  const { entries, loading: entriesLoading } = useEntries();
  const { goals, loading: goalsLoading, saveGoals } = useGoals();
  const { transactions, balance, loading: efLoading, addTransaction } = useEmergencyFund();
  const { goals: customGoals, loading: cgLoading, addGoal, updateSavedSoFar, deleteGoal } = useCustomGoals();
  const { name: userName } = useUser();

  const today     = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  // Use salary cycle if configured, else calendar month
  const cycle = useMemo(() => getSalaryCycle(goals.payday_day), [goals.payday_day]);
  const cycleStart = cycle?.start || `${thisMonth}-01`;

  // Emergency fund target = 6 × this cycle's essential spend (or manual override)
  const essentialThisMonth = useMemo(
    () => entries
      .filter((e) => e.date >= cycleStart && e.date <= today && e.flow === "out" && e.essentiality === "Essential")
      .reduce((s, e) => s + Number(e.amount), 0),
    [entries, cycleStart, today],
  );

  const efTarget = goals.emergency_fund_target_override || essentialThisMonth * 6;

  async function handleSetOverride(val) {
    await saveGoals({ emergency_fund_target_override: val });
  }

  if (entriesLoading || goalsLoading || efLoading || cgLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <span
          className="text-sm"
          style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
        >
          Loading…
        </span>
      </div>
    );
  }

  return (
    <div className="page-root">

      {/* ── HERO: Payday widget ────────────────────────────────────────── */}
      <div className="section-body" style={{ paddingTop: 24 }}>
        <PaydayWidget paydayDay={goals.payday_day} salary={goals.salary} />
      </div>

      {/* ── SETUP ─────────────────────────────────────────────────────── */}
      <div className="section-divider">
        <div className="section-divider-bar" />
        <span className="section-divider-label">Salary &amp; Payday</span>
        <div className="section-divider-rule" />
      </div>

      <div className="section-body">
        <SalarySetup
          salary={goals.salary}
          paydayDay={goals.payday_day}
          onSave={saveGoals}
        />
      </div>

      {/* ── MONTHLY TARGETS ───────────────────────────────────────────── */}
      <div className="section-divider">
        <div className="section-divider-bar" style={{ background: "var(--violet)" }} />
        <span className="section-divider-label" style={{ color: "var(--violet)" }}>Monthly Targets (50/30/20)</span>
        <div className="section-divider-rule" />
      </div>

      <div className="section-body">
        <MonthlyTargets
          entries={entries}
          salary={goals.salary}
          customGoals={customGoals}
          userName={userName}
          cycleStart={cycleStart}
          cycleLabel={cycle?.label}
        />
      </div>

      {/* ── EMERGENCY FUND ────────────────────────────────────────────── */}
      <div className="section-divider">
        <div className="section-divider-bar" style={{ background: "var(--blue-accent)" }} />
        <span className="section-divider-label" style={{ color: "var(--blue-accent)" }}>Emergency Fund</span>
        <div className="section-divider-rule" />
      </div>

      <div className="section-body">
        <EmergencyFundPanel
          transactions={transactions}
          balance={balance}
          target={efTarget}
          overrideTarget={goals.emergency_fund_target_override}
          onAdd={addTransaction}
          onSetOverride={handleSetOverride}
        />
      </div>

      {/* ── SAVINGS GOALS ─────────────────────────────────────────────── */}
      <div className="section-divider">
        <div className="section-divider-bar" style={{ background: "var(--teal)" }} />
        <span className="section-divider-label" style={{ color: "var(--teal)" }}>Custom Savings Goals</span>
        <div className="section-divider-rule" />
      </div>

      <div className="section-body">
        <CustomGoalsPanel
          goals={customGoals}
          salary={goals.salary}
          onAdd={addGoal}
          onUpdateSaved={updateSavedSoFar}
          onDelete={deleteGoal}
        />
      </div>

    </div>
  );
}
