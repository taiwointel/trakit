"use client";

/**
 * Coach RBC's avatar — a circular gold-to-rose gradient badge with "RBC"
 * in serif white, per the original design spec. Simple on purpose: no face.
 * size prop controls the rendered width/height.
 */
export default function RbcIllustration({ size = 220, animate = true }) {
  const pulseStyle = animate
    ? { animation: "pulseGlow 2.8s ease-in-out infinite" }
    : {};

  const fontSize = size * 0.26;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Coach RBC"
    >
      <defs>
        <linearGradient id="rbc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C8862E" />
          <stop offset="50%" stopColor="#A9854F" />
          <stop offset="100%" stopColor="#8C4F5B" />
        </linearGradient>
      </defs>

      <circle cx="50" cy="50" r="48" fill="url(#rbc-grad)" />
      <circle cx="50" cy="50" r="48" stroke="white" strokeOpacity="0.15" strokeWidth="1" />

      <g style={pulseStyle}>
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize={fontSize}
          fontWeight="700"
          fontFamily="serif"
          letterSpacing="1"
        >
          RBC
        </text>
      </g>
    </svg>
  );
}
