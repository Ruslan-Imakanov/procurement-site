// Заглушки баннеров по регионам и логотипов клиентов, фавикон.
// Используются только при сборке: build.mjs сохраняет их как статические файлы dist/assets/static/*.svg.

const G = '#d9ae5f';
const bg = (a, b) => `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="1600" height="900" fill="url(#g)"/>`;
const svg = (body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900" preserveAspectRatio="xMidYMid slice">${body}</svg>`;

function meridians() {
  let s = '';
  for (let i = 0; i < 9; i++) {
    const rx = 40 + i * 52;
    s += `<ellipse cx="1180" cy="450" rx="${rx}" ry="420" fill="none" stroke="${G}" stroke-opacity="${0.1 + i * 0.025}" stroke-width="1.4"/>`;
  }
  for (let j = -3; j <= 3; j++) {
    const y = 450 + j * 120;
    const w = Math.sqrt(Math.max(0, 1 - (j * 120 / 420) ** 2)) * 460;
    s += `<ellipse cx="1180" cy="${y}" rx="${w.toFixed(0)}" ry="${(w * 0.08).toFixed(0)}" fill="none" stroke="${G}" stroke-opacity=".18" stroke-width="1.2"/>`;
  }
  return s;
}

function mountains() {
  const layers = [
    ['#20476d', 'M0 620 L160 480 L300 560 L470 380 L640 520 L800 340 L980 500 L1150 300 L1330 470 L1480 380 L1600 450 L1600 900 L0 900Z', 0.9],
    ['#1a3b5c', 'M0 700 L200 560 L380 660 L560 520 L760 650 L960 540 L1140 640 L1320 520 L1600 620 L1600 900 L0 900Z', 1],
    ['#132f4b', 'M0 780 L240 680 L470 760 L700 660 L930 760 L1180 670 L1400 750 L1600 700 L1600 900 L0 900Z', 1],
  ];
  return layers.map(([c, d, o]) => `<path d="${d}" fill="${c}" fill-opacity="${o}"/>`).join('') +
    `<path d="M800 340 L840 372 L870 360 L912 410" fill="none" stroke="${G}" stroke-opacity=".5" stroke-width="2"/>` +
    `<path d="M1150 300 L1196 340 L1230 328 L1270 380" fill="none" stroke="${G}" stroke-opacity=".5" stroke-width="2"/>` +
    `<circle cx="1320" cy="180" r="60" fill="none" stroke="${G}" stroke-opacity=".35" stroke-width="1.5"/>`;
}

function grid() {
  let s = '';
  for (let x = 700; x <= 1600; x += 60) s += `<line x1="${x}" y1="0" x2="${x}" y2="900" stroke="${G}" stroke-opacity=".08"/>`;
  for (let y = 0; y <= 900; y += 60) s += `<line x1="700" y1="${y}" x2="1600" y2="${y}" stroke="${G}" stroke-opacity=".08"/>`;
  const blocks = [[820, 180, 120, 180], [1000, 120, 180, 120], [1240, 240, 120, 240], [880, 480, 240, 120], [1180, 540, 180, 180], [1420, 360, 120, 300]];
  s += blocks.map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#24527d" fill-opacity=".35" stroke="${G}" stroke-opacity=".3"/>`).join('');
  s += `<path d="M700 760 C900 700 1000 820 1200 740 S1500 640 1600 700" fill="none" stroke="${G}" stroke-opacity=".55" stroke-width="3"/>`;
  return s;
}

function arches() {
  let s = '';
  for (let i = 0; i < 7; i++) {
    const x = 760 + i * 120;
    s += `<path d="M${x} 900 V430 A55 55 0 0 1 ${x + 110} 430 V900" fill="#1e4469" fill-opacity=".35" stroke="${G}" stroke-opacity=".28" stroke-width="1.5"/>`;
  }
  s += `<line x1="740" y1="360" x2="1600" y2="360" stroke="${G}" stroke-opacity=".35" stroke-width="2"/>`;
  s += `<path d="M740 340 L1170 160 L1600 340" fill="none" stroke="${G}" stroke-opacity=".35" stroke-width="2"/>`;
  return s;
}

function dunes() {
  let s = '';
  const star = (cx, cy, r) => {
    const pts = [];
    for (let k = 0; k < 16; k++) {
      const a = (Math.PI / 8) * k;
      const rr = k % 2 ? r * 0.62 : r;
      pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
    }
    return `<polygon points="${pts.join(' ')}" fill="none" stroke="${G}" stroke-opacity=".3" stroke-width="1.5"/>`;
  };
  s += star(1180, 260, 120) + star(1180, 260, 70) + star(1460, 140, 60);
  s += `<path d="M0 700 C300 600 520 690 800 640 S1300 560 1600 620 V900 H0Z" fill="#1d4268" fill-opacity=".8"/>`;
  s += `<path d="M0 790 C380 720 640 800 980 750 S1400 700 1600 740 V900 H0Z" fill="#14324f"/>`;
  return s;
}

export const HEROES = {
  'hero-global': svg(bg('#0d2440', '#1b4470') + meridians()),
  'hero-central-asia': svg(bg('#0e2742', '#2a5276') + mountains()),
  'hero-cis': svg(bg('#0c2139', '#1d466e') + grid()),
  'hero-europe': svg(bg('#102a46', '#24507a') + arches()),
  'hero-middle-east': svg(bg('#11263f', '#3a5878') + dunes()),
};

const LOGO_SHAPES = [
  '<circle cx="34" cy="48" r="18" fill="none" stroke="#33475b" stroke-width="5"/>',
  '<rect x="16" y="30" width="36" height="36" rx="4" fill="#33475b"/>',
  '<path d="M16 66 L34 30 L52 66Z" fill="#33475b"/>',
  '<path d="M16 48 h36 M34 30 v36" stroke="#33475b" stroke-width="7"/>',
  '<circle cx="28" cy="48" r="12" fill="#33475b"/><circle cx="44" cy="48" r="12" fill="none" stroke="#33475b" stroke-width="5"/>',
  '<path d="M16 60 Q34 20 52 60" fill="none" stroke="#33475b" stroke-width="7" stroke-linecap="round"/>',
];
export const LOGOS = Object.fromEntries(LOGO_SHAPES.map((shape, i) => [
  `logo-${i + 1}`,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 96" width="240" height="96">${shape}<text x="66" y="57" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#33475b" letter-spacing="1">CLIENT ${i + 1}</text></svg>`,
]));

export const FAVICON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="19" fill="#0f2a44"/><ellipse cx="20" cy="20" rx="7" ry="14" fill="none" stroke="#d9ae5f" stroke-width="2.2"/><path d="M6 20h28M20 6v28" stroke="#d9ae5f" stroke-width="2.2"/></svg>`;
