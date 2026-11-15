import { readFileSync, writeFileSync } from 'fs';

const cal = JSON.parse(readFileSync('contributions.json', 'utf8'));

/* ---------- layout ---------- */
const CELL = 11,
    GAP = 3,
    PITCH = CELL + GAP;
const CAVE_W = 64,
    CAVE_H = 68;
const PAD_LEFT = CAVE_W + 8,
    PAD_TOP = 30,
    PAD_BOTTOM = 34,
    PAD_RIGHT = 12;

const weeks = cal.weeks;
const gridW = weeks.length * PITCH - GAP;
const gridH = 7 * PITCH - GAP;
const width = PAD_LEFT + gridW + PAD_RIGHT;
const height = PAD_TOP + gridH + PAD_BOTTOM;

/* ---------- sprite ---------- */
const PX = 3;
const PALETTE = {
    O: '#6b705c',
    H: '#3b2a1d',
    F: '#f3cfa9',
    E: '#2a1a10',
    C: '#8a5a3b',
    B: '#4a3728',
    L: '#5a4632',
    S: '#2f2418',
    T: '#6b4a2a',
};
const BODY = [
    '..OOOO..',
    '.OOOOOO.',
    '.HFFFFHT',
    '.HFEEFHT',
    '.HFFFFHT',
    '.CCCCCCT',
    '.CCCCCC.',
    '.CBBBBC.',
    '..LLLL..',
];
const LEGS_A = ['..L..L..', '.S....S.'];
const LEGS_B = ['...LL...', '..S..S..'];

const SPRITE_W = 8 * PX;
const SPRITE_H = (BODY.length + 2) * PX;
const TORCH_DX = 7 * PX;

/* ---------- journey ---------- */
const DURATION = 22; // whole round trip, seconds
const HOLD_OUT = 3; // % she waits inside before stepping out
const OUT_END = 55; // % she reaches the far end
const TURN_END = 58; // % she's done turning
const BACK_END = 96; // % she's home
const girlY = PAD_TOP + gridH - SPRITE_H + 14;
const BASE = girlY + SPRITE_H; // ground line / cave floor
const caveX = 20; // her parking spot, centred in the mouth
const turnX = PAD_LEFT + gridW - SPRITE_W + 6;

// when does the torch reach a cell whose left edge is at cx? (outbound leg only)
function arrival(cx) {
    const gx = cx + CELL / 2 - TORCH_DX;
    const f = Math.min(1, Math.max(0, (gx - caveX) / (turnX - caveX)));
    return DURATION * (HOLD_OUT + (OUT_END - HOLD_OUT) * f) / 100;
}

/* ---------- cells ---------- */
const COLORS = {
    NONE: '#161b22',
    FIRST_QUARTILE: '#0e4429',
    SECOND_QUARTILE: '#006d32',
    THIRD_QUARTILE: '#26a641',
    FOURTH_QUARTILE: '#39d353',
};
const LEVEL_CLASS = {
    FIRST_QUARTILE: 'l1',
    SECOND_QUARTILE: 'l2',
    THIRD_QUARTILE: 'l3',
    FOURTH_QUARTILE: 'l4',
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

let cells = '',
    labels = '',
    lastMonth = -1;

weeks.forEach((week, x) => {
    const first = week.contributionDays[0];
    if (first) {
        const m = new Date(first.date).getUTCMonth();
        if (m !== lastMonth) {
            labels += `  <text x="${PAD_LEFT + x * PITCH}" y="${PAD_TOP - 10}" class="m">${MONTHS[m]}</text>\n`;
            lastMonth = m;
        }
    }
    for (const day of week.contributionDays) {
        const cx = PAD_LEFT + x * PITCH;
        const cy = PAD_TOP + day.weekday * PITCH;
        const cls = LEVEL_CLASS[day.contributionLevel];
        const anim = cls ? ` class="${cls}" style="animation-delay:${arrival(cx).toFixed(2)}s"` : '';
        cells += `  <rect x="${cx}" y="${cy}" width="${CELL}" height="${CELL}" rx="2" fill="${COLORS[day.contributionLevel]}"${anim}/>\n`;
    }
});

/* ---------- girl ---------- */
function pixels(rows, yOffset = 0) {
    let out = '';
    rows.forEach((row, y) => {
        [...row].forEach((ch, x) => {
            const fill = PALETTE[ch];
            if (!fill) return;
            out += `<rect x="${x * PX}" y="${(y + yOffset) * PX}" width="${PX}" height="${PX}" fill="${fill}"/>`;
        });
    });
    return out;
}

const girl = `
  <g id="girl" transform="translate(${caveX}, ${girlY})">
    <g class="facing">
      <g class="torchlight">
        <circle cx="${TORCH_DX + PX / 2}" cy="-24" r="40" fill="url(#glow)"/>
        <g class="flame">
          <rect x="${TORCH_DX}" y="0" width="${PX}" height="${PX}" fill="#ffd166"/>
          <rect x="${TORCH_DX}" y="${PX}" width="${PX}" height="${PX}" fill="#ff8c42"/>
        </g>
      </g>
      <g class="bob">
        ${pixels(BODY)}
        <g class="legsA">${pixels(LEGS_A, BODY.length)}</g>
        <g class="legsB">${pixels(LEGS_B, BODY.length)}</g>
      </g>
    </g>
  </g>`;

/* ---------- cave (drawn AFTER the girl so she vanishes inside) ---------- */
const cave = `
  <g id="cave">
    <path d="M0 ${BASE} L0 ${BASE - 38} Q4 ${BASE - 64} 32 ${BASE - CAVE_H} Q60 ${BASE - 64} ${CAVE_W} ${BASE - 38} L${CAVE_W} ${BASE} Z" fill="#4a3a2a"/>
    <path d="M0 ${BASE - 38} Q4 ${BASE - 64} 32 ${BASE - CAVE_H}" fill="none" stroke="#6e5742" stroke-width="2"/>
    <path d="M12 ${BASE} L12 ${BASE - 28} Q32 ${BASE - 56} 52 ${BASE - 28} L52 ${BASE} Z" fill="#000000"/>
  </g>`;

const ground = `<rect x="0" y="${BASE}" width="${width}" height="1.5" fill="#1f262e"/>`;

/* ---------- assemble ---------- */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <radialGradient id="glow">
      <stop offset="0%" stop-color="#ffb703" stop-opacity="0.22"/>
      <stop offset="60%" stop-color="#ffb703" stop-opacity="0.07"/>
      <stop offset="100%" stop-color="#ffb703" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <style>
    .m { fill: #7d8590; font: 9px -apple-system, "Segoe UI", sans-serif; }

    .l1, .l2, .l3, .l4 {
      animation-duration: 1.4s;
      animation-timing-function: ease-out;
      animation-fill-mode: both;
    }
    .l1 { animation-name: lit1 } .l2 { animation-name: lit2 }
    .l3 { animation-name: lit3 } .l4 { animation-name: lit4 }
    @keyframes lit1 { 0% { fill:#161b22 } 20% { fill:#ffd166 } 100% { fill:#0e4429 } }
    @keyframes lit2 { 0% { fill:#161b22 } 20% { fill:#ffd166 } 100% { fill:#006d32 } }
    @keyframes lit3 { 0% { fill:#161b22 } 20% { fill:#ffd166 } 100% { fill:#26a641 } }
    @keyframes lit4 { 0% { fill:#161b22 } 20% { fill:#ffd166 } 100% { fill:#39d353 } }

    #girl { animation: walk ${DURATION}s linear forwards }
    @keyframes walk {
      0%, ${HOLD_OUT}%    { transform: translate(${caveX}px, ${girlY}px) }
      ${OUT_END}%         { transform: translate(${turnX}px, ${girlY}px) }
      ${TURN_END}%        { transform: translate(${turnX}px, ${girlY}px) }
      ${BACK_END}%, 100%  { transform: translate(${caveX}px, ${girlY}px) }
    }

    /* mirror her in place for the walk home */
    .facing { animation: face ${DURATION}s linear forwards }
    @keyframes face {
      0%, 56.4%   { transform: translateX(0) scaleX(1) }
      56.5%, 100% { transform: translateX(${SPRITE_W}px) scaleX(-1) }
    }

    /* torch burns out at the turnaround */
    .torchlight { animation: torch ${DURATION}s linear forwards }
    @keyframes torch {
      0%, 56.4%   { opacity: 1 }
      56.5%, 100% { opacity: 0 }
    }

    .legsA { animation: strideA 0.34s steps(1) infinite }
    .legsB { animation: strideB 0.34s steps(1) infinite }
    @keyframes strideA { 0%, 49% { opacity:1 } 50%, 100% { opacity:0 } }
    @keyframes strideB { 0%, 49% { opacity:0 } 50%, 100% { opacity:1 } }

    .bob { animation: bob 0.34s steps(1) infinite }
    @keyframes bob { 0%, 49% { transform: translateY(0) } 50%, 100% { transform: translateY(1px) } }

    .flame { animation: flick 0.22s steps(1) infinite }
    @keyframes flick { 0% { opacity:1 } 50% { opacity:0.55 } 100% { opacity:1 } }
  </style>
  <rect width="100%" height="100%" fill="#0d1117"/>
${labels}${cells}  ${ground}
${girl}
${cave}
</svg>`;

writeFileSync('graph.svg', svg);
console.log(`wrote graph.svg  ${width}x${height}  (round trip ${DURATION}s)`);