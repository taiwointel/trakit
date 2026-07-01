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
    <div className="flex flex-col gap-4 p-4 max-w-4xl mx-auto w-full pb-12">

      {/* Payday widget — no href since we're already on Goals */}
      <PaydayWidget paydayDay={goals.payday_day} salary={goals.salary} />

      {/* Salary & payday setup */}
      <SalarySetup
        salary={goals.salary}
        paydayDay={goals.payday_day}
        onSave={saveGoals}
      />

      {/* 50/30/20 monthly targets */}
      <MonthlyTargets
        entries={entries}
        salary={goals.salary}
        customGoals={customGoals}
        userName={userName}
        cycleStart={cycleStart}
        cycleLabel={cycle?.label}
      />

      {/* Emergency fund */}
      <EmergencyFundPanel
        transactions={transactions}
        balance={balance}
        target={efTarget}
        overrideTarget={goals.emergency_fund_target_override}
        onAdd={addTransaction}
        onSetOverride={handleSetOverride}
      />

      {/* Custom savings goals */}
      <CustomGoalsPanel
        goals={customGoals}
        salary={goals.salary}
        onAdd={addGoal}
        onUpdateSaved={updateSavedSoFar}
        onDelete={deleteGoal}
      />

    </div>
  );
}
