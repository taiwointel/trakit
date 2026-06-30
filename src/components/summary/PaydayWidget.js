"use client";

import { nextPayday }      from "@/lib/payday";
import { formatDateLong }  from "@/lib/format";

export default function PaydayWidget({ paydayDay = 22 }) {
  const { daysUntil, isoDate } = nextPayday(paydayDay);

  const emoji    = daysUntil === 0 ? "🎉" : daysUntil <= 3 ? "🔥" : "💰";
  const longDate = formatDateLong(isoDate);

  // Pay-cycle progress: elapsed = 30 - daysUntil, as % of 30-day estimate
  const elapsed  = Math.max(0, 30 - daysUntil);
  const progress = Math.min(100, Math.round((elapsed / 30) * 100));

  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3 shadow-lg"
      style={{
        background:  "linear-gradient(135deg, #C8862E 0%, #A9854F 45%, #8C4F5B 100%)",
        boxShadow:   "0 4px 24px rgba(169, 133, 79, 0.35)",
      }}
    >
      <div className="flex flex-col items-center gap-1 text-white text-center">
        <span className="text-4xl" aria-label={`${daysUntil} days to payday`}>
          {emoji}
        </span>
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
          {progress}% of pay cycle elapsed
        </div>
      </div>
    </div>
  );
}
