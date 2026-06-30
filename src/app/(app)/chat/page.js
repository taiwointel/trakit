"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useEntries }       from "@/hooks/useEntries";
import { useGoals }         from "@/hooks/useGoals";
import { useCashBalance }   from "@/hooks/useCashBalance";
import { useInvestments }   from "@/hooks/useInvestments";
import { useEmergencyFund } from "@/hooks/useEmergencyFund";
import { useCustomGoals }   from "@/hooks/useCustomGoals";
import { useChatMessages }  from "@/hooks/useChatMessages";
import { closingBalance, liquidityCoverage } from "@/lib/cashBalance";
import { maturityCalc, balanceNetValue }     from "@/lib/investments";

const SUGGESTED_PROMPTS = [
  "How am I tracking against the 50/30/20 rule this month?",
  "What are my biggest discretionary expenses and where can I cut?",
  "How healthy is my emergency fund — what does it actually cover?",
  "What's the best way to invest ₦500k safely in Nigeria right now?",
];

function buildSnapshot({ goals, entries, anchor, investments, transactions, efBalance, customGoals }) {
  const today    = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const thisMo   = todayStr.slice(0, 7);
  const thisMoE  = entries.filter((e) => e.date?.startsWith(thisMo));

  const salary   = Number(goals.salary || 0);
  const extraFromGoals = customGoals.reduce((sum, g) => {
    const target = new Date(g.target_date + "T00:00:00");
    const mRemaining = Math.max(1,
      (target.getFullYear() - today.getFullYear()) * 12 + target.getMonth() - today.getMonth()
    );
    return sum + Math.max(0, (Number(g.target_amount) - Number(g.saved_so_far)) / mRemaining);
  }, 0);

  const actualNeeds = thisMoE
    .filter((e) => e.flow === "out" && e.essentiality === "Essential")
    .reduce((s, e) => s + Number(e.amount), 0);
  const actualWants = thisMoE
    .filter((e) => e.flow === "out" && e.essentiality === "Discretionary")
    .reduce((s, e) => s + Number(e.amount), 0);
  const actualIncome = thisMoE
    .filter((e) => e.flow === "in")
    .reduce((s, e) => s + Number(e.amount), 0);

  const efTarget = Number(goals.emergency_fund_target_override || 0) || actualNeeds * 6;
  const cashNow  = anchor.anchor_date
    ? closingBalance(entries, anchor.anchor_date, anchor.anchor_amount, todayStr)
    : null;
  const liquidityMonths = cashNow !== null ? liquidityCoverage(entries, cashNow) : null;

  // Portfolio by investment type
  const portfolioByType = {};
  for (const inv of investments) {
    const txns = transactions.filter((t) => t.investment_id === inv.id);
    let val = 0;
    if      (inv.group === "maturity") val = maturityCalc(inv).price;
    else if (inv.group === "balance")  val = (inv.type === "Equities" && inv.mark_value) ? Number(inv.mark_value) : balanceNetValue(txns);
    else if (inv.group === "life")     val = txns.filter((t) => t.type === "paid").reduce((s, t) => s + Number(t.amount), 0);
    else if (inv.group === "pension")  val = Number(inv.balance || 0);
    portfolioByType[inv.type] = (portfolioByType[inv.type] || 0) + val;
  }
  const portfolioTotal = Object.values(portfolioByType).reduce((s, v) => s + v, 0);

  const spendByCategory = {};
  for (const e of thisMoE.filter((e) => e.flow === "out")) {
    const cat = e.category || "Uncategorized";
    spendByCategory[cat] = (spendByCategory[cat] || 0) + Number(e.amount);
  }

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentBig = [...entries]
    .filter((e) => e.flow === "out" && e.date >= thirtyDaysAgo.toISOString().slice(0, 10))
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5)
    .map((e) => ({ date: e.date, desc: e.desc, amount: Math.round(Number(e.amount)), category: e.category }));

  return {
    today: todayStr,
    salary: salary || null,
    budgets: salary > 0 ? {
      needs:         { target: Math.round(salary * 0.50), actual: Math.round(actualNeeds) },
      wants:         { target: Math.round(Math.max(0, salary * 0.30 - extraFromGoals)), actual: Math.round(actualWants) },
      saveAndInvest: { target: Math.round(salary * 0.20 + extraFromGoals), actual: null },
    } : null,
    income:          { thisMonth: Math.round(actualIncome) },
    emergencyFund:   { balance: Math.round(efBalance), target: Math.round(efTarget), pctFunded: efTarget > 0 ? Math.round((efBalance / efTarget) * 100) : 0 },
    cashBalance:     cashNow !== null ? Math.round(cashNow) : null,
    liquidityMonths: liquidityMonths !== null ? Math.round(liquidityMonths * 10) / 10 : null,
    portfolioByType,
    portfolioTotal:  Math.round(portfolioTotal),
    spendByCategory,
    customGoals:     customGoals.map((g) => ({ name: g.name, target: Number(g.target_amount), saved: Number(g.saved_so_far), targetDate: g.target_date })),
    recentBigTransactions: recentBig,
  };
}

/* ── Avatar component reused in header + bubbles ── */
function RbcAvatar({ size = 28 }) {
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0"
      style={{ width: size, height: size, background: "linear-gradient(135deg, #C8862E, #8C4F5B)" }}
    >
      <span
        style={{
          color: "#fff",
          fontFamily: "var(--font-serif)",
          fontSize: size > 30 ? "0.85rem" : "0.6rem",
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        RBC
      </span>
    </div>
  );
}

/* ── Individual message bubble ── */
function MessageBubble({ message }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <RbcAvatar size={28} />}
      <div
        className="max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
        style={isUser ? {
          background:            "linear-gradient(135deg, var(--gold-deep), var(--gold))",
          color:                 "#1a1208",
          fontFamily:            "var(--font-sans)",
          borderBottomRightRadius: 4,
        } : {
          background:            "var(--ink-2)",
          border:                "1px solid var(--rule)",
          color:                 "var(--ink-text)",
          fontFamily:            "var(--font-sans)",
          borderBottomLeftRadius: 4,
        }}
      >
        {message.content}
      </div>
    </div>
  );
}

/* ── Animated three-dot thinking indicator ── */
function ThinkingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <RbcAvatar size={28} />
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-1.5"
        style={{ background: "var(--ink-2)", border: "1px solid var(--rule)", borderBottomLeftRadius: 4 }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full animate-bounce"
            style={{ background: "var(--ink-text-dim)", animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
      <span className="text-xs pb-1" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
        Coach RBC is thinking…
      </span>
    </div>
  );
}

/* ── Main page ── */
export default function ChatPage() {
  const { entries }                              = useEntries();
  const { goals }                               = useGoals();
  const { anchor }                              = useCashBalance();
  const { investments, transactions }            = useInvestments();
  const { balance: efBalance }                   = useEmergencyFund();
  const { goals: customGoals }                   = useCustomGoals();
  const { messages, addMessage, clearHistory }   = useChatMessages();

  const [input,     setInput]     = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [error,     setError]     = useState(null);

  const textareaRef    = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const snapshot = useMemo(
    () => buildSnapshot({ goals, entries, anchor, investments, transactions, efBalance, customGoals }),
    [goals, entries, anchor, investments, transactions, efBalance, customGoals],
  );

  async function send(prefilled) {
    const content = (prefilled ?? input).trim();
    if (!content || isLoading) return;

    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setError(null);
    setIsLoading(true);

    // Build history before the optimistic update mutates state
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    await addMessage("user", content);

    try {
      const res = await fetch("/api/ai/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          messages: [...history, { role: "user", content }],
          webSearch,
          snapshot,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Coach RBC didn't respond.");
      await addMessage("assistant", data.reply);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function onInput(e) {
    setInput(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  }

  const isEmpty = messages.length === 0 && !isLoading;

  return (
    <div className="flex flex-col" style={{ height: "100%" }}>
      <div className="max-w-3xl mx-auto w-full flex flex-col" style={{ height: "100%" }}>

        {/* ── Header ── */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <RbcAvatar size={48} />
            <div>
              <p
                className="font-bold leading-tight"
                style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)", fontSize: "1.1rem" }}
              >
                Coach RBC
              </p>
              <p
                className="text-xs mt-0.5 leading-tight"
                style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
              >
                Your personal finance coach — already knows your numbers
              </p>
            </div>
          </div>

          {/* Web-research toggle */}
          <label className="flex items-center gap-2 cursor-pointer shrink-0">
            <span
              className="text-xs hidden sm:block"
              style={{ color: webSearch ? "var(--gold)" : "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
            >
              Web research
            </span>
            <button
              role="switch"
              aria-checked={webSearch}
              onClick={() => setWebSearch((v) => !v)}
              className="relative inline-flex items-center rounded-full transition-colors"
              style={{
                width:      36,
                height:     20,
                background: webSearch ? "var(--gold)" : "var(--ink-3)",
                border:     "1px solid var(--rule)",
              }}
              aria-label="Toggle web research"
            >
              <span
                className="absolute rounded-full transition-all"
                style={{
                  width:      14,
                  height:     14,
                  background: "#fff",
                  top:        2,
                  left:       webSearch ? 18 : 2,
                  boxShadow:  "0 1px 3px rgba(0,0,0,0.3)",
                }}
              />
            </button>
          </label>
        </div>

        <div className="mx-4 shrink-0" style={{ height: 1, background: "var(--rule)" }} />

        {/* ── Message thread ── */}
        <div className="flex-1 overflow-y-auto px-4">
          {isEmpty ? (
            /* Empty state */
            <div className="h-full flex flex-col items-center justify-center gap-6 py-8">
              <div className="text-center">
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)" }}
                >
                  Hey, I'm Coach RBC 👋
                </p>
                <p
                  className="text-sm mt-2 max-w-xs mx-auto"
                  style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)", lineHeight: 1.6 }}
                >
                  I already have full visibility into your finances — your spending, savings, investments, and goals. Ask me anything.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full max-w-sm">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => send(prompt)}
                    className="px-4 py-2.5 rounded-lg text-sm text-left transition-colors"
                    style={{
                      background: "var(--ink-2)",
                      border:     "1px solid var(--rule)",
                      color:      "var(--ink-text)",
                      fontFamily: "var(--font-sans)",
                    }}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 py-4">
              {messages.map((m) => (
                <MessageBubble key={m.id} message={m} />
              ))}
              {isLoading && <ThinkingIndicator />}
              {error && (
                <p
                  className="text-xs text-center py-2 px-4 rounded"
                  style={{ color: "var(--red)", fontFamily: "var(--font-sans)", background: "var(--red-soft)" }}
                >
                  {error}
                </p>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* ── Composer ── */}
        <div
          className="shrink-0 px-4 pb-4 pt-3 border-t"
          style={{ borderColor: "var(--rule)" }}
        >
          <div
            className="flex gap-2 items-end rounded-xl p-2.5"
            style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onInput={onInput}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about your finances…"
              rows={1}
              disabled={isLoading}
              className="flex-1 bg-transparent text-sm resize-none outline-none"
              style={{
                color:      "var(--ink-text)",
                fontFamily: "var(--font-sans)",
                minHeight:  "1.75rem",
                maxHeight:  "120px",
                lineHeight: 1.6,
              }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || isLoading}
              className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-opacity"
              style={{
                background: "linear-gradient(135deg, var(--gold-deep), var(--gold))",
                opacity:    !input.trim() || isLoading ? 0.45 : 1,
              }}
              aria-label="Send message"
            >
              {/* Send arrow */}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>

          <div className="flex items-center justify-between mt-2 px-0.5">
            <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
              Enter to send · Shift+Enter for new line
              {webSearch && (
                <span style={{ color: "var(--gold)" }}> · Web research on</span>
              )}
            </p>
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs underline-offset-2 hover:underline"
                style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
              >
                Clear conversation
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
