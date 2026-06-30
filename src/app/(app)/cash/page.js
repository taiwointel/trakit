"use client";

import { useMemo } from "react";
import { useEntries }       from "@/hooks/useEntries";
import { useCashBalance }   from "@/hooks/useCashBalance";
import { useInvestments }   from "@/hooks/useInvestments";

import CashSetup            from "@/components/cash/CashSetup";
import DailyNavigator       from "@/components/cash/DailyNavigator";
import BalanceTable         from "@/components/cash/BalanceTable";
import PortfolioSummary     from "@/components/investments/PortfolioSummary";
import LogInvestmentForm    from "@/components/investments/LogInvestmentForm";
import MaturityCard         from "@/components/investments/MaturityCard";
import BalanceCard          from "@/components/investments/BalanceCard";
import LifeAssuranceCard    from "@/components/investments/LifeAssuranceCard";
import PensionCard          from "@/components/investments/PensionCard";

function GroupHeader({ title }) {
  return (
    <p
      className="text-xs font-semibold uppercase tracking-widest mt-2"
      style={{ color: "var(--gold)", fontFamily: "var(--font-sans)" }}
    >
      {title}
    </p>
  );
}

export default function CashPage() {
  const { entries, loading: entriesLoading } = useEntries();
  const { anchor, loading: anchorLoading, saveAnchor } = useCashBalance();
  const {
    investments, transactions, loading: invLoading,
    addInvestment, updateInvestment, deleteInvestment,
    addTransaction, bulkAddTransactions, txnsFor,
  } = useInvestments();

  const maturityInvs = useMemo(() => investments.filter((i) => i.group === "maturity"), [investments]);
  const balanceInvs  = useMemo(() => investments.filter((i) => i.group === "balance"),  [investments]);
  const lifeInvs     = useMemo(() => investments.filter((i) => i.group === "life"),     [investments]);
  const pensionInvs  = useMemo(() => investments.filter((i) => i.group === "pension"),  [investments]);

  if (entriesLoading || anchorLoading || invLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <span className="text-sm" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          Loading…
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 max-w-4xl mx-auto w-full pb-12">

      {/* ── Cash balance ─────────────────────────────── */}
      <CashSetup anchor={anchor} onSave={saveAnchor} />

      <DailyNavigator entries={entries} anchor={anchor} />

      {anchor.anchor_date && (
        <BalanceTable entries={entries} anchor={anchor} />
      )}

      {/* ── Investments ──────────────────────────────── */}
      <div className="flex items-center justify-between mt-2">
        <p
          className="text-xs font-semibold uppercase tracking-widest"
          style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
        >
          Investments
        </p>
      </div>

      {investments.length > 0 && (
        <PortfolioSummary investments={investments} transactions={transactions} />
      )}

      <LogInvestmentForm onAdd={addInvestment} />

      {/* Fixed-income & money market */}
      {maturityInvs.length > 0 && (
        <div className="flex flex-col gap-3">
          <GroupHeader title="Fixed-income & money market" />
          {maturityInvs.map((inv) => (
            <MaturityCard
              key={inv.id}
              inv={inv}
              onDelete={deleteInvestment}
            />
          ))}
        </div>
      )}

      {/* Funds & holdings */}
      {balanceInvs.length > 0 && (
        <div className="flex flex-col gap-3">
          <GroupHeader title="Funds & holdings" />
          {balanceInvs.map((inv) => (
            <BalanceCard
              key={inv.id}
              inv={inv}
              txns={txnsFor(inv.id)}
              onAddTxn={addTransaction}
              onUpdate={updateInvestment}
              onDelete={deleteInvestment}
            />
          ))}
        </div>
      )}

      {/* Life assurance */}
      {lifeInvs.length > 0 && (
        <div className="flex flex-col gap-3">
          <GroupHeader title="Life assurance" />
          {lifeInvs.map((inv) => (
            <LifeAssuranceCard
              key={inv.id}
              inv={inv}
              txns={txnsFor(inv.id)}
              onAddTxn={addTransaction}
              onBulkAddTxn={bulkAddTransactions}
              onUpdate={updateInvestment}
              onDelete={deleteInvestment}
            />
          ))}
        </div>
      )}

      {/* Pension */}
      {pensionInvs.length > 0 && (
        <div className="flex flex-col gap-3">
          <GroupHeader title="Pension" />
          {pensionInvs.map((inv) => (
            <PensionCard
              key={inv.id}
              inv={inv}
              txns={txnsFor(inv.id)}
              onUpdate={updateInvestment}
              onAddTxn={addTransaction}
              onDelete={deleteInvestment}
            />
          ))}
        </div>
      )}

      {investments.length === 0 && (
        <p className="text-sm" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
          No investments logged yet — add one above.
        </p>
      )}

    </div>
  );
}
