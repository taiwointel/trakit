"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { useEntries }       from "@/hooks/useEntries";
import { useGoals }         from "@/hooks/useGoals";
import { useCashBalance }   from "@/hooks/useCashBalance";
import { useInvestments }   from "@/hooks/useInvestments";
import { useEmergencyFund } from "@/hooks/useEmergencyFund";
import { useCustomGoals }   from "@/hooks/useCustomGoals";
import { useChatMessages }  from "@/hooks/useChatMessages";
import { useUser }          from "@/hooks/useUser";
import RbcIllustration      from "@/components/RbcIllustration";
import { closingBalance, liquidityCoverage } from "@/lib/cashBalance";
import { maturityCalc, balanceNetValue }     from "@/lib/investments";

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return { label: "Good morning",  icon: "sun" };
  if (h >= 12 && h < 17) return { label: "Good afternoon", icon: "sun" };
  if (h >= 17 && h < 21) return { label: "Good evening",  icon: "moon" };
  return { label: "Good night", icon: "moon" };
}

function TimeIcon({ type }) {
  if (type === "moon") {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
        style={{ color: "#9DA3C8", filter: "drop-shadow(0 0 8px rgba(157,163,200,0.6))" }}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" fill="rgba(157,163,200,0.18)" />
      </svg>
    );
  }
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
      style={{ color: "#E8920A", filter: "drop-shadow(0 0 10px rgba(232,146,10,0.7))" }}>
      <circle cx="12" cy="12" r="5" fill="rgba(232,146,10,0.22)" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

const SUGGESTED_PROMPTS = [
  "How am I tracking against the 50/30/20 rule this month?",
  "What are my biggest discretionary expenses and where can I cut?",
  "How healthy is my emergency fund? What does it actually cover?",
  "What's the best way to invest ₦500k safely in Nigeria right now?",
];

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB per file
const ACCEPTED_TYPES = "image/jpeg,image/png,image/gif,image/webp,application/pdf";

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

  const actualNeeds  = thisMoE.filter((e) => e.flow === "out" && e.essentiality === "Essential").reduce((s, e) => s + Number(e.amount), 0);
  const actualWants  = thisMoE.filter((e) => e.flow === "out" && e.essentiality === "Discretionary").reduce((s, e) => s + Number(e.amount), 0);
  const actualIncome = thisMoE.filter((e) => e.flow === "in").reduce((s, e) => s + Number(e.amount), 0);

  const efTarget  = Number(goals.emergency_fund_target_override || 0) || actualNeeds * 6;
  const cashNow   = anchor.anchor_date ? closingBalance(entries, anchor.anchor_date, anchor.anchor_amount, todayStr) : null;
  const liquidityMonths = cashNow !== null ? liquidityCoverage(entries, cashNow) : null;

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

  const spendByCategory = {};
  for (const e of thisMoE.filter((e) => e.flow === "out")) {
    spendByCategory[e.category || "Uncategorized"] = (spendByCategory[e.category || "Uncategorized"] || 0) + Number(e.amount);
  }

  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentBig = [...entries]
    .filter((e) => e.flow === "out" && e.date >= thirtyDaysAgo.toISOString().slice(0, 10))
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, 5)
    .map((e) => ({ date: e.date, desc: e.desc, amount: Math.round(Number(e.amount)), category: e.category }));

  return {
    today: todayStr, salary: salary || null,
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
    portfolioTotal:  Math.round(Object.values(portfolioByType).reduce((s, v) => s + v, 0)),
    spendByCategory,
    customGoals:     customGoals.map((g) => ({ name: g.name, target: Number(g.target_amount), saved: Number(g.saved_so_far), targetDate: g.target_date })),
    recentBigTransactions: recentBig,
  };
}

/* ── Small inline avatar for bubbles ── */
function RbcAvatarSmall() {
  return (
    <div
      className="rounded-full shrink-0 overflow-hidden"
      style={{ width: 32, height: 32 }}
    >
      <RbcIllustration size={32} animate={false} />
    </div>
  );
}

function AttachmentChip({ name, isImage, onRemove }) {
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
      style={{ background: "rgba(169,133,79,0.15)", border: "1px solid rgba(169,133,79,0.3)", color: "var(--gold)", fontFamily: "var(--font-sans)" }}
    >
      <span style={{ fontSize: 11 }}>{isImage ? "🖼" : "📄"}</span>
      <span className="truncate max-w-[120px]">{name}</span>
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: "var(--gold)", lineHeight: 1 }}
          aria-label={`Remove ${name}`}
        >
          ×
        </button>
      )}
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";

  // Parse attachment notation appended when saving: "\n📎 file1.jpg, file2.pdf"
  const attachMarker = "\n📎 ";
  const attachIdx = message.content.indexOf(attachMarker);
  const mainContent = attachIdx >= 0 ? message.content.slice(0, attachIdx) : message.content;
  const attachNames = attachIdx >= 0 ? message.content.slice(attachIdx + attachMarker.length).split(", ") : [];

  return (
    <div className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && <RbcAvatarSmall />}
      <div className="max-w-[78%] flex flex-col gap-1.5" style={{ alignItems: isUser ? "flex-end" : "flex-start" }}>
        {mainContent.trim() && (
          <div
            className="rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
            style={isUser ? {
              background:              "linear-gradient(135deg, #C8862E, #A9854F)",
              color:                   "#1a1208",
              fontFamily:              "var(--font-sans)",
              borderBottomRightRadius: 4,
              boxShadow:               "0 2px 12px rgba(200,134,46,0.25)",
            } : {
              background:              "var(--ink-2)",
              border:                  "1px solid var(--rule)",
              color:                   "var(--ink-text)",
              fontFamily:              "var(--font-sans)",
              borderBottomLeftRadius:  4,
            }}
          >
            {mainContent}
          </div>
        )}
        {attachNames.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {attachNames.map((name) => (
              <AttachmentChip
                key={name}
                name={name}
                isImage={/\.(jpe?g|png|gif|webp)$/i.test(name)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <RbcAvatarSmall />
      <div
        className="rounded-2xl px-4 py-3 flex items-center gap-1.5"
        style={{ background: "var(--ink-2)", border: "1px solid var(--rule)", borderBottomLeftRadius: 4 }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full animate-bounce"
            style={{ background: "var(--gold)", animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
      <span className="text-xs pb-1" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
        thinking…
      </span>
    </div>
  );
}

export default function ChatPage() {
  const { entries }                            = useEntries();
  const { goals }                             = useGoals();
  const { anchor }                            = useCashBalance();
  const { investments, transactions }          = useInvestments();
  const { balance: efBalance }                 = useEmergencyFund();
  const { goals: customGoals }                 = useCustomGoals();
  const { messages, addMessage, clearHistory } = useChatMessages();
  const { name }                               = useUser();

  const [input,       setInput]       = useState("");
  const [isLoading,   setIsLoading]   = useState(false);
  const [webSearch,   setWebSearch]   = useState(false);
  const [error,       setError]       = useState(null);
  const [attachments, setAttachments] = useState([]); // [{name, mimeType, data, isImage}]
  const [fileError,   setFileError]   = useState(null);

  const textareaRef    = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef   = useRef(null);

  // Pick up pre-fill from goal card "Ask Coach RBC" button
  useEffect(() => {
    const pending = sessionStorage.getItem("trakit7-chat-prefill");
    if (pending) {
      sessionStorage.removeItem("trakit7-chat-prefill");
      setInput(pending);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = "auto";
          textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
          textareaRef.current.focus();
        }
      }, 50);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const snapshot = useMemo(
    () => buildSnapshot({ goals, entries, anchor, investments, transactions, efBalance, customGoals }),
    [goals, entries, anchor, investments, transactions, efBalance, customGoals],
  );

  async function handleFileSelect(e) {
    setFileError(null);
    const selected = Array.from(e.target.files);
    const errors = [];
    const valid = [];

    for (const file of selected) {
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} is too large (max 4 MB).`);
        continue;
      }
      valid.push(file);
    }

    if (errors.length) setFileError(errors.join(" "));

    const processed = await Promise.all(valid.map(async (file) => {
      const reader = new FileReader();
      const dataUrl = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      return {
        name:    file.name,
        mimeType: file.type,
        data:    dataUrl.split(",")[1], // base64 only, strip prefix
        isImage: file.type.startsWith("image/"),
      };
    }));

    setAttachments((prev) => [...prev, ...processed].slice(0, 5));
    e.target.value = "";
  }

  function removeAttachment(index) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  async function send(prefilled) {
    const content = (prefilled ?? input).trim();
    if ((!content && attachments.length === 0) || isLoading) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setError(null);
    setFileError(null);
    setIsLoading(true);

    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    // Content saved to Supabase: text + attachment file names as readable notation
    const saveContent = attachments.length > 0
      ? `${content}${content ? "\n📎 " : "📎 "}${attachments.map((f) => f.name).join(", ")}`
      : content;

    await addMessage("user", saveContent);

    // Files sent to API (base64 data) — not persisted to DB
    const filesPayload = attachments.map(({ name, mimeType, data }) => ({ name, mimeType, data }));
    setAttachments([]);

    try {
      const res = await fetch("/api/ai/chat", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          messages: [...history, { role: "user", content: content || " " }],
          webSearch,
          snapshot,
          files: filesPayload,
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
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function onInput(e) {
    setInput(e.target.value);
    const ta = textareaRef.current;
    if (ta) { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 120) + "px"; }
  }

  const isEmpty = messages.length === 0 && !isLoading;
  const firstName = name ? name.split(" ")[0] : null;
  const tod = getTimeOfDay();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="max-w-3xl mx-auto w-full flex flex-col flex-1 min-h-0">

        {/* ── Header ── */}
        <div
          data-tour="rbc-header"
          className="px-4 pt-4 pb-4 flex items-center justify-between gap-4 shrink-0"
          style={{
            background: "linear-gradient(to bottom, rgba(200,134,46,0.12) 0%, transparent 100%)",
            borderBottom: "1px solid var(--rule)",
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="rounded-full overflow-hidden shrink-0"
              style={{
                width: 56,
                height: 56,
                boxShadow: "0 0 0 2px var(--gold), 0 4px 20px rgba(200,134,46,0.3)",
              }}
            >
              <RbcIllustration size={56} animate={false} />
            </div>
            <div>
              <p
                className="font-bold leading-tight"
                style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)", fontSize: "1.15rem" }}
              >
                Coach RBC
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
              >
                Your personal finance coach · Upload receipts or statements to analyse
              </p>
            </div>
          </div>

          {/* Web-research toggle */}
          <label className="flex items-center gap-2 cursor-pointer shrink-0">
            <span
              className="text-xs hidden sm:block"
              style={{ color: webSearch ? "var(--gold)" : "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
            >
              Web
            </span>
            <button
              role="switch"
              aria-checked={webSearch}
              onClick={() => setWebSearch((v) => !v)}
              className="relative inline-flex items-center rounded-full transition-colors"
              style={{ width: 36, height: 20, background: webSearch ? "var(--gold)" : "var(--ink-3)", border: "1px solid var(--rule)" }}
              aria-label="Toggle web research"
            >
              <span
                className="absolute rounded-full transition-all"
                style={{ width: 14, height: 14, background: "#fff", top: 2, left: webSearch ? 18 : 2, boxShadow: "0 1px 3px rgba(0,0,0,0.3)" }}
              />
            </button>
          </label>
        </div>

        {/* ── Message thread ── */}
        <div className="flex-1 overflow-y-auto px-4">
          {isEmpty ? (
            <div className="h-full flex flex-col items-center justify-center gap-6 py-6">
              <div style={{ filter: "drop-shadow(0 8px 40px rgba(169,133,79,0.35))" }}>
                <RbcIllustration size={140} animate={true} />
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center gap-2.5 mb-1">
                  <TimeIcon type={tod.icon} />
                  <p
                    className="font-bold leading-tight"
                    style={{ color: "var(--ink-text)", fontFamily: "var(--font-serif)", fontSize: "1.6rem" }}
                  >
                    {firstName ? `${tod.label}, ${firstName}` : tod.label}
                  </p>
                  <TimeIcon type={tod.icon} />
                </div>
                <p
                  className="font-medium mt-1"
                  style={{ color: "var(--gold)", fontFamily: "var(--font-serif)", fontSize: "1.1rem" }}
                >
                  I&apos;m Coach RBC, your financial advisor
                </p>
                <p
                  className="text-sm mt-2 max-w-xs mx-auto leading-relaxed"
                  style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
                >
                  I already know your spending, savings, investments, and goals. Ask me anything or upload a bank statement, receipt, or document.
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full max-w-sm">
                {SUGGESTED_PROMPTS.map((prompt, i) => (
                  <button
                    key={prompt}
                    onClick={() => send(prompt)}
                    className="px-4 py-2.5 rounded-xl text-sm text-left transition-all"
                    style={{
                      background: "var(--ink-2)",
                      border:     "1px solid var(--rule)",
                      color:      "var(--ink-text)",
                      fontFamily: "var(--font-sans)",
                      borderLeft: `3px solid ${["var(--gold)", "var(--blue-accent)", "var(--green)", "var(--amber)"][i % 4]}`,
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
                  className="text-xs text-center py-2 px-4 rounded-xl"
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
        <div className="shrink-0 px-4 pb-4 pt-3 border-t" style={{ borderColor: "var(--rule)" }}>

          {/* Attachment previews */}
          {attachments.length > 0 && (
            <div className="flex gap-1.5 flex-wrap mb-2.5 px-0.5">
              {attachments.map((att, i) => (
                <AttachmentChip
                  key={i}
                  name={att.name}
                  isImage={att.isImage}
                  onRemove={() => removeAttachment(i)}
                />
              ))}
            </div>
          )}

          {fileError && (
            <p className="text-xs mb-2 px-0.5" style={{ color: "var(--red)", fontFamily: "var(--font-sans)" }}>
              {fileError}
            </p>
          )}

          <div
            className="flex gap-2 items-end rounded-2xl p-2.5"
            style={{ background: "var(--ink-2)", border: "1px solid var(--rule)" }}
          >
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES}
              multiple
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />

            {/* Attach button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || attachments.length >= 5}
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{
                background: attachments.length > 0 ? "rgba(169,133,79,0.2)" : "var(--ink-3)",
                border:     attachments.length > 0 ? "1px solid rgba(169,133,79,0.4)" : "1px solid var(--rule)",
                color:      attachments.length > 0 ? "var(--gold)" : "var(--ink-text-dim)",
                opacity:    isLoading || attachments.length >= 5 ? 0.4 : 1,
              }}
              title="Attach image or document (max 4 MB each, up to 5 files)"
              aria-label="Attach file"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
              </svg>
            </button>

            <textarea
              ref={textareaRef}
              value={input}
              onInput={onInput}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={attachments.length > 0 ? "Ask something about the attached file…" : "Ask Coach RBC about your finances…"}
              rows={1}
              disabled={isLoading}
              className="flex-1 bg-transparent text-sm resize-none outline-none"
              style={{ color: "var(--ink-text)", fontFamily: "var(--font-sans)", minHeight: "1.75rem", maxHeight: "120px", lineHeight: 1.6 }}
            />
            <button
              onClick={() => send()}
              disabled={(!input.trim() && attachments.length === 0) || isLoading}
              className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all"
              style={{
                background: "linear-gradient(135deg, #C8862E, #A9854F)",
                opacity:    (!input.trim() && attachments.length === 0) || isLoading ? 0.4 : 1,
                boxShadow:  (!input.trim() && attachments.length === 0) || isLoading ? "none" : "0 2px 12px rgba(200,134,46,0.4)",
              }}
              aria-label="Send message"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>

          <div className="flex items-center justify-between mt-2 px-0.5">
            <p className="text-xs" style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}>
              Enter to send · Shift+Enter for new line
              {webSearch && <span style={{ color: "var(--gold)" }}> · Web on</span>}
              {attachments.length > 0 && <span style={{ color: "var(--gold)" }}> · {attachments.length} file{attachments.length > 1 ? "s" : ""} attached</span>}
            </p>
            {messages.length > 0 && (
              <button
                onClick={clearHistory}
                className="text-xs underline-offset-2 hover:underline"
                style={{ color: "var(--ink-text-dim)", fontFamily: "var(--font-sans)" }}
              >
                Clear chat
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
