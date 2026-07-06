"use client";

import { useState, useMemo, useRef } from "react";
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
  const { anchor, loading: anchorLoading, saveAnchor, clearAnchor } = useCashBalance();
  const {
    investments, transactions, loading: invLoading,
    addInvestment, updateInvestment, deleteInvestment,
    addTransaction, bulkAddTransactions, txnsFor,
  } = useInvestments();

  const [anchorEditOpen,  setAnchorEditOpen]  = useState(false);
  const [balTableOpen,    setBalTableOpen]    = useState(false);
  const [addInvOpen,      setAddInvOpen]      = useState(false);
  const addInvRef = useRef(null);

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
      <div className="section-divider" data-tour="cash-balance">
        <div className="section-divider-bar" />
        <span className="section-divider-label">Cash Balance</span>
        <div className="section-divider-rule" />
      </div>
      <p className="section-desc">
        Tell it what you actually had in your account on one date, and it does the arithmetic for every day after that automatically — using the entries you log, not a second number you'd have to keep updating by hand. That single fact is also what powers your balance across the app: the liquidity/runway gauge and net worth both need a real cash figure to work from. Get a fresh reading out of sync with reality (found cash, a missed bank fee)? Re-anchor with today's date and true balance — it moves the starting point forward without touching any past entries.
      </p>

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
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                <CashSetup anchor={anchor} onSave={saveAnchor} />
                <div style={{ borderTop: "1px solid var(--rule)", paddingTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 12, lineHeight: 1.6, margin: 0, flex: 1, minWidth: 200 }}>
                    Anchor looking wrong (e.g. saved with the wrong amount) and re-entering it above hasn&apos;t fixed it? Clear it entirely and set it up fresh.
                  </p>
                  <button
                    onClick={() => {
                      if (!confirm("Clear the cash balance anchor? You'll be asked to set a fresh starting date and amount — no ledger entries are affected.")) return;
                      clearAnchor();
                      setAnchorEditOpen(false);
                    }}
                    style={{
                      background: "none", border: "1px solid var(--red)", color: "var(--red)",
                      fontFamily: "var(--font-sans)", fontSize: 12, fontWeight: 600,
                      borderRadius: 6, padding: "6px 12px", cursor: "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    Reset anchor
                  </button>
                </div>
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
      <p className="section-desc">
        Tracking what you owe is as important as tracking what you own. Outstanding loans logged here are reflected in the net worth calculation on the Summary page, giving you a complete and honest picture of your actual financial position rather than just the assets side.
      </p>

      <div className="section-body">
        <LoanTracker />
      </div>

      {/* ── INVESTMENTS ───────────────────────────────────────────────────
          Portfolio summary and all investment cards come first — this is
          the content users want to see (performance, progress, status).
          "Log a new investment" sits at the bottom because it's an
          occasional action, not the daily reason for visiting this page.
      ── */}
      <div className="section-divider" data-tour="investments-section">
        <div className="section-divider-bar" style={{ background: "var(--teal)" }} />
        <span className="section-divider-label" style={{ color: "var(--teal)" }}>Investments</span>
        <div className="section-divider-rule" />
      </div>
      <p className="section-desc">
        Your full investment portfolio in one view: Treasury bills, fixed-term notes, equities, savings accounts, mutual funds, ethical investments, life assurance, and pension. Each position shows live status, accrued return, and progress toward maturity or coverage target.
      </p>

      <div className="section-body">
        {investments.length > 0 && (
          <PortfolioSummary investments={investments} transactions={transactions} />
        )}

        {/* Log a new investment — lives here, immediately after the portfolio overview */}
        <div
          ref={addInvRef}
          style={{ background: "var(--ink-2)", border: "1px solid var(--rule)", borderRadius: 16, overflow: "hidden" }}
        >
          <button
            onClick={() => {
              setAddInvOpen((v) => {
                if (!v) setTimeout(() => addInvRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 50);
                return !v;
              });
            }}
            className="section-toggle"
          >
            <span className="section-toggle-label" style={{ color: "var(--gold)" }}>
              + Log a New Investment
            </span>
            <span className="section-toggle-arrow">
              {addInvOpen ? "▲ Collapse" : "▼ Add"}
            </span>
          </button>
          {addInvOpen && (
            <div style={{ padding: "16px 20px" }}>
              <LogInvestmentForm onAdd={(data) => { addInvestment(data); setAddInvOpen(false); }} />
            </div>
          )}
        </div>

        {investments.length === 0 && !addInvOpen && (
          <p style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", fontSize: 14 }}>
            No investments logged yet. Use the form above to add one.
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
          <p className="section-desc">
            Treasury bills, commercial papers, and fixed-term notes. Trakit7 tracks elapsed tenor as a percentage, computes your actual return using discount-basis pricing for T-bills and CPs, and simple-interest basis for FTNs, and flags positions as matured the moment their tenor elapses.
          </p>
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
          <p className="section-desc">
            Savings accounts, equities, mutual funds, and ethical investments. Value is tracked as net deposits minus withdrawals. For equities, you can set a current market value at any time and Trakit7 computes your real gain or loss against what you originally paid in.
          </p>
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
          <p className="section-desc">
            Your life assurance policy tracked month by month. Trakit7 detects overdue months automatically, including months that were never logged in the first place, so your true arrears figure is always accurate. The batch logger lets you backfill years of payment history in a single action.
          </p>
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
          <p className="section-desc">
            Your pension balance with automatic monthly accrual. Each time you open Trakit7, any unrecorded contribution months since your last login are added automatically so the balance stays current without manual input. You can make one-off adjustments to account for returns credited directly by your PFA.
          </p>
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


    </div>
  );
}
