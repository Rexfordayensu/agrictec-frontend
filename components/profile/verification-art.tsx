export function VerificationArt() {
  return (
    <svg className="verification-card-art" viewBox="0 0 250 245" fill="none" aria-hidden="true">
      <defs>
        <linearGradient
          id="verification-leaf"
          x1="30"
          y1="180"
          x2="160"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#50b982" />
          <stop offset="1" stopColor="#c4efbe" />
        </linearGradient>
        <linearGradient
          id="verification-paper"
          x1="90"
          y1="70"
          x2="200"
          y2="230"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" />
          <stop offset="1" stopColor="#e2f5e7" />
        </linearGradient>
        <filter id="verification-card-shadow" x="-30%" y="-30%" width="170%" height="180%">
          <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor="#256847" floodOpacity=".2" />
        </filter>
      </defs>
      <ellipse cx="117" cy="128" rx="106" ry="101" fill="#dff3e6" />
      <path d="M91 100C87 53 121 27 162 23C165 62 135 95 91 100Z" fill="url(#verification-leaf)" />
      <path
        d="M122 105C131 62 161 42 192 44C187 79 157 106 122 105Z"
        fill="url(#verification-leaf)"
      />
      <path d="M62 191C31 177 11 153 6 127C42 130 70 155 62 191Z" fill="url(#verification-leaf)" />
      <path
        d="M140 213C170 185 196 180 217 184C198 209 172 221 140 213Z"
        fill="url(#verification-leaf)"
      />
      <g transform="rotate(-10 128 139)" filter="url(#verification-card-shadow)">
        <rect
          x="42"
          y="66"
          width="175"
          height="125"
          rx="19"
          fill="url(#verification-paper)"
          stroke="#bde2cc"
        />
        <rect x="62" y="81" width="26" height="6" rx="1" fill="#e43333" />
        <path d="M62 87H88V93H62Z" fill="#f8cf31" />
        <path d="M62 93H88V99H62Z" fill="#169650" />
        <path
          d="M75 87.7l1.3 2.3 2.6.4-1.9 1.9.4 2.6-2.4-1.2-2.3 1.2.4-2.6-1.9-1.9 2.6-.4Z"
          fill="#152b22"
        />
        <text
          x="99"
          y="95"
          fill="#064f39"
          fontSize="12"
          fontFamily="Arial,sans-serif"
          fontWeight="700"
        >
          GHANA CARD
        </text>
        <path d="M100 106H196" stroke="#d3eade" strokeWidth="1.5" />
        <rect x="62" y="113" width="49" height="57" rx="9" fill="#c6e9d3" />
        <circle cx="86" cy="133" r="11" fill="#5caa80" />
        <path d="M67 166V159C67 145 104 145 104 159V166Z" fill="#5caa80" />
        <path
          d="M126 123H194M126 137H181M126 151H187"
          stroke="#b5dec7"
          strokeWidth="6"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

export function VerificationLandscape() {
  return (
    <svg className="verification-landscape" viewBox="0 0 470 250" fill="none" aria-hidden="true">
      <path d="M0 175C91 104 156 48 236 54C316 59 347 -18 470 26V250H0Z" fill="#d4edd9" />
      <path d="M0 193C115 132 189 164 268 111C332 69 384 66 470 115V250H0Z" fill="#c4e5ca" />
      <path d="M0 225C155 179 289 127 470 148V250H0Z" fill="#d7e8a7" />
      <path
        d="M40 250C153 210 266 170 470 161M124 250C221 199 343 175 470 177M213 250C292 212 383 191 470 194M312 250C358 224 409 215 470 212"
        stroke="#b4d68c"
        strokeWidth="10"
      />
      <path d="M353 146V116M414 145V119M450 153V127" stroke="#93bd8d" strokeWidth="4" />
      <path
        d="M336 111C333 100 345 91 354 98C359 88 375 98 370 109C383 122 362 128 354 122C344 129 329 123 336 111ZM400 117C396 103 412 99 418 108C428 101 439 115 431 121C434 132 414 134 412 128C402 134 394 125 400 117Z"
        fill="#8fc28f"
      />
    </svg>
  );
}
