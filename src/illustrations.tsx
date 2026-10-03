/* Custom flat-vector illustrations — Nepali finance themes.
   Palette matches the app tokens: red E0293C, ink 141414, soft periwinkle
   card wash E9EDFB, yellow F6C445, teal 3E8E7E. */

const RED = '#E0293C'
const INK = '#141414'
const WASH = '#E9EDFB'
const YELLOW = '#F6C445'
const TEAL = '#3E8E7E'
const SKIN = '#F2C29B'

function FloatingShapes() {
  return (
    <g>
      <circle cx="30" cy="24" r="5" fill={RED} />
      <circle cx="250" cy="18" r="7" fill={YELLOW} />
      <circle cx="270" cy="120" r="4" fill={TEAL} />
      <path d="M20 90 q8 -14 16 0 t16 0" stroke={TEAL} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M240 60 q8 -14 16 0 t16 0" stroke={RED} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M60 20 l10 -10 M66 22 l10 -10" stroke={INK} strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </g>
  )
}

/* Hero: person in a Dhaka topi holding a giant NPR note, standing on coins */
export function HeroIllustration() {
  return (
    <svg viewBox="0 0 320 300" role="img" aria-label="Person in a Dhaka topi holding a large Nepali banknote">
      <FloatingShapes />
      {/* soft ground blob */}
      <ellipse cx="160" cy="272" rx="130" ry="16" fill={WASH} />

      {/* NPR 100-style note */}
      <g transform="rotate(-6 210 120)">
        <rect x="150" y="60" width="150" height="76" rx="8" fill="#B03A48" />
        <rect x="150" y="60" width="150" height="76" rx="8" fill="none" stroke="#8E2C37" strokeWidth="2" />
        {/* mountain watermark */}
        <path d="M162 122 l22 -26 14 16 10 -12 22 22 z" fill="#C9525E" />
        <circle cx="284" cy="78" r="12" fill="#C9525E" />
        {/* denomination */}
        <text x="163" y="98" fontSize="26" fontWeight="800" fill="#FFF5F2" fontFamily="Inter, sans-serif">
          १००
        </text>
        <text x="163" y="118" fontSize="10" fontWeight="600" fill="#E9B9BE" fontFamily="Inter, sans-serif">
          नेपाल राष्ट्र बैंक
        </text>
      </g>

      {/* character */}
      {/* legs */}
      <path d="M128 232 l-8 34 h12 l8 -32 z" fill={INK} />
      <path d="M156 232 l6 32 h12 l-6 -34 z" fill={INK} />
      {/* shoes */}
      <ellipse cx="122" cy="268" rx="12" ry="5.5" fill={RED} />
      <ellipse cx="170" cy="266" rx="12" ry="5.5" fill={RED} />
      {/* torso — daura-style kurta */}
      <path d="M118 152 q26 -12 52 0 l6 64 q-32 10 -64 0 z" fill={TEAL} />
      {/* arm raised to note */}
      <path d="M164 160 q22 4 30 -18" stroke={TEAL} strokeWidth="11" fill="none" strokeLinecap="round" />
      <circle cx="196" cy="138" r="7.5" fill={SKIN} />
      {/* other arm on hip */}
      <path d="M120 162 q-14 10 -5 26" stroke={TEAL} strokeWidth="11" fill="none" strokeLinecap="round" />
      <circle cx="114" cy="192" r="6.5" fill={SKIN} />
      {/* head */}
      <circle cx="142" cy="122" r="20" fill={SKIN} />
      {/* ear */}
      <circle cx="124" cy="124" r="3.5" fill={SKIN} />
      {/* face */}
      <circle cx="150" cy="120" r="2.2" fill={INK} />
      <path d="M147 130 q5 3.5 10 0" stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* Dhaka topi — tapered cap with patterned bands */}
      <path d="M122 110 q20 -18 44 -4 l-3 12 q-19 -12 -38 4 z" fill={INK} />
      <path d="M124 106 l40 -2" stroke={YELLOW} strokeWidth="3.5" strokeLinecap="round" />
      <path d="M129 99 l28 -3 M133 94 l20 -2" stroke={RED} strokeWidth="2" strokeLinecap="round" />

      {/* coins at feet */}
      <g>
        <circle cx="72" cy="262" r="12" fill={YELLOW} />
        <text x="72" y="267" fontSize="11" fontWeight="800" textAnchor="middle" fill={INK} fontFamily="Inter, sans-serif">रू</text>
        <circle cx="94" cy="268" r="9" fill={RED} />
        <text x="94" y="272" fontSize="9" fontWeight="800" textAnchor="middle" fill="#fff" fontFamily="Inter, sans-serif">रू</text>
        <circle cx="212" cy="268" r="9" fill={YELLOW} />
        <text x="212" y="272" fontSize="9" fontWeight="800" textAnchor="middle" fill={INK} fontFamily="Inter, sans-serif">रू</text>
      </g>
    </svg>
  )
}

/* Expense Tracking: NPR 500 note + rupee coins + ledger */
export function ExpenseIllustration() {
  return (
    <svg viewBox="0 0 360 160" role="img" aria-label="Nepali banknote, coins and a ledger">
      {/* ledger */}
      <rect x="34" y="30" width="120" height="104" rx="8" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <path d="M34 30 h120 v14 h-120 z" fill={RED} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="46" y={60 + i * 24} width="10" height="10" rx="2" fill={WASH} />
          <rect x="64" y={62 + i * 24} width={70 - i * 14} height="6" rx="3" fill="#D8DCE8" />
          <text x={130 - i * 8} y={70 + i * 24} fontSize="9" fontWeight="700" fill={INK} fontFamily="Inter, sans-serif">
            रू
          </text>
        </g>
      ))}
      {/* NPR 500 note */}
      <g transform="rotate(8 250 80)">
        <rect x="196" y="44" width="130" height="66" rx="7" fill="#8E3B5C" />
        <path d="M208 96 l20 -22 12 14 8 -10 20 18 z" fill="#A55674" />
        <circle cx="308" cy="60" r="10" fill="#A55674" />
        <text x="208" y="76" fontSize="22" fontWeight="800" fill="#FBEEF3" fontFamily="Inter, sans-serif">५००</text>
      </g>
      {/* coins */}
      <circle cx="292" cy="126" r="14" fill={YELLOW} />
      <text x="292" y="131" fontSize="12" fontWeight="800" textAnchor="middle" fill={INK} fontFamily="Inter, sans-serif">रू</text>
      <circle cx="318" cy="132" r="10" fill={RED} />
      <text x="318" y="136" fontSize="9" fontWeight="800" textAnchor="middle" fill="#fff" fontFamily="Inter, sans-serif">रू</text>
      {/* sparkles */}
      <path d="M24 24 l8 8 M32 24 l-8 8" stroke={TEAL} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="344" cy="30" r="5" fill={RED} />
    </svg>
  )
}

/* Snap a Bill: phone photographing a restaurant bill (Thakali kitchen) */
export function SnapIllustration() {
  return (
    <svg viewBox="0 0 360 160" role="img" aria-label="Phone photographing a paper bill">
      {/* bill paper */}
      <g transform="rotate(-4 150 80)">
        <rect x="96" y="34" width="110" height="100" rx="6" fill="#fff" stroke={INK} strokeWidth="2.5" />
        <text x="110" y="56" fontSize="10" fontWeight="800" fill={INK} fontFamily="Inter, sans-serif">THAKALI KITCHEN</text>
        {[0, 1, 2, 3].map((i) => (
          <g key={i}>
            <rect x="110" y={68 + i * 15} width="52" height="5" rx="2.5" fill="#D8DCE8" />
            <text x="176" y={74 + i * 15} fontSize="8" fontWeight="700" fill={INK} fontFamily="Inter, sans-serif">
              {['रू180', 'रू95', 'रू60', 'रू335'][i]}
            </text>
          </g>
        ))}
        <rect x="110" y="122" width="80" height="2" fill={INK} opacity="0.6" />
      </g>
      {/* phone taking the snap */}
      <g transform="rotate(10 268 78)">
        <rect x="238" y="30" width="62" height="110" rx="12" fill={INK} />
        <rect x="244" y="40" width="50" height="86" rx="6" fill={WASH} />
        {/* viewfinder: mini bill + brackets */}
        <rect x="252" y="56" width="34" height="24" rx="3" fill="#fff" stroke={RED} strokeWidth="2" />
        <path d="M252 50 v-6 h6 M286 50 v-6 h-6 M252 86 v6 h6 M286 86 v6 h-6" stroke={RED} strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="269" cy="112" r="8" fill={RED} />
        <circle cx="269" cy="112" r="3" fill="#fff" />
      </g>
      {/* flash */}
      <path d="M232 22 l10 -8 M236 34 l12 -2 M228 12 l4 -12" stroke={YELLOW} strokeWidth="3" strokeLinecap="round" />
      <circle cx="66" cy="28" r="5" fill={TEAL} />
    </svg>
  )
}

/* Spending Insights: bar chart with Nepal-flag accent + momo/budget doodles */
export function InsightsIllustration() {
  return (
    <svg viewBox="0 0 360 160" role="img" aria-label="Spending bar chart with a rising trend">
      {/* chart card */}
      <rect x="40" y="26" width="180" height="112" rx="10" fill="#fff" stroke={INK} strokeWidth="2.5" />
      {/* bars — expenses by week */}
      {[
        { x: 62, h: 34, c: WASH },
        { x: 90, h: 52, c: TEAL },
        { x: 118, h: 40, c: WASH },
        { x: 146, h: 68, c: RED },
      ].map((b) => (
        <rect key={b.x} x={b.x} y={122 - b.h} width="18" height={b.h} rx="4" fill={b.c} />
      ))}
      {/* trend arrow */}
      <path d="M62 84 q52 -26 108 -52" stroke={INK} strokeWidth="3" fill="none" strokeLinecap="round" strokeDasharray="1 8" />
      <path d="M170 30 l10 -2 -4 10 z" fill={INK} />
      {/* axis label */}
      <text x="52" y="46" fontSize="10" fontWeight="700" fill={INK} fontFamily="Inter, sans-serif">
        साप्ताहिक खर्च
      </text>
      {/* Nepal flag badge */}
      <g transform="translate(258 52)">
        <rect x="0" y="0" width="66" height="66" rx="12" fill={WASH} />
        {/* double-pennon flag, correct geometry */}
        <g transform="translate(14 6) scale(1.15)">
          <line x1="6" y1="0" x2="6" y2="46" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <path
            d="M6 3 L40 19 L18 19 L46 40 L6 40 Z"
            fill={RED}
            stroke="#1E4EA0"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {/* moon (upper pennon) */}
          <circle cx="17" cy="13" r="4" fill="#fff" />
          <circle cx="19" cy="12" r="3.2" fill={RED} />
          {/* sun (lower pennon) */}
          <circle cx="20" cy="32" r="3.4" fill="#fff" />
        </g>
        <text x="12" y="62" fontSize="8" fontWeight="700" fill={INK} fontFamily="Inter, sans-serif">FY 2082</text>
      </g>
      <circle cx="330" cy="126" r="5" fill={YELLOW} />
    </svg>
  )
}

/* Ask Fin Buddy: chat bubbles grounded in a document, Nepali greeting */
export function ChatIllustration() {
  return (
    <svg viewBox="0 0 360 160" role="img" aria-label="Chat assistant answering from a bill document">
      {/* document */}
      <rect x="34" y="36" width="96" height="104" rx="8" fill="#fff" stroke={INK} strokeWidth="2.5" />
      <rect x="34" y="36" width="96" height="16" rx="8" fill={TEAL} />
      <rect x="34" y="44" width="96" height="8" fill={TEAL} />
      {[0, 1, 2].map((i) => (
        <g key={i}>
          <rect x="46" y={64 + i * 16} width={64 - i * 12} height="5" rx="2.5" fill="#D8DCE8" />
          <circle cx="46" cy={80 + i * 16} r="0" />
        </g>
      ))}
      <rect x="46" y="118" width="40" height="12" rx="6" fill={WASH} />
      <text x="52" y="127" fontSize="7.5" fontWeight="700" fill={INK} fontFamily="Inter, sans-serif">bill.pdf</text>
      {/* assistant bubble */}
      <rect x="150" y="40" width="150" height="44" rx="12" fill={RED} />
      <path d="M150 58 l-10 8 10 6 z" fill={RED} />
      <text x="164" y="60" fontSize="10" fontWeight="700" fill="#fff" fontFamily="Inter, sans-serif">
        नमस्ते! तपाईंको खर्च
      </text>
      <rect x="164" y="66" width="104" height="6" rx="3" fill="#F0909B" />
      {/* user bubble */}
      <rect x="196" y="100" width="128" height="40" rx="12" fill={INK} />
      <path d="M324 116 l10 -6 -10 -6 z" fill={INK} />
      <rect x="210" y="112" width="86" height="6" rx="3" fill="#4A4A52" />
      <rect x="210" y="124" width="56" height="6" rx="3" fill="#4A4A52" />
      {/* citation chip */}
      <rect x="150" y="116" width="40" height="16" rx="8" fill={WASH} stroke={RED} strokeWidth="1.5" />
      <text x="156" y="127" fontSize="7.5" fontWeight="700" fill={RED} fontFamily="Inter, sans-serif">src · 1</text>
      <circle cx="342" cy="30" r="5" fill={YELLOW} />
      <path d="M140 132 q6 -10 12 0" stroke={TEAL} strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  )
}