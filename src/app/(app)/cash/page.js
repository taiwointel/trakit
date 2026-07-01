"use client";

import { useState, useMemo } from "react";
import { useEntries }       from "@/hooks/useEntries";
import { useCashBalance }   from "@/hooks/useCashBalance";
import { useInvestments }   from "@/hooks/useInvestments";

import CashSetup            from "@/components/cash/CashSetup";
import DailyNavigator       from "@/components/cash/DailyNavigator";
import BalanceTable         from "@/components/cash/BalanceTable";
import LoanTracker          from "@/components/cash/LoanTracker";
import PortfolioSummary     from "@/components/investments/PortfolioSummary";
import LogInvestmentForm    from "@/components/investments/LogInvestmentForm";
import MaturityCard         from "@/components/investments/MaturityCard";
import BalanceCard          from "@/components/investments/BalanceCard";
import LifeAssuranceCard    from "@/components/investments/LifeAssuranceCard";
import PensionCard          from "@/components/investments/PensionCard";

export default function CashPage() {
  const { entries, loading: entriesLoading } = useEntries();
  const { anchor, loading: anchorLoading, saveAnchor } = useCashBalance();
  const {
    investments, transactions, loading: invLoading,
    addInvestment, updateInvestment, deleteInvestment,
    addTransaction, bulkAddTransactions, txnsFor,
  } = useInvestments();

  const [anchorEditOpen, setAnchorEditOpen] = useState(false);
  const [balTableOpen,   setBalTableOpen]   = useState(false);

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

  const hasAnchor = !!anchor.anchor_date;

  return (
    <div className="page-root">

      {/* ── CASH BALANCE ──────────────────────────────────────────────────
          When the anchor is set, DailyNavigator (today's balance) is the
          #1 thing users come here for — it leads.
          When no anchor exists, the setup form must come first since
          nothing else can render meaningful numbers without it.
      ── */}
      <div className="section-divider">
        <div className="section-divider-bar" />
        <span className="section-divider-label">Cash Balance</span>
        <div className="section-divider-rule" />
      </div>

      {!hasAnchor ? (
        /* ── First-time setup ── */
        <div className="section-body">
          <CashSetup anchor={anchor} onSave={saveAnchor} />
          <DailyNavigator entries={entries} anchor={anchor} />
        </div>
      ) : (
        /* ── Returning user: balance navigator is the hero ── */
        <div className="section-body">
          <DailyNavigator entries={entries} anchor={anchor} />

          {/* 14-day history — collapsible; useful but not the first thing
              someone wants to see on a quick daily balance check */}
          <div style={{ background: "var(--ink-2)", border: "1px solid var(--rule)", borderRadius: 16, overflow: "hidden" }}>
            <button
              onClick={() => setBalTableOpen((v) => !v)}
              className="section-toggle"
            >
              <span className="section-toggle-label">Last 14 days</span>
              <span className="section-toggle-arrow">
                {balTableOpen ? "▲ Collapse" : "▼ Show"}
              </span>
            </button>
            {balTableOpen && <BalanceTable entries={entries} anchor={anchor} />}
          </div>

          {/* Edit anchor — configuration task, rarely needed once set */}
          <div style={{ background: "var(--ink-2)", border: "1px solid var(--rule)", borderRadius: 16, overflow: "hidden" }}>
            <button
              onClick={() => setAnchorEditOpen((v) => !v)}
              className="section-toggle"
            >
              <span className="section-toggle-label">Edit anchor balance</span>
              <span className="section-toggle-arrow">
                {anchorEditOpen ? "▲ Collapse" : "▼ Show"}
              </span>
            </button>
            {anchorEditOpen && (
              <div style={{ padding: "16px 20px" }}>
                <CashSetup anchor={anchor} onSave={saveAnchor} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── LOANS ─────────────────────────────────────────────────────── */}
      <div className="section-divider">
        <div className="section-divider-bar" style={{ background: "var(--blue-accent)" }} />
        <span className="section-divider-label" style={{ color: "var(--blue-accent)" }}>Loans</span>
        <div className="section-divider-rule" />
      </div>

      <div className="section-body">
        <LoanTracker />
      </div>

      {/* ── INVESTMENTS ───────────────────────────────────────────────────
          Portfolio summary and all investment cards come first — this is
          the content users want to see (performance, progress, status).
          "Log a new investment" sits at the bottom because it's an
          occasional action, not the daily reason for visiting this page.
      ── */}
      <div className="section-divider">
        <div className="section-divider-bar" style={{ background: "var(--teal)" }} />
        <span className="section-divider-label" style={{ color: "var(--teal)" }}>Investments</span>
        <div className="section-divider-rule" />
      </div>

      <div className="section-body">
        {investments.length > 0 && (
          <PortfolioSummary investments={investments} transactions={transactions} />
        )}

        {investments.length === 0 && (
          <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 14 }}>
            No investments logged yet. Use the form below to add one.
          </p>
        )}
      </div>

      {/* Fixed-income & money market */}
      {maturityInvs.length > 0 && (
        <>
          <div className="section-divider">
            <div className="section-divider-bar" style={{ background: "var(--gold)", width: 2, height: 12 }} />
            <span style={{ color: "var(--gold)", fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Fixed-income &amp; Money Market
            </span>
            <div className="section-divider-rule" />
          </div>
          <div className="section-body" style={{ paddingTop: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {maturityInvs.map((inv) => (
                <MaturityCard key={inv.id} inv={inv} onDelete={deleteInvestment} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Funds & holdings */}
      {balanceInvs.length > 0 && (
        <>
          <div className="section-divider">
            <div className="section-divider-bar" style={{ background: "var(--teal)", width: 2, height: 12 }} />
            <span style={{ color: "var(--teal)", fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Funds &amp; Holdings
            </span>
            <div className="section-divider-rule" />
          </div>
          <div className="section-body" style={{ paddingTop: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
          </div>
        </>
      )}

      {/* Life assurance */}
      {lifeInvs.length > 0 && (
        <>
          <div className="section-divider">
            <div className="section-divider-bar" style={{ background: "var(--rose)", width: 2, height: 12 }} />
            <span style={{ color: "var(--rose)", fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Life Assurance
            </span>
            <div className="section-divider-rule" />
          </div>
          <div className="section-body" style={{ paddingTop: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
          </div>
        </>
      )}

      {/* Pension */}
      {pensionInvs.length > 0 && (
        <>
          <div className="section-divider">
            <div className="section-divider-bar" style={{ background: "var(--violet)", width: 2, height: 12 }} />
            <span style={{ color: "var(--violet)", fontFamily: "var(--font-sans)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Pension
            </span>
            <div className="section-divider-rule" />
          </div>
          <div className="section-body" style={{ paddingTop: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
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
          </div>
        </>
      )}

      {/* ── LOG A NEW INVESTMENT ──────────────────────────────────────────
          Add form lives at the bottom — it's the occasional "I just got
          a new T-bill" action, not the reason users open this page daily. */}
      <div className="section-divider">
        <div className="section-divider-bar" style={{ background: "var(--gold)" }} />
        <span className="section-divider-label" style={{ color: "var(--gold)" }}>Log a New Investment</span>
        <div className="section-divider-rule" />
      </div>

      <div className="section-body">
        <LogInvestmentForm onAdd={addInvestment} />
      </div>

    </div>
  );
}
