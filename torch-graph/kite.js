import { readFileSync, writeFileSync } from 'fs';

const cal = JSON.parse(readFileSync('contributions.json', 'utf8'));

/* ---------- layout ---------- */
const CELL = 11,
    GAP = 3,
    PITCH = CELL + GAP;
const PAD_LEFT = 12,
    PAD_TOP = 34,
    PAD_BOTTOM = 48,
    PAD_RIGHT = 12;

const weeks = cal.weeks;
const COLS = weeks.length;
const gridW = COLS * PITCH - GAP;
const gridH = 7 * PITCH - GAP;
const width = PAD_LEFT + gridW + PAD_RIGHT;
const height = PAD_TOP + gridH + PAD_BOTTOM;

/* ---------- timing ---------- */
const CYCLE = 34;
const PER_SIDE = 5; // children in each cluster
const NUM_KIDS = PER_SIDE * 2;
const ROAM_BASE = 1.2;
const STAGGER = 0.35;
const RETURN = 1.5;
const DARK = '#161b22';

function rand(i) {
    const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    return s - Math.floor(s);
}

/* ---------- kite colours ---------- */
const KITE_COLORS = ['#e63946', '#ffd166', '#2a9d8f', '#457b9d', '#b5179e',
    '#f4a261', '#90be6d', '#8ecae6', '#ff70a6', '#06d6a0'
];
// bigger kite = busier day
const LEVEL_SCALE = {
    FIRST_QUARTILE: 0.70,
    SECOND_QUARTILE: 0.84,
    THIRD_QUARTILE: 0.95,
    FOURTH_QUARTILE: 1.08,
};
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* ---------- grid ---------- */
const green = [];
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
        const sc = LEVEL_SCALE[day.contributionLevel];

        cells += `  <rect x="${cx}" y="${cy}" width="${CELL}" height="${CELL}" rx="2" fill="${DARK}"/>\n`;
        if (sc) green.push({ cx, cy, sc, id: green.length });
    }
});

/* ---------- hand each day to the nearer cluster ---------- */
const midX = width / 2;
const leftCells = green.filter((g) => g.cx < midX);
const rightCells = green.filter((g) => g.cx >= midX);
const byDist = (a, b) => rand(a.id + 11) - rand(b.id + 11);
leftCells.sort(byDist);
rightCells.sort(byDist);

const piles = Array.from({ length: NUM_KIDS }, () => []);
leftCells.forEach((g, i) => piles[i % PER_SIDE].push(g));
rightCells.forEach((g, i) => piles[PER_SIDE + (i % PER_SIDE)].push(g));

/* ---------- children ---------- */
const KPX = 2;
const SHIRTS = ['#e63946', '#457b9d', '#f4a261', '#2a9d8f', '#b5179e',
    '#ffb703', '#8ecae6', '#e76f51', '#90be6d', '#cdb4db'
];
const KID = [
    '..HH..',
    '.HFFH.',
    '..FF..',
    '.CCCC.',
    '.CCCCA',
    '.CCCC.',
    '..LL..',
    '..L.L.',
    '.S...S',
];
const KID_MIRROR = KID.map((r) => [...r].reverse().join(''));
const KID_W = 6 * KPX,
    KID_H = KID.length * KPX;
const groundY = height - 4;

function kidSprite(shirt, mirrored) {
    const pal = { H: '#2b1b12', F: '#f3cfa9', C: shirt, A: '#f3cfa9', L: '#3d4a5c', S: '#20262e' };
    const rows = mirrored ? KID_MIRROR : KID;
    let out = '';
    rows.forEach((row, y) => {
        [...row].forEach((ch, x) => {
            const fill = pal[ch];
            if (!fill) return;
            out += `<rect x="${x * KPX}" y="${y * KPX}" width="${KPX}" height="${KPX}" fill="${fill}"/>`;
        });
    });
    return out;
}

/* ---------- kite shapes ---------- */
function kiteAt(mx, my, w, h, a, b) {
    const bot = my + h * 1.45;
    return `<polygon points="${mx},${my - h} ${mx},${my} ${mx - w},${my}" fill="${a}"/>` +
        `<polygon points="${mx},${my - h} ${mx + w},${my} ${mx},${my}" fill="${b}"/>` +
        `<polygon points="${mx},${my} ${mx},${bot} ${mx - w},${my}" fill="${b}"/>` +
        `<polygon points="${mx},${my} ${mx + w},${my} ${mx},${bot}" fill="${a}"/>` +
        `<line x1="${mx}" y1="${my - h}" x2="${mx}" y2="${bot}" stroke="#0d1117" stroke-width="0.6"/>` +
        `<line x1="${mx - w}" y1="${my}" x2="${mx + w}" y2="${my}" stroke="#0d1117" stroke-width="0.6"/>`;
}

function flyingKite(a, b) {
    return `
      <polygon points="0,-7 0,0 -5,0" fill="${a}"/>
      <polygon points="0,-7 5,0 0,0" fill="${b}"/>
      <polygon points="0,0 0,7 -5,0" fill="${b}"/>
      <polygon points="0,0 5,0 0,7" fill="${a}"/>
      <line x1="0" y1="-7" x2="0" y2="7" stroke="#1d3557" stroke-width="0.7"/>
      <line x1="-5" y1="0" x2="5" y2="0" stroke="#1d3557" stroke-width="0.7"/>
      <g class="tail">
        <rect x="-1" y="9" width="2" height="2" rx="1" fill="#f1faee"/>
        <rect x="0.5" y="12.5" width="2" height="2" rx="1" fill="#e63946"/>
        <rect x="-2" y="16" width="2" height="2" rx="1" fill="#ffd166"/>
      </g>`;
}

/* ---------- build everything ---------- */
let kids = '',
    liveStrings = '',
    heldStrings = '',
    kites = '',
    litKites = '',
    kiteCSS = '';
const skyTop = 6;
const skyBottom = PAD_TOP + gridH - 14;

for (let k = 0; k < NUM_KIDS; k++) {
    const onLeft = k < PER_SIDE;
    const i = onLeft ? k : k - PER_SIDE;
    const kidX = onLeft ? 14 + i * 15 : width - 78 + i * 15;
    const kidY = groundY - KID_H;
    const handX = onLeft ? kidX + KID_W : kidX; // arm points at the field
    const handY = kidY + 8;

    kids += `  <g transform="translate(${kidX.toFixed(1)}, ${kidY.toFixed(1)})">${kidSprite(SHIRTS[k], !onLeft)}</g>\n`;

    const roamPts = [0, 1, 2].map((j) => ({
        x: onLeft ? 40 + rand(k * 31 + j + 5) * 160 : width - 200 + rand(k * 31 + j + 5) * 160,
        y: skyTop + rand(k * 37 + j + 9) * (skyBottom - skyTop),
    }));

    const targets = piles[k];
    const roamEnd = ROAM_BASE + k * STAGGER;
    const available = CYCLE - roamEnd - RETURN;
    const slot = targets.length ? available / targets.length : available;
    const fly = slot * 0.62,
        rest = slot * 0.38;

    const stops = [
        { t: 0, p: roamPts[0] },
        { t: roamEnd * 0.4, p: roamPts[1] },
        { t: roamEnd * 0.78, p: roamPts[2] },
    ];

    let t = roamEnd;
    for (const g of targets) {
        const mx = g.cx + CELL / 2,
            my = g.cy + CELL / 2;
        t += fly;
        stops.push({ t, p: { x: mx, y: my } });

        // this kite stays put from now on, string still in the child's hand
        const a = KITE_COLORS[Math.floor(rand(g.id + 61) * KITE_COLORS.length)];
        const b = KITE_COLORS[Math.floor(rand(g.id + 97) * KITE_COLORS.length)];
        const w = 5.6 * g.sc,
            h = 5.2 * g.sc;
        const delay = t.toFixed(2);

        litKites += `  <g class="ck" style="animation-delay:${delay}s">${kiteAt(mx, my - 1, w, h, a, b === a ? '#f1faee' : b)}</g>\n`;
        heldStrings += `  <line class="ps" x1="${handX.toFixed(1)}" y1="${handY.toFixed(1)}" x2="${mx}" y2="${my}" stroke="#8b949e" stroke-width="0.5" style="animation-delay:${delay}s"/>\n`;

        t += rest;
        stops.push({ t, p: { x: mx, y: my } });
    }
    stops.push({ t: Math.min(CYCLE - 0.01, t + RETURN), p: roamPts[0] });
    stops.push({ t: CYCLE, p: roamPts[0] });

    let posKeys = '',
        strKeys = '';
    for (const s of stops) {
        const pct = ((s.t / CYCLE) * 100).toFixed(4);
        posKeys += `      ${pct}% { transform: translate(${s.p.x.toFixed(1)}px, ${s.p.y.toFixed(1)}px) }\n`;
        const dx = s.p.x - handX,
            dy = s.p.y - handY;
        strKeys += `      ${pct}% { transform: rotate(${((Math.atan2(dy, dx) * 180) / Math.PI).toFixed(2)}deg) scaleX(${Math.hypot(dx, dy).toFixed(1)}) }\n`;
    }

    kiteCSS += `
    #kt${k} { animation: fly${k} ${CYCLE}s ease-in-out infinite }
    @keyframes fly${k} {\n${posKeys}    }
    #st${k} { animation: str${k} ${CYCLE}s ease-in-out infinite }
    @keyframes str${k} {\n${strKeys}    }`;

    liveStrings += `  <g transform="translate(${handX.toFixed(1)}, ${handY.toFixed(1)})"><g id="st${k}">` +
        `<line x1="0" y1="0" x2="1" y2="0" stroke="#c9d1d9" stroke-width="0.7" opacity="0.6" vector-effect="non-scaling-stroke"/>` +
        `</g></g>\n`;

    kites += `  <g id="kt${k}"><g class="wob">${flyingKite(SHIRTS[k], k % 2 ? '#f1faee' : '#ffd166')}</g></g>\n`;
}

/* ---------- assemble ---------- */
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .m { fill: #7d8590; font: 9px -apple-system, "Segoe UI", sans-serif; }

    .ck { opacity: 0; animation: pop ${CYCLE}s linear infinite }
    @keyframes pop { 0% { opacity: 0 } 0.9%, 100% { opacity: 1 } }

    .ps { opacity: 0; animation: hold ${CYCLE}s linear infinite }
    @keyframes hold { 0%, 100% { opacity: 0.28 } }

    .wob { animation: wob 1.7s ease-in-out infinite alternate }
    @keyframes wob { from { transform: rotate(-10deg) } to { transform: rotate(10deg) } }

    .tail { animation: swish 1.1s ease-in-out infinite alternate }
    @keyframes swish { from { transform: translateX(-1.5px) } to { transform: translateX(1.5px) } }
${kiteCSS}
  </style>
  <rect width="100%" height="100%" fill="#0d1117"/>
${labels}${cells}${heldStrings}${litKites}${liveStrings}${kites}${kids}</svg>`;

writeFileSync('graph-kite.svg', svg);
console.log(`wrote graph-kite.svg  ${width}x${height}  (${green.length} days, ${NUM_KIDS} kids, cycle ${CYCLE}s)`);