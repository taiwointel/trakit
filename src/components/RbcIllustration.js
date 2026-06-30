"use client";

/**
 * SVG illustration of Coach RBC — a beautiful Black female finance coach
 * in blue corporate wear. Used in the chat empty state and header.
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
        {/* Blue radial background */}
        <radialGradient id="rbc-bg" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#1A4FBB" />
          <stop offset="60%" stopColor="#0D2A77" />
          <stop offset="100%" stopColor="#060E2A" />
        </radialGradient>

        {/* Skin tone — warm dark brown with highlight */}
        <radialGradient id="rbc-skin" cx="38%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#C49272" />
          <stop offset="45%" stopColor="#9B6040" />
          <stop offset="100%" stopColor="#5C3015" />
        </radialGradient>

        {/* Hair — deep brown-black with sheen */}
        <radialGradient id="rbc-hair" cx="50%" cy="25%" r="60%">
          <stop offset="0%" stopColor="#4A2200" />
          <stop offset="100%" stopColor="#0D0500" />
        </radialGradient>

        {/* Blue blazer */}
        <linearGradient id="rbc-blazer" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2B67E0" />
          <stop offset="100%" stopColor="#0E2E8A" />
        </linearGradient>

        {/* Blazer highlight */}
        <linearGradient id="rbc-blazer-hi" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4680F0" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#4680F0" stopOpacity="0" />
        </linearGradient>

        {/* Gold coin gradient */}
        <radialGradient id="rbc-coin" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#F0C060" />
          <stop offset="60%" stopColor="#C8862E" />
          <stop offset="100%" stopColor="#7A4B10" />
        </radialGradient>

        {/* White shirt collar */}
        <linearGradient id="rbc-shirt" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#F5F2EC" />
          <stop offset="100%" stopColor="#D8D0C0" />
        </linearGradient>

        {/* Clip circle */}
        <clipPath id="rbc-circle">
          <circle cx="150" cy="150" r="145" />
        </clipPath>
      </defs>

      {/* Background circle */}
      <circle cx="150" cy="150" r="148" fill="url(#rbc-bg)" />

      {/* Subtle background glow rings */}
      <circle cx="150" cy="150" r="100" stroke="#2B67E0" strokeWidth="1" opacity="0.2" />
      <circle cx="150" cy="150" r="130" stroke="#2B67E0" strokeWidth="0.5" opacity="0.1" />

      <g clipPath="url(#rbc-circle)">
        {/* ── BODY / BLAZER ─────────────────── */}
        {/* Main blazer body */}
        <path
          d="M30 320 Q50 240 95 220 L110 215 L150 240 L190 215 L205 220 Q250 240 270 320 Z"
          fill="url(#rbc-blazer)"
        />
        {/* Blazer highlight sheen */}
        <path
          d="M30 320 Q50 240 95 220 L110 215 L130 235 Q90 255 70 320 Z"
          fill="url(#rbc-blazer-hi)"
        />

        {/* Left lapel */}
        <path
          d="M110 215 L120 230 L112 255 Q80 265 55 310"
          stroke="#1D50B8" strokeWidth="1" fill="none" opacity="0.4"
        />

        {/* Right lapel */}
        <path
          d="M190 215 L180 230 L188 255 Q220 265 245 310"
          stroke="#1D50B8" strokeWidth="1" fill="none" opacity="0.4"
        />

        {/* White shirt / collar visible between lapels */}
        <path
          d="M130 215 L150 242 L170 215 L162 210 L150 228 L138 210 Z"
          fill="url(#rbc-shirt)"
        />

        {/* Collar left fold */}
        <path
          d="M125 218 L138 210 L150 228 L135 222 Z"
          fill="#2B67E0" opacity="0.85"
        />
        {/* Collar right fold */}
        <path
          d="M175 218 L162 210 L150 228 L165 222 Z"
          fill="#2B67E0" opacity="0.85"
        />

        {/* Pocket square detail */}
        <path
          d="M78 248 L90 244 L93 254 L81 258 Z"
          fill="#F0C060" opacity="0.85"
        />
        <path
          d="M82 244 L86 242 L87 246" stroke="#C8862E" strokeWidth="0.8" fill="none" />

        {/* ── NECK ─────────────────────────── */}
        <rect x="135" y="195" width="30" height="28" rx="14" fill="url(#rbc-skin)" />

        {/* ── HEAD / FACE ──────────────────── */}
        {/* Ear left */}
        <ellipse cx="92" cy="162" rx="9" ry="13" fill="url(#rbc-skin)" />
        <ellipse cx="94" cy="162" rx="5" ry="9" fill="#7A4020" opacity="0.4" />

        {/* Ear right */}
        <ellipse cx="208" cy="162" rx="9" ry="13" fill="url(#rbc-skin)" />
        <ellipse cx="206" cy="162" rx="5" ry="9" fill="#7A4020" opacity="0.4" />

        {/* Earrings */}
        <circle cx="92" cy="173" r="3" fill="url(#rbc-coin)" />
        <circle cx="208" cy="173" r="3" fill="url(#rbc-coin)" />

        {/* Face */}
        <ellipse cx="150" cy="155" rx="57" ry="65" fill="url(#rbc-skin)" />

        {/* Face shadow (jawline depth) */}
        <ellipse cx="150" cy="195" rx="45" ry="20" fill="#5C3015" opacity="0.25" />

        {/* ── HAIR ─────────────────────────── */}
        {/* Back of hair / volume base */}
        <ellipse cx="150" cy="120" rx="68" ry="60" fill="url(#rbc-hair)" />

        {/* Top natural hair puff */}
        <ellipse cx="150" cy="98" rx="58" ry="40" fill="url(#rbc-hair)" />

        {/* Side puffs for natural volume */}
        <ellipse cx="88" cy="130" rx="22" ry="35" fill="url(#rbc-hair)" />
        <ellipse cx="212" cy="130" rx="22" ry="35" fill="url(#rbc-hair)" />

        {/* Hair texture lines */}
        <path d="M115 90 Q130 82 150 85 Q170 82 185 90" stroke="#5C3015" strokeWidth="1" opacity="0.4" fill="none"/>
        <path d="M100 108 Q125 96 150 100 Q175 96 200 108" stroke="#5C3015" strokeWidth="0.8" opacity="0.3" fill="none"/>

        {/* Hair sheen highlight */}
        <ellipse cx="135" cy="95" rx="20" ry="12" fill="#8B4A20" opacity="0.2" />

        {/* Hairline at forehead */}
        <path d="M102 140 Q125 128 150 126 Q175 128 198 140" fill="url(#rbc-hair)" opacity="0.8" />

        {/* ── FACIAL FEATURES ──────────────── */}
        {/* Eyebrow left */}
        <path d="M112 136 Q124 128 140 131" stroke="#2D1200" strokeWidth="3" strokeLinecap="round" fill="none" />

        {/* Eyebrow right */}
        <path d="M160 131 Q176 128 188 136" stroke="#2D1200" strokeWidth="3" strokeLinecap="round" fill="none" />

        {/* Eye left — white */}
        <ellipse cx="127" cy="148" rx="12" ry="8.5" fill="white" />
        {/* Iris left */}
        <circle cx="127" cy="148" r="6" fill="#3D1800" />
        {/* Pupil left */}
        <circle cx="127" cy="148" r="3" fill="#0D0500" />
        {/* Eye shine left */}
        <circle cx="130" cy="145" r="1.8" fill="white" opacity="0.85" />

        {/* Eye right — white */}
        <ellipse cx="173" cy="148" rx="12" ry="8.5" fill="white" />
        {/* Iris right */}
        <circle cx="173" cy="148" r="6" fill="#3D1800" />
        {/* Pupil right */}
        <circle cx="173" cy="148" r="3" fill="#0D0500" />
        {/* Eye shine right */}
        <circle cx="176" cy="145" r="1.8" fill="white" opacity="0.85" />

        {/* Upper eyelids */}
        <path d="M115 145 Q127 140 139 145" stroke="#2D1200" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M161 145 Q173 140 185 145" stroke="#2D1200" strokeWidth="1.5" fill="none" strokeLinecap="round" />

        {/* Nose */}
        <path d="M144 158 Q147 168 150 166 Q153 168 156 158" stroke="#7A4020" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        {/* Nostrils */}
        <ellipse cx="144" cy="168" rx="4" ry="3" fill="#7A4020" opacity="0.5" />
        <ellipse cx="156" cy="168" rx="4" ry="3" fill="#7A4020" opacity="0.5" />

        {/* Lips */}
        {/* Upper lip */}
        <path d="M132 178 Q140 174 150 176 Q160 174 168 178 Q160 183 150 180 Q140 183 132 178 Z"
          fill="#9B3A28" />
        {/* Lower lip */}
        <path d="M132 178 Q141 188 150 186 Q159 188 168 178 Q160 183 150 180 Q140 183 132 178 Z"
          fill="#B84838" />
        {/* Lip shine */}
        <ellipse cx="145" cy="183" rx="6" ry="2.5" fill="white" opacity="0.18" />

        {/* Smile crease */}
        <path d="M130 178 Q127 183 130 190" stroke="#7A4020" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5" />
        <path d="M170 178 Q173 183 170 190" stroke="#7A4020" strokeWidth="1.2" fill="none" strokeLinecap="round" opacity="0.5" />

        {/* Cheek glow */}
        <ellipse cx="108" cy="165" rx="16" ry="10" fill="#C0504A" opacity="0.12" />
        <ellipse cx="192" cy="165" rx="16" ry="10" fill="#C0504A" opacity="0.12" />
      </g>

      {/* ── FLOATING ELEMENTS (outside clip so they can overflow) ── */}

      {/* Gold coin — top right */}
      <g style={floatStyle}>
        <circle cx="242" cy="68" r="20" fill="url(#rbc-coin)" />
        <circle cx="242" cy="68" r="16" stroke="#F0C060" strokeWidth="1" opacity="0.4" fill="none"/>
        <text x="242" y="74" textAnchor="middle" fill="#5A2D00" fontSize="14" fontWeight="bold" fontFamily="serif">₦</text>
      </g>

      {/* Mini chart — top left */}
      <g transform="translate(35, 55)" style={floatBStyle}>
        <rect width="48" height="38" rx="8" fill="#0D2A77" stroke="#2B67E0" strokeWidth="1"/>
        <polyline points="6,28 14,20 22,24 30,12 38,16" stroke="#00E896" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="38" cy="16" r="3" fill="#00E896"/>
        <path d="M4,32 H44" stroke="#2B67E0" strokeWidth="0.8" opacity="0.5"/>
      </g>

      {/* Small sparkle star — bottom right */}
      <g transform="translate(228, 200)" style={glowStyle}>
        <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" fill="#F0C060" opacity="0.9"/>
      </g>

      {/* Small sparkle — upper left area */}
      <g transform="translate(52, 100)" style={{ animation: animate ? "pulseGlow 3s ease-in-out infinite 0.8s" : undefined }}>
        <path d="M6 0 L7 5 L12 6 L7 7 L6 12 L5 7 L0 6 L5 5 Z" fill="#7AAACC" opacity="0.7"/>
      </g>

      {/* "RBC" badge on blazer */}
      <g transform="translate(115, 252)">
        <rect width="70" height="22" rx="11" fill="#C8862E" opacity="0.95"/>
        <text x="35" y="15.5" textAnchor="middle" fill="white" fontSize="10" fontWeight="bold" fontFamily="serif" letterSpacing="2">RBC</text>
      </g>
    </svg>
  );
}
