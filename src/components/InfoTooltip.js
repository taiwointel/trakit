"use client";

import { useState, useRef, useCallback } from "react";

const TT_W = 240;

export default function InfoTooltip({ text, side = "top" }) {
  const [rect, setRect] = useState(null);
  const btnRef = useRef(null);

  const show = useCallback(() => {
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect());
  }, []);
  const hide = useCallback(() => setRect(null), []);
  const toggle = useCallback((e) => {
    e.preventDefault();
    if (rect) { hide(); } else if (btnRef.current) { setRect(btnRef.current.getBoundingClientRect()); }
  }, [rect, hide]);

  let ttLeft = 0, ttTop = 0;
  if (rect) {
    ttLeft = Math.min(
      Math.max(8, rect.left + rect.width / 2 - TT_W / 2),
      (typeof window !== "undefined" ? window.innerWidth : 400) - TT_W - 8,
    );
    ttTop = side === "top" ? rect.top - 6 : rect.bottom + 8;
  }

  return (
    <span style={{ position: "relative", display: "inline-flex", verticalAlign: "middle" }}>
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={toggle}
        aria-label="More info"
        style={{
          width: 15, height: 15, fontSize: 9, lineHeight: 1,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          borderRadius: "50%", flexShrink: 0,
          background: "var(--gold)", color: "#fff",
          border: "none", cursor: "help",
          fontFamily: "var(--font-sans)", fontWeight: 700,
          boxShadow: "0 0 0 2px rgba(212,160,48,0.2)",
        }}
      >
        i
      </button>

      {rect && (
        <span
          role="tooltip"
          style={{
            position: "fixed",
            zIndex: 9999,
            left: ttLeft,
            top: ttTop,
            transform: side === "top" ? "translateY(calc(-100% - 8px))" : "none",
            width: TT_W,
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 12,
            lineHeight: 1.55,
            background: "var(--ink-3)",
            border: "1px solid var(--rule)",
            color: "var(--ink-text)",
            fontFamily: "var(--font-sans)",
            fontWeight: 400,
            letterSpacing: "normal",
            textTransform: "none",
            boxShadow: "0 8px 32px rgba(0,0,0,0.55)",
            pointerEvents: "none",
          }}
        >
          {text}
        </span>
      )}
    </span>
  );
}
