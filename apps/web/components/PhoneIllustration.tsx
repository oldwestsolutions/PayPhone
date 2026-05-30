/** Luxury handset illustration for professional comms section */
export function PhoneIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 520"
      className={className}
      role="img"
      aria-label="Illustration of a professional payphone handset"
    >
      <defs>
        <linearGradient id="phoneBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#142a47" />
          <stop offset="100%" stopColor="#060e1a" />
        </linearGradient>
        <linearGradient id="phoneCopper" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#d4a574" />
          <stop offset="100%" stopColor="#8f5a28" />
        </linearGradient>
        <linearGradient id="screenGlow" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="rgba(185,28,60,0.35)" />
          <stop offset="100%" stopColor="rgba(12,26,46,0.9)" />
        </linearGradient>
        <filter id="phoneShadow" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="24" stdDeviation="28" floodColor="#060e1a" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* Ambient glow */}
      <ellipse cx="200" cy="420" rx="140" ry="40" fill="rgba(184,115,51,0.12)" />

      <g filter="url(#phoneShadow)">
        {/* Handset body */}
        <rect
          x="95"
          y="40"
          width="210"
          height="400"
          rx="36"
          fill="url(#phoneBody)"
          stroke="rgba(212,165,116,0.35)"
          strokeWidth="2"
        />

        {/* Copper accent band */}
        <rect x="95" y="88" width="210" height="8" fill="url(#phoneCopper)" opacity="0.9" />

        {/* Screen */}
        <rect x="118" y="110" width="164" height="220" rx="16" fill="#0a1628" stroke="rgba(184,115,51,0.25)" strokeWidth="1.5" />
        <rect x="118" y="110" width="164" height="220" rx="16" fill="url(#screenGlow)" />

        {/* Active call UI */}
        <circle cx="200" cy="175" r="36" fill="none" stroke="rgba(185,28,60,0.6)" strokeWidth="2" />
        <circle cx="200" cy="175" r="28" fill="rgba(185,28,60,0.15)" />
        {/* Handset icon */}
        <path
          d="M188 168c0-8 6-14 12-14s12 6 12 14v4c0 6-4 10-10 12l-2 14h-4l-2-14c-6-2-10-6-10-12v-4z"
          fill="rgba(212,165,116,0.9)"
        />

        <text x="200" y="230" textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize="11" fontFamily="system-ui,sans-serif" fontWeight="600">
          LIVE SESSION
        </text>
        <text x="200" y="252" textAnchor="middle" fill="rgba(184,115,51,0.95)" fontSize="22" fontFamily="Georgia,serif">
          04:32
        </text>
        <text x="200" y="272" textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize="9" fontFamily="monospace">
          $2.40 / min · escrow active
        </text>

        {/* Waveform */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <rect
            key={i}
            x={148 + i * 14}
            y={295 - (i % 3) * 6}
            width="6"
            height={20 + (i % 4) * 8}
            rx="3"
            fill="rgba(184,115,51,0.5)"
          />
        ))}

        {/* Keypad hints */}
        <g fill="rgba(255,255,255,0.12)">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <circle key={i} cx={148 + (i % 3) * 52} cy={360 + Math.floor(i / 3) * 44} r="16" />
          ))}
        </g>

        {/* Classic receiver curves */}
        <path
          d="M55 180 Q30 200 30 260 Q30 320 55 340"
          fill="none"
          stroke="url(#phoneCopper)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <path
          d="M345 180 Q370 200 370 260 Q370 320 345 340"
          fill="none"
          stroke="url(#phoneCopper)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <ellipse cx="55" cy="180" rx="18" ry="22" fill="url(#phoneCopper)" />
        <ellipse cx="345" cy="180" rx="18" ry="22" fill="url(#phoneCopper)" />

        {/* Cord */}
        <path
          d="M200 440 C200 480 160 500 120 510"
          fill="none"
          stroke="rgba(184,115,51,0.4)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>

      {/* Floating badges */}
      <g>
        <rect x="20" y="120" width="100" height="36" rx="18" fill="white" fillOpacity="0.08" stroke="rgba(212,165,116,0.3)" />
        <text x="70" y="143" textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="9" fontFamily="system-ui,sans-serif" fontWeight="600">
          P2P · E2EE
        </text>
      </g>
      <g>
        <rect x="280" y="80" width="110" height="36" rx="18" fill="white" fillOpacity="0.08" stroke="rgba(185,28,60,0.35)" />
        <text x="335" y="103" textAnchor="middle" fill="rgba(255,255,255,0.75)" fontSize="9" fontFamily="system-ui,sans-serif" fontWeight="600">
          Pay per second
        </text>
      </g>
    </svg>
  );
}
