import { readFileSync, writeFileSync } from 'fs';

const cal = JSON.parse(readFileSync('contributions.json', 'utf8'));

/* ---------- layout ---------- */
const CELL = 11,
    GAP = 3,
    PITCH = CELL + GAP;
const PAD_LEFT = 12,
    PAD_TOP = 46,
    PAD_BOTTOM = 28,
    PAD_RIGHT = 12;

const weeks = cal.weeks;
const COLS = weeks.length;
const gridW = COLS * PITCH - GAP;
const gridH = 7 * PITCH - GAP;
const width = PAD_LEFT + gridW + PAD_RIGHT;
const height = PAD_TOP + gridH + PAD_BOTTOM;

const RIDE = 24; // one lap of the grid
const CYCLE = RIDE * 2; // lap 1 delivers, lap 2 collects
const TRAIL_CELLS = 4;
const FADE_CELLS = 1.5;
const RIBBON = '#ffd166';
const DARK = '#161b22';

function rand(i) {
    const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    return s - Math.floor(s);
}

/* ---------- trees ---------- */
const NEEDLE_DARK = '#1f6b3a',
    NEEDLE_LIGHT = '#2d8a4e',
    TRUNK = '#5a3b25';

function treeUp(x, baseY, h) {
    const w = h * 0.62;
    return `  <g>
    <rect x="${(x - 1).toFixed(1)}" y="${(baseY - 3).toFixed(1)}" width="2" height="4" fill="${TRUNK}"/>
    <polygon points="${x.toFixed(1)},${(baseY - h).toFixed(1)} ${(x - w / 2).toFixed(1)},${(baseY - 2).toFixed(1)} ${(x + w / 2).toFixed(1)},${(baseY - 2).toFixed(1)}" fill="${NEEDLE_DARK}"/>
    <polygon points="${x.toFixed(1)},${(baseY - h).toFixed(1)} ${(x - w / 3.2).toFixed(1)},${(baseY - h * 0.45).toFixed(1)} ${(x + w / 3.2).toFixed(1)},${(baseY - h * 0.45).toFixed(1)}" fill="${NEEDLE_LIGHT}"/>
    <circle cx="${x.toFixed(1)}" cy="${(baseY - h - 1).toFixed(1)}" r="1.3" fill="${RIBBON}"/>
  </g>\n`;
}

function treeDown(x, topY, h) {
    const w = h * 0.62;
    return `  <g>
    <rect x="${(x - 1).toFixed(1)}" y="${topY.toFixed(1)}" width="2" height="4" fill="${TRUNK}"/>
    <polygon points="${x.toFixed(1)},${(topY + h).toFixed(1)} ${(x - w / 2).toFixed(1)},${(topY + 2).toFixed(1)} ${(x + w / 2).toFixed(1)},${(topY + 2).toFixed(1)}" fill="${NEEDLE_DARK}"/>
    <polygon points="${x.toFixed(1)},${(topY + h).toFixed(1)} ${(x - w / 3.2).toFixed(1)},${(topY + h * 0.55).toFixed(1)} ${(x + w / 3.2).toFixed(1)},${(topY + h * 0.55).toFixed(1)}" fill="${NEEDLE_LIGHT}"/>
    <circle cx="${x.toFixed(1)}" cy="${(topY + h + 1).toFixed(1)}" r="1.3" fill="${RIBBON}"/>
  </g>\n`;
}

let hanging = '';
for (let i = 0; i < 13; i++) {
    hanging += treeDown(30 + i * ((width - 60) / 12) + (rand(i + 60) - 0.5) * 18, 0, 14 + rand(i + 120) * 12);
}
let forest = '';
for (let i = 0; i < 18; i++) {
    forest += treeUp(20 + i * ((width - 40) / 17) + (rand(i + 200) - 0.5) * 14, height - 4, 10 + rand(i + 260) * 11);
}

/* ---------- santa sprite ---------- */
const PX = 2;
const PALETTE = {
    R: '#d62828',
    F: '#f3cfa9',
    W: '#ffffff',
    S: '#a0522d',
    U: '#ffd166',
    D: '#a9682f',
    K: '#6b4423',
    A: '#8a6a4a',
    N: '#2b1b12',
    E: '#1a1008',
    T: '#5a4632',
};
const BODY = [
    '.................A.A',
    '..................AA',
    '...RRR...........DDD',
    '..RRRRR..........DED',
    '...FFF...........DDN',
    '..WWWWW......DDDDDD.',
    '..RRRRRTTTTTDDDDDDD.',
    'SSSSSSSS....DD...DD.',
    'S......S............',
    'SUUUUUUS............',
    '.UUUUUU.............',
];
const LEGS_A = ['............K.K..K.K', '............K.K..K.K', '............K.K..K.K'];
const LEGS_B = ['...........K.K..K.K.', '...........K.K..K.K.', '...........K.K..K.K.'];
const SW = 20 * PX,
    SH = BODY.length * PX;

/* ---------- serpentine path ---------- */
const path = [];
for (let r = 0; r < 7; r++) {
    for (let k = 0; k < COLS; k++) {
        path.push({ col: r % 2 === 0 ? k : COLS - 1 - k, row: r });
    }
}
const STEPS = path.length;
const visitAt = new Map();
path.forEach((p, i) => visitAt.set(`${p.col},${p.row}`, (i / (STEPS - 1)) * RIDE));

const stepT = RIDE / (STEPS - 1);
const P_WHITE = (((TRAIL_CELLS * stepT) / CYCLE) * 100).toFixed(3);
const P_SETTLED = ((((TRAIL_CELLS + FADE_CELLS) * stepT) / CYCLE) * 100).toFixed(3);
const H_WHITE = (50 + Number(P_WHITE)).toFixed(3);
const H_SETTLED = (50 + Number(P_SETTLED)).toFixed(3);

/* ---------- cells ---------- */
const COLORS = {
    FIRST_QUARTILE: '#0e4429',
    SECOND_QUARTILE: '#006d32',
    THIRD_QUARTILE: '#26a641',
    FOURTH_QUARTILE: '#39d353',
};
const LEVEL_CLASS = {
    FIRST_QUARTILE: 't1',
    SECOND_QUARTILE: 't2',
    THIRD_QUARTILE: 't3',
    FOURTH_QUARTILE: 't4',
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

let cells = '',
    gifts = '',
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
        const t = visitAt.get(`${x},${day.weekday}`).toFixed(2);

        cells += `  <rect x="${cx}" y="${cy}" width="${CELL}" height="${CELL}" rx="2" fill="${DARK}" class="${cls || 'tn'}" style="animation-delay:${t}s"/>\n`;

        if (cls) {
            gifts += `  <g class="gw" style="animation-delay:${t}s">` +
                `<rect x="${cx + 4.5}" y="${cy}" width="2" height="${CELL}" fill="${RIBBON}"/>` +
                `<rect x="${cx}" y="${cy + 4.5}" width="${CELL}" height="2" fill="${RIBBON}"/>` +
                `<circle cx="${cx + 3.6}" cy="${cy + 1.4}" r="1.5" fill="${RIBBON}"/>` +
                `<circle cx="${cx + 7.4}" cy="${cy + 1.4}" r="1.5" fill="${RIBBON}"/>` +
                `</g>\n`;
        }
    }
});

/* ---------- ride keyframes ---------- */
let rideKeys = '';
path.forEach((p, i) => {
    const sx = PAD_LEFT + p.col * PITCH + CELL / 2 - SW / 2;
    const sy = PAD_TOP + p.row * PITCH + CELL / 2 - SH / 2;
    rideKeys += `      ${((i / (STEPS - 1)) * 100).toFixed(4)}% { transform: translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px) }\n`;
});

let faceKeys = '';
for (let r = 0; r < 7; r++) {
    const a = (r * 100) / 7;
    const b = r === 6 ? 100 : ((r + 1) * 100) / 7 - 0.001;
    const t = r % 2 === 0 ? 'translateX(0) scaleX(1)' : `translateX(${SW}px) scaleX(-1)`;
    faceKeys += `      ${a.toFixed(3)}%, ${b.toFixed(3)}% { transform: ${t} }\n`;
}

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

const santa = `
  <g id="santa">
    <g class="facing">
      <g class="bob">
        ${pixels(BODY)}
        <g class="legsA">${pixels(LEGS_A, 8)}</g>
        <g class="legsB">${pixels(LEGS_B, 8)}</g>
      </g>
    </g>
  </g>`;

/* ---------- ambient snowfall ---------- */
let ambient = '';
for (let i = 0; i < 80; i++) {
    const ax = (rand(i + 500) * width).toFixed(1);
    const dur = (4 + rand(i + 900) * 5).toFixed(2);
    const del = (rand(i + 1300) * 9).toFixed(2);
    const sz = rand(i + 1700) < 0.3 ? 2.5 : 1.8;
    ambient += `  <rect class="amb" x="${ax}" y="-8" width="${sz}" height="${sz}" rx="${sz / 2}" fill="#ffffff" style="animation-duration:${dur}s;animation-delay:${del}s"/>\n`;
}

/* ---------- assemble ---------- */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .m { fill: #7d8590; font: 9px -apple-system, "Segoe UI", sans-serif; }

    .t1, .t2, .t3, .t4, .tn {
      animation-duration: ${CYCLE}s;
      animation-timing-function: linear;
      animation-iteration-count: infinite;
    }
    .t1 { animation-name: tr1 } .t2 { animation-name: tr2 }
    .t3 { animation-name: tr3 } .t4 { animation-name: tr4 }
    .tn { animation-name: trn }

    @keyframes tr1 {
      0%, ${P_WHITE}%        { fill:#ffffff }
      ${P_SETTLED}%, 49.999% { fill:${COLORS.FIRST_QUARTILE} }
      50%, ${H_WHITE}%       { fill:#ffffff }
      ${H_SETTLED}%, 100%    { fill:${DARK} }
    }
    @keyframes tr2 {
      0%, ${P_WHITE}%        { fill:#ffffff }
      ${P_SETTLED}%, 49.999% { fill:${COLORS.SECOND_QUARTILE} }
      50%, ${H_WHITE}%       { fill:#ffffff }
      ${H_SETTLED}%, 100%    { fill:${DARK} }
    }
    @keyframes tr3 {
      0%, ${P_WHITE}%        { fill:#ffffff }
      ${P_SETTLED}%, 49.999% { fill:${COLORS.THIRD_QUARTILE} }
      50%, ${H_WHITE}%       { fill:#ffffff }
      ${H_SETTLED}%, 100%    { fill:${DARK} }
    }
    @keyframes tr4 {
      0%, ${P_WHITE}%        { fill:#ffffff }
      ${P_SETTLED}%, 49.999% { fill:${COLORS.FOURTH_QUARTILE} }
      50%, ${H_WHITE}%       { fill:#ffffff }
      ${H_SETTLED}%, 100%    { fill:${DARK} }
    }
    @keyframes trn {
      0%, ${P_WHITE}%        { fill:#ffffff }
      ${P_SETTLED}%, 49.999% { fill:${DARK} }
      50%, ${H_WHITE}%       { fill:#ffffff }
      ${H_SETTLED}%, 100%    { fill:${DARK} }
    }

    .gw {
      opacity: 0;
      animation-name: wrap;
      animation-duration: ${CYCLE}s;
      animation-timing-function: linear;
      animation-iteration-count: infinite;
    }
    @keyframes wrap {
      0%, ${P_WHITE}%            { opacity: 0 }
      ${P_SETTLED}%, ${H_WHITE}% { opacity: 1 }
      ${H_SETTLED}%, 100%        { opacity: 0 }
    }

    #santa { animation: ride ${RIDE}s linear infinite }
    @keyframes ride {
${rideKeys}    }

    .facing { animation: face ${RIDE}s linear infinite }
    @keyframes face {
${faceKeys}    }

    .legsA { animation: strideA 0.2s steps(1) infinite }
    .legsB { animation: strideB 0.2s steps(1) infinite }
    @keyframes strideA { 0%, 49% { opacity:1 } 50%, 100% { opacity:0 } }
    @keyframes strideB { 0%, 49% { opacity:0 } 50%, 100% { opacity:1 } }

    .bob { animation: bob 0.2s steps(1) infinite }
    @keyframes bob { 0%, 49% { transform: translateY(0) } 50%, 100% { transform: translateY(1px) } }

    .amb {
      animation-name: ambient;
      animation-timing-function: linear;
      animation-iteration-count: infinite;
      opacity: 0;
    }
    @keyframes ambient {
      0%   { transform: translateY(0); opacity: 0 }
      10%  { opacity: 0.4 }
      88%  { opacity: 0.4 }
      100% { transform: translateY(${height + 20}px); opacity: 0 }
    }
  </style>
  <rect width="100%" height="100%" fill="#0d1117"/>
${hanging}${labels}${cells}${gifts}${forest}${santa}${ambient}</svg>`;

writeFileSync('graph.svg', svg);
console.log(`wrote graph.svg  ${width}x${height}  (${STEPS} steps, cycle ${CYCLE}s)`);