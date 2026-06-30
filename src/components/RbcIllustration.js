"use client";

/**
 * SVG illustration of Coach RBC — a warm, friendly young woman with long
 * flowing hair. Used in the chat empty state and header.
 * size prop controls the rendered width/height.
 */
export default function RbcIllustration({ size = 220, animate = true }) {
  const floatStyle = animate
    ? { animation: "floatA 4s ease-in-out infinite" }
    : {};
  const floatBStyle = animate
    ? { animation: "floatB 3.5s ease-in-out infinite" }
    : {};
  const glowStyle = animate
    ? { animation: "pulseGlow 2.5s ease-in-out infinite" }
    : {};

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 300 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Coach RBC illustration"
    >
      <defs>
        {/* Warm violet-to-gold background */}
        <radialGradient id="rbc-bg" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#5B4080" />
          <stop offset="55%" stopColor="#2E2350" />
          <stop offset="100%" stopColor="#15102A" />
        </radialGradient>

        {/* Skin tone — soft warm */}
        <radialGradient id="rbc-skin" cx="40%" cy="28%" r="68%">
          <stop offset="0%" stopColor="#F4C9A8" />
          <stop offset="55%" stopColor="#E0A87E" />
          <stop offset="100%" stopColor="#B97D52" />
        </radialGradient>

        {/* Long hair — warm chestnut with shine */}
        <linearGradient id="rbc-hair" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#4A2A1E" />
          <stop offset="50%" stopColor="#2E1810" />
          <stop offset="100%" stopColor="#1A0D08" />
        </linearGradient>
        <linearGradient id="rbc-hair-shine" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8A5A3E" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#8A5A3E" stopOpacity="0" />
        </linearGradient>

        {/* Blouse — soft rose-gold */}
        <linearGradient id="rbc-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C8537A" />
          <stop offset="100%" stopColor="#7A2E4C" />
        </linearGradient>
        <linearGradient id="rbc-top-hi" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F0879F" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#F0879F" stopOpacity="0" />
        </linearGradient>

        {/* Gold coin gradient */}
        <radialGradient id="rbc-coin" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#F0C060" />
          <stop offset="60%" stopColor="#C8862E" />
          <stop offset="100%" stopColor="#7A4B10" />
        </radialGradient>

        <clipPath id="rbc-circle">
          <circle cx="150" cy="150" r="145" />
        </clipPath>
      </defs>

      {/* Background circle */}
      <circle cx="150" cy="150" r="148" fill="url(#rbc-bg)" />
      <circle cx="150" cy="150" r="100" stroke="#8A6FA8" strokeWidth="1" opacity="0.18" />
      <circle cx="150" cy="150" r="130" stroke="#8A6FA8" strokeWidth="0.5" opacity="0.1" />

      <g clipPath="url(#rbc-circle)">
        {/* ── LONG HAIR — back layer, flows past shoulders ── */}
        <path
          d="M62 110 Q50 200 70 300 L92 300 Q78 210 92 130 Z"
          fill="url(#rbc-hair)"
        />
        <path
          d="M238 110 Q250 200 230 300 L208 300 Q222 210 208 130 Z"
          fill="url(#rbc-hair)"
        />
        <path
          d="M70 95 Q55 180 75 300 L100 300 Q86 200 98 120 Z"
          fill="url(#rbc-hair)" opacity="0.9"
        />
        <path
          d="M230 95 Q245 180 225 300 L200 300 Q214 200 202 120 Z"
          fill="url(#rbc-hair)" opacity="0.9"
        />

        {/* ── TOP / SHOULDERS ── */}
        <path
          d="M38 320 Q55 235 100 218 L150 245 L200 218 Q245 235 262 320 Z"
          fill="url(#rbc-top)"
        />
        <path
          d="M38 320 Q55 235 100 218 L120 232 Q78 252 60 320 Z"
          fill="url(#rbc-top-hi)"
        />
        {/* neckline */}
        <path
          d="M122 222 Q150 248 178 222 L172 238 Q150 256 128 238 Z"
          fill="#9B3A5E" opacity="0.6"
        />

        {/* ── NECK ── */}
        <rect x="136" y="196" width="28" height="26" rx="13" fill="url(#rbc-skin)" />

        {/* ── FACE ── */}
        <ellipse cx="150" cy="153" rx="54" ry="62" fill="url(#rbc-skin)" />
        <ellipse cx="150" cy="192" rx="42" ry="18" fill="#B97D52" opacity="0.2" />

        {/* ── HAIR — front/top volume, framing the face ── */}
        <path
          d="M90 165 Q72 110 98 78 Q120 52 150 50 Q180 52 202 78 Q228 110 210 165
             Q214 130 198 100 Q188 118 192 145
             Q175 95 150 92 Q125 95 108 145
             Q112 118 102 100
             Q86 130 90 165 Z"
          fill="url(#rbc-hair)"
        />
        <path
          d="M150 50 Q180 52 202 78 Q220 100 214 135 Q200 105 178 88 Q190 70 150 50 Z"
          fill="url(#rbc-hair-shine)"
        />
        {/* side-swept strands across forehead */}
        <path d="M112 100 Q130 84 150 88" stroke="#5C3826" strokeWidth="1" opacity="0.35" fill="none" />
        <path d="M188 100 Q170 84 150 88" stroke="#5C3826" strokeWidth="1" opacity="0.35" fill="none" />

        {/* ── FACIAL FEATURES ── */}
        <path d="M115 138 Q126 130 140 133" stroke="#3D2418" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <path d="M160 133 Q174 130 185 138" stroke="#3D2418" strokeWidth="2.6" strokeLinecap="round" fill="none" />

        <ellipse cx="128" cy="149" rx="11" ry="8" fill="white" />
        <circle cx="128" cy="149" r="5.5" fill="#4A2A12" />
        <circle cx="128" cy="149" r="2.7" fill="#1A0D08" />
        <circle cx="130.5" cy="146.5" r="1.6" fill="white" opacity="0.9" />

        <ellipse cx="172" cy="149" rx="11" ry="8" fill="white" />
        <circle cx="172" cy="149" r="5.5" fill="#4A2A12" />
        <circle cx="172" cy="149" r="2.7" fill="#1A0D08" />
        <circle cx="174.5" cy="146.5" r="1.6" fill="white" opacity="0.9" />

        <path d="M117 146 Q128 141 139 146" stroke="#3D2418" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <path d="M161 146 Q172 141 183 146" stroke="#3D2418" strokeWidth="1.3" fill="none" strokeLinecap="round" />

        {/* nose */}
        <path d="M145 159 Q148 168 150 166 Q152 168 155 159" stroke="#A06B45" strokeWidth="1.6" fill="none" strokeLinecap="round" />

        {/* lips — soft rose */}
        <path d="M133 179 Q141 175 150 177 Q159 175 167 179 Q159 184 150 181 Q141 184 133 179 Z" fill="#C8627A" />
        <path d="M133 179 Q142 187 150 185 Q158 187 167 179 Q159 184 150 181 Q141 184 133 179 Z" fill="#D97B8E" />
        <ellipse cx="146" cy="183" rx="5" ry="2" fill="white" opacity="0.2" />

        {/* cheek blush */}
        <ellipse cx="111" cy="163" rx="14" ry="9" fill="#E8849A" opacity="0.18" />
        <ellipse cx="189" cy="163" rx="14" ry="9" fill="#E8849A" opacity="0.18" />

        {/* small gold hoop earrings, peeking through hair */}
        <circle cx="98" cy="172" r="4" fill="none" stroke="#F0C060" strokeWidth="1.6" opacity="0.85" />
        <circle cx="202" cy="172" r="4" fill="none" stroke="#F0C060" strokeWidth="1.6" opacity="0.85" />
      </g>

      {/* ── FLOATING ELEMENTS ── */}
      <g style={floatStyle}>
        <circle cx="242" cy="68" r="20" fill="url(#rbc-coin)" />
        <circle cx="242" cy="68" r="16" stroke="#F0C060" strokeWidth="1" opacity="0.4" fill="none" />
        <text x="242" y="74" textAnchor="middle" fill="#5A2D00" fontSize="14" fontWeight="bold" fontFamily="serif">₦</text>
      </g>

      <g transform="translate(32, 55)" style={floatBStyle}>
        <rect width="48" height="38" rx="8" fill="#2E2350" stroke="#8A6FA8" strokeWidth="1" />
        <polyline points="6,28 14,20 22,24 30,12 38,16" stroke="#2F9C8F" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="38" cy="16" r="3" fill="#2F9C8F" />
        <path d="M4,32 H44" stroke="#8A6FA8" strokeWidth="0.8" opacity="0.5" />
      </g>

      <g transform="translate(228, 196)" style={glowStyle}>
        <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="#F0C060" opacity="0.9" />
      </g>

      <g transform="translate(48, 96)" style={{ animation: animate ? "pulseGlow 3s ease-in-out infinite 0.8s" : undefined }}>
        <path d="M6 0 L7 5 L12 6 L7 7 L6 12 L5 7 L0 6 L5 5 Z" fill="#C8537A" opacity="0.7" />
      </g>

      {/* "RBC" badge */}
      <g transform="translate(115, 256)">
        <rect width="70" height="22" rx="11" fill="#C8862E" opacity="0.95" />
        <text x="35" y="15.5" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="serif" letterSpacing="2">RBC</text>
      </g>
    </svg>
  );
}
