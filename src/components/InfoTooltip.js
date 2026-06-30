"use client";

import { useState } from "react";

/**
 * Small "i" badge that reveals an explanatory tooltip on hover/focus/tap.
 * Drop next to a label or panel heading: <InfoTooltip text="..." />
 */
export default function InfoTooltip({ text, side = "top" }) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex" style={{ verticalAlign: "middle" }}>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        aria-label="More info"
        className="inline-flex items-center justify-center rounded-full shrink-0"
        style={{
          width:       14,
          height:      14,
          fontSize:    9,
          lineHeight:  1,
          background:  "var(--ink-3)",
          color:       "var(--ink-text-dim)",
          border:      "1px solid var(--rule)",
          cursor:      "help",
          fontFamily:  "var(--font-sans)",
          fontWeight:  700,
        }}
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute z-50 rounded-lg px-3 py-2 text-xs leading-relaxed normal-case font-normal"
          style={{
            [side === "top" ? "bottom" : "top"]: "calc(100% + 6px)",
            left:        0,
            width:       230,
            background:  "var(--ink-3)",
            border:      "1px solid var(--rule)",
            color:       "var(--ink-text)",
            fontFamily:  "var(--font-sans)",
            letterSpacing: "normal",
            boxShadow:   "0 4px 20px rgba(0,0,0,0.4)",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
