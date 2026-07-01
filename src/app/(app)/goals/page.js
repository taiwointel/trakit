"use client";

import { useState, useMemo } from "react";
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
  const [setupOpen, setSetupOpen] = useState(false);

  const today     = new Date().toISOString().slice(0, 10);
  const thisMonth = today.slice(0, 7);

  const cycle = useMemo(() => getSalaryCycle(goals.payday_day), [goals.payday_day]);
  const cycleStart = cycle?.start || `${thisMonth}-01`;

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
        <span className="text-sm" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          Loading…
        </span>
      </div>
    );
  }

  const hasSalary = !!goals.salary;

  return (
    <div className="page-root">

      {/* ── HERO: Payday widget ────────────────────────────────────────── */}
      <div className="section-body" style={{ paddingTop: 24 }}>
        <PaydayWidget paydayDay={goals.payday_day} salary={goals.salary} />
      </div>

      {/* ── SALARY SETUP — shown prominently when not yet configured ──────
          Once salary is set, this collapses to a bottom "Edit" section so
          the monitoring content (targets, fund, goals) can take priority. */}
      {!hasSalary && (
        <>
          <div className="section-divider">
            <div className="section-divider-bar" />
            <span className="section-divider-label">Salary &amp; Payday</span>
            <div className="section-divider-rule" />
          </div>
          <p className="section-desc">
            Your salary is the anchor for every key metric in Trakit7. The 50/30/20 split, goal feasibility checks, and your emergency fund benchmark all derive from this number. Set it once and every calculation updates automatically. Update it here whenever your income changes.
          </p>
          <div className="section-body">
            <SalarySetup salary={goals.salary} paydayDay={goals.payday_day} onSave={saveGoals} />
          </div>
        </>
      )}

      {/* ── MONTHLY TARGETS (50/30/20) ────────────────────────────────────
          The most visually compelling view — progress bars, breach badges,
          and the 50/30/20 reallocation. Promoted to top when salary is set
          so users see their financial health immediately on every visit. */}
      <div className="section-divider">
        <div className="section-divider-bar" style={{ background: "var(--violet)" }} />
        <span className="section-divider-label" style={{ color: "var(--violet)" }}>Monthly Targets (50/30/20)</span>
        <div className="section-divider-rule" />
      </div>
      <p className="section-desc">
        The 50/30/20 rule is the most widely used personal budgeting framework endorsed by certified financial planners: 50% of your salary for essential needs, 30% for wants, and 20% directly to savings and investments. Your actual spending is tracked against these targets every salary cycle, not just at month end.
      </p>

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

      {/* ── EMERGENCY FUND ────────────────────────────────────────────────
          Progress bar towards the 6-month safety net — frequently checked
          and motivating to see growing. */}
      <div className="section-divider">
        <div className="section-divider-bar" style={{ background: "var(--blue-accent)" }} />
        <span className="section-divider-label" style={{ color: "var(--blue-accent)" }}>Emergency Fund</span>
        <div className="section-divider-rule" />
      </div>
      <p className="section-desc">
        Financial planners consistently recommend keeping 3 to 6 months of essential living expenses in a liquid emergency fund before pursuing other investments. This panel tracks your progress toward that target and logs every contribution separately from your investment portfolio, so your savings-rate calculation is always accurate.
      </p>

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

      {/* ── CUSTOM SAVINGS GOALS ──────────────────────────────────────────
          Progress towards specific targets — enticing because each card
          shows how close you are and whether you're on track. */}
      <div className="section-divider">
        <div className="section-divider-bar" style={{ background: "var(--teal)" }} />
        <span className="section-divider-label" style={{ color: "var(--teal)" }}>Savings Goals</span>
        <div className="section-divider-rule" />
      </div>
      <p className="section-desc">
        Each goal here calculates the exact monthly saving required to hit your target on time and shows you whether that amount is feasible against your salary. Every naira a goal needs is visibly pulled from the 30% Wants budget and added to Save and Invest, so the trade-off is explicit and not hidden.
      </p>

      <div className="section-body">
        <CustomGoalsPanel
          goals={customGoals}
          salary={goals.salary}
          onAdd={addGoal}
          onUpdateSaved={updateSavedSoFar}
          onDelete={deleteGoal}
        />
      </div>

      {/* ── SALARY & PAYDAY SETUP — edit mode ─────────────────────────────
          Once configured, this becomes a collapsible edit section at the
          bottom. Configuration is a one-off task, not a daily check. */}
      {hasSalary && (
        <>
          <div className="section-divider">
            <div className="section-divider-bar" />
            <span className="section-divider-label">Salary &amp; Payday</span>
            <div className="section-divider-rule" />
          </div>
          <p className="section-desc">
            Update your salary and payday date here whenever they change. Every metric in Trakit7 that references your income recalculates immediately: your 50/30/20 split, goal feasibility, and emergency fund benchmark all derive from this single figure.
          </p>
          <div className="section-body">
            <div style={{ background: "var(--ink-2)", border: "1px solid var(--rule)", borderRadius: 16, overflow: "hidden" }}>
              <button
                onClick={() => setSetupOpen((v) => !v)}
                className="section-toggle"
              >
                <span className="section-toggle-label">Edit salary &amp; payday</span>
                <span className="section-toggle-arrow">
                  {setupOpen ? "▲ Collapse" : "▼ Show"}
                </span>
              </button>
              {setupOpen && (
                <div style={{ padding: "16px 20px" }}>
                  <SalarySetup salary={goals.salary} paydayDay={goals.payday_day} onSave={saveGoals} />
                </div>
              )}
            </div>
          </div>
        </>
      )}

    </div>
  );
}
