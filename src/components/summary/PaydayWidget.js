"use client";

import Link from "next/link";
import { nextPayday }      from "@/lib/payday";
import { formatDateLong }  from "@/lib/format";

export default function PaydayWidget({ paydayDay = 22, salary, href }) {
  const notSetUp = !salary;

  const { daysUntil, isoDate } = notSetUp ? { daysUntil: null, isoDate: null } : nextPayday(paydayDay);

  const emoji    = notSetUp ? "💰" : daysUntil === 0 ? "🎉" : daysUntil <= 3 ? "🔥" : "💰";
  const longDate = isoDate ? formatDateLong(isoDate) : null;

  const elapsed  = notSetUp ? 0 : Math.max(0, 30 - daysUntil);
  const progress = notSetUp ? 0 : Math.min(100, Math.round((elapsed / 30) * 100));

  const content = (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 shadow-lg"
      style={{
        background:  "linear-gradient(135deg, #C8862E 0%, #A9854F 45%, #8C4F5B 100%)",
        boxShadow:   "0 4px 24px rgba(169, 133, 79, 0.35)",
        cursor:      href ? "pointer" : "default",
        transition:  "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => { if (href) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(169,133,79,0.45)"; } }}
      onMouseLeave={(e) => { if (href) { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 4px 24px rgba(169, 133, 79, 0.35)"; } }}
    >
      <div className="flex flex-col items-center gap-1 text-white text-center">
        <span className="text-4xl" aria-label="payday countdown">
          {emoji}
        </span>

        {notSetUp ? (
          <>
            <div
              className="text-5xl font-bold leading-none"
              style={{ fontFamily: "var(--font-serif)", opacity: 0.6 }}
            >
              --
            </div>
            <div className="text-sm opacity-70 mt-1" style={{ fontFamily: "var(--font-sans)" }}>
              days to payday
            </div>
            <div
              className="text-xs opacity-60 mt-1 px-3 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.15)", fontFamily: "var(--font-sans)" }}
            >
              {href ? "Set your salary to activate" : "Set salary in Goals to activate"}
            </div>
          </>
        ) : (
          <>
            <div
              className="text-5xl font-bold leading-none"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {daysUntil === 0 ? "Today!" : `${daysUntil}`}
            </div>
            {daysUntil > 0 && (
              <div className="text-sm opacity-80" style={{ fontFamily: "var(--font-sans)" }}>
                days to payday
              </div>
            )}
            <div
              className="text-sm font-medium mt-1 opacity-90"
              style={{ fontFamily: "var(--font-mono)" }}
            >
              {longDate}
            </div>
          </>
        )}
      </div>

      {/* Pay-cycle progress bar */}
      <div className="flex flex-col gap-1">
        <div
          className="w-full rounded-full overflow-hidden"
          style={{ height: 6, background: "rgba(255,255,255,0.25)" }}
        >
          <div
            style={{
              width:        `${progress}%`,
              height:       "100%",
              background:   "rgba(255,255,255,0.85)",
              borderRadius: 3,
              transition:   "width 0.4s",
            }}
          />
        </div>
        <div
          className="text-xs opacity-70 text-white text-right"
          style={{ fontFamily: "var(--font-mono)" }}
        >
          {notSetUp ? "0% of pay cycle elapsed" : `${progress}% of pay cycle elapsed`}
        </div>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} style={{ textDecoration: "none", display: "block" }}>
        {content}
      </Link>
    );
  }
  return content;
}
