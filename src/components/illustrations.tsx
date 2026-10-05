/* Outlined flat-color illustrations — finance themes.
   Style: thick navy outline, flat fills, rounded joins (RGB-color-icon look).
   Palette: coral F2665C (near the app accent), butter F9D77E, mint 7ED9C4,
   sky A8C6F2, white, outline 23253A. */

const LINE = '#23253A'
const CORAL = '#F2665C'
const BUTTER = '#F9D77E'
const MINT = '#7ED9C4'
const SKY = '#A8C6F2'
const WHITE = '#FFFFFF'

/* Every illustration wraps its shapes in this so outlines stay uniform */
const OUTLINE = {
  stroke: LINE,
  strokeWidth: 3,
  strokeLinejoin: 'round' as const,
  strokeLinecap: 'round' as const,
}

const LABEL = {
  stroke: 'none',
  fill: LINE,
  fontWeight: 800,
  textAnchor: 'middle' as const,
  fontFamily: 'Inter, sans-serif',
}

function Sparkle({ x, y, r = 10, fill = BUTTER }: { x: number; y: number; r?: number; fill?: string }) {
  const k = r * 0.28
  return (
    <path
      d={`M${x} ${y - r} Q${x + k} ${y - k} ${x + r} ${y} Q${x + k} ${y + k} ${x} ${y + r} Q${x - k} ${y + k} ${x - r} ${y} Q${x - k} ${y - k} ${x} ${y - r} Z`}
      fill={fill}
    />
  )
}

function Coin({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={BUTTER} />
      <circle cx={cx} cy={cy} r={r * 0.68} fill="none" strokeWidth="2" />
      <text x={cx} y={cy + r * 0.3} fontSize={r * 0.8} {...LABEL}>रू</text>
    </g>
  )
}

/* Receipt with a torn zigzag bottom; width must be a multiple of 18 */
function Receipt({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const teeth = Array.from({ length: w / 18 }, () => 'l-9 8 l-9 -8').join(' ')
  return <path d={`M${x} ${y} H${x + w} V${y + h} ${teeth} Z`} fill={WHITE} />
}

/* Hero: piggy bank catching a rupee coin, coin stack and a banknote */
export function HeroIllustration() {
  return (
    <svg viewBox="0 0 320 300" role="img" aria-label="Piggy bank catching a rupee coin">
      <g {...OUTLINE}>
        {/* ground slab */}
        <rect x="34" y="254" width="252" height="20" rx="10" fill={MINT} />

        {/* banknote */}
        <g transform="rotate(-12 66 80)">
          <rect x="28" y="56" width="78" height="46" rx="6" fill={MINT} />
          <rect x="36" y="64" width="62" height="30" rx="4" fill="none" strokeWidth="2" />
          <circle cx="67" cy="79" r="9" fill={WHITE} />
          <text x="67" y="83" fontSize="10" {...LABEL}>रू</text>
        </g>

        {/* falling coin + motion lines */}
        <path d="M150 34 v10 M136 40 l4 8 M164 40 l-4 8" fill="none" />
        <Coin cx={150} cy={84} r={24} />

        {/* piggy: legs, tail, body, ear, snout */}
        {[88, 112, 160, 184].map((x) => (
          <rect key={x} x={x} y="226" width="20" height="30" rx="6" fill={CORAL} />
        ))}
        <path d="M64 186 q-18 -2 -14 -16 q6 -10 12 0" fill="none" />
        <ellipse cx="140" cy="190" rx="78" ry="58" fill={CORAL} />
        <path d="M96 176 q8 -24 32 -32" stroke={WHITE} strokeWidth="6" fill="none" />
        <path d="M176 140 L192 112 L204 146" fill={CORAL} />
        <ellipse cx="218" cy="198" rx="15" ry="19" fill={CORAL} />
        <ellipse cx="214" cy="193" rx="2.5" ry="4" fill={LINE} stroke="none" />
        <ellipse cx="222" cy="203" rx="2.5" ry="4" fill={LINE} stroke="none" />
        <circle cx="190" cy="172" r="4" fill={LINE} stroke="none" />
        <rect x="120" y="134" width="40" height="8" rx="4" fill={LINE} />

        {/* coin stack */}
        {[240, 226, 212].map((y) => (
          <rect key={y} x="244" y={y} width="48" height="14" rx="7" fill={BUTTER} />
        ))}
        <Coin cx={268} cy={186} r={18} />

        <Sparkle x={262} y={70} r={14} />
        <Sparkle x={34} y={150} r={8} fill={SKY} />
        <circle cx="290" cy="128" r="5" fill={WHITE} />
      </g>
    </svg>
  )
}

/* Expense Tracking: wallet stuffed with notes + itemised receipt + coin */
export function ExpenseIllustration() {
  return (
    <svg viewBox="0 0 360 160" role="img" aria-label="Wallet with cash next to a receipt">
      <g {...OUTLINE}>
        {/* notes peeking out */}
        <rect x="58" y="30" width="96" height="44" rx="5" fill={MINT} transform="rotate(-8 106 52)" />
        <rect x="64" y="38" width="96" height="44" rx="5" fill={SKY} transform="rotate(4 112 60)" />
        {/* wallet */}
        <rect x="40" y="54" width="132" height="86" rx="12" fill={CORAL} />
        <path d="M40 74 H172" fill="none" strokeWidth="2" />
        <rect x="132" y="82" width="50" height="32" rx="8" fill={BUTTER} />
        <circle cx="148" cy="98" r="5" fill={WHITE} />

        {/* receipt */}
        <Receipt x={212} y={22} w={90} h={108} />
        {[44, 62, 80].map((y, i) => (
          <g key={y}>
            <path d={`M224 ${y} H${258 - i * 6}`} fill="none" />
            <path d={`M276 ${y} H290`} fill="none" />
          </g>
        ))}
        <path d="M224 98 H290" fill="none" strokeDasharray="2 6" />
        <text x="238" y="120" fontSize="12" {...LABEL}>रू</text>
        <path d="M262 116 H290" fill="none" strokeWidth="4" />

        <Coin cx={318} cy={126} r={16} />
        <Sparkle x={330} y={36} r={10} />
        <circle cx="22" cy="40" r="5" fill={MINT} />
      </g>
    </svg>
  )
}

/* Snap a Bill: phone scanning a receipt, with a flash bolt */
export function SnapIllustration() {
  return (
    <svg viewBox="0 0 360 160" role="img" aria-label="Phone scanning a paper bill">
      <g {...OUTLINE}>
        {/* bill */}
        <g transform="rotate(-8 100 80)">
          <Receipt x={56} y={24} w={90} h={104} />
          <rect x="70" y="38" width="44" height="8" rx="4" fill={CORAL} />
          {[62, 78, 94].map((y) => (
            <g key={y}>
              <path d={`M70 ${y} H104`} fill="none" />
              <path d={`M118 ${y} H132`} fill="none" />
            </g>
          ))}
          <path d="M70 110 H132" fill="none" strokeWidth="4" />
        </g>

        {/* phone */}
        <g transform="rotate(6 222 82)">
          <rect x="182" y="16" width="80" height="132" rx="14" fill={WHITE} />
          <rect x="191" y="30" width="62" height="96" rx="6" fill={SKY} />
          <rect x="206" y="52" width="32" height="44" rx="3" fill={WHITE} />
          <path d="M212 64 H232 M212 74 H226 M212 84 H230" fill="none" strokeWidth="2" />
          <path d="M200 46 v-8 h8 M244 46 v-8 h-8 M200 104 v8 h8 M244 104 v8 h-8" fill="none" />
          <path d="M196 76 H248" stroke={CORAL} fill="none" />
          <circle cx="222" cy="137" r="6" fill={CORAL} />
        </g>

        {/* flash bolt */}
        <path d="M300 24 L284 62 H298 L288 96 L316 54 H302 L312 24 Z" fill={BUTTER} />
        <Sparkle x={30} y={130} r={9} fill={MINT} />
        <circle cx="330" cy="124" r="5" fill={CORAL} />
      </g>
    </svg>
  )
}

/* Spending Insights: bar chart with trend arrow + category pie */
export function InsightsIllustration() {
  return (
    <svg viewBox="0 0 360 160" role="img" aria-label="Spending bar chart and category pie chart">
      <g {...OUTLINE}>
        {/* chart card */}
        <rect x="30" y="18" width="190" height="126" rx="12" fill={WHITE} />
        {[
          { x: 52, h: 30, c: MINT },
          { x: 92, h: 50, c: BUTTER },
          { x: 132, h: 40, c: SKY },
          { x: 172, h: 72, c: CORAL },
        ].map((b) => (
          <rect key={b.x} x={b.x} y={126 - b.h} width="24" height={b.h} rx="4" fill={b.c} />
        ))}
        <path d="M44 126 H206" fill="none" />
        {/* trend */}
        <path d="M58 82 L100 62 L140 72 L182 36" fill="none" />
        <path d="M172 34 L184 34 L184 46" fill="none" />

        {/* pie */}
        <circle cx="286" cy="82" r="44" fill={BUTTER} />
        <path d="M286 82 L286 38 A44 44 0 0 1 327.3 97 Z" fill={CORAL} />
        <path d="M286 82 L327.3 97 A44 44 0 0 1 260.8 118 Z" fill={MINT} />
        <circle cx="286" cy="82" r="14" fill={WHITE} />

        <Sparkle x={334} y={26} r={10} fill={SKY} />
        <circle cx="244" cy="140" r="5" fill={CORAL} />
      </g>
    </svg>
  )
}

/* Ask Fin Buddy: assistant and user chat bubbles + a bill document */
export function ChatIllustration() {
  return (
    <svg viewBox="0 0 360 160" role="img" aria-label="Chat assistant answering questions about a bill">
      <g {...OUTLINE}>
        {/* assistant bubble */}
        <path
          d="M54 22 H186 a14 14 0 0 1 14 14 V68 a14 14 0 0 1 -14 14 H82 L62 98 L66 82 H54 a14 14 0 0 1 -14 -14 V36 a14 14 0 0 1 14 -14 Z"
          fill={CORAL}
        />
        <rect x="56" y="38" width="110" height="9" rx="4.5" fill={WHITE} />
        <rect x="56" y="56" width="72" height="9" rx="4.5" fill={WHITE} />

        {/* user bubble */}
        <path
          d="M184 92 H296 a14 14 0 0 1 14 14 V122 a14 14 0 0 1 -14 14 H294 L298 152 L276 136 H184 a14 14 0 0 1 -14 -14 V106 a14 14 0 0 1 14 -14 Z"
          fill={MINT}
        />
        {[214, 240, 266].map((cx) => (
          <circle key={cx} cx={cx} cy="114" r="5" fill={LINE} stroke="none" />
        ))}

        {/* bill document */}
        <path d="M100 98 H134 L148 112 V152 H100 Z" fill={SKY} />
        <path d="M134 98 V112 H148" fill="none" />
        <path d="M110 124 H136 M110 138 H128" fill="none" strokeWidth="2.5" />

        <Coin cx={316} cy={46} r={18} />
        <Sparkle x={240} y={40} r={10} />
        <circle cx="26" cy="126" r="5" fill={BUTTER} />
      </g>
    </svg>
  )
}
