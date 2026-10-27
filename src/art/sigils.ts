// The cabinet's symbols (docs/SUBROSA.md): planets and metals, elements,
// alchemy, the occult and the hermetic, and the lodge's emblems, drawn by
// hand as SVG in ink densities like the other ornaments (ornaments.ts merges
// them in) and dithered live. Glyphs are drawn as strokes in a 100 by 100
// frame unless noted, after the forms Wikipedia's articles describe.

/** Ink density 0..1 as a gray for this scheme. */
type Ink = (density: number) => string;

interface Drawing {
  w: number;
  h: number;
  title: string;
  draw: (k: Ink) => string;
}

export type SigilName =
  | "sol" | "luna" | "mercury" | "venus" | "mars" | "jupiter" | "saturn"
  | "fire" | "water" | "air" | "earth" | "sulfur" | "salt" | "antimony" | "philosophers-stone" | "zodiac"
  | "ouroboros" | "monas" | "unicursal" | "caduceus" | "asclepius" | "rose-cross" | "leviathan-cross" | "tree-of-life"
  | "sator" | "abracadabra" | "sigillum-dei" | "kamea-saturn" | "triquetra" | "vesica" | "flower-of-life" | "ankh"
  | "eye-of-horus" | "tau" | "alpha-omega" | "shield-trinity" | "cross-pattee"
  | "pillars" | "pavement" | "sun-moon" | "letter-g" | "euclid-47" | "beehive" | "point-circle" | "ashlars" | "blazing-star"
  | "trowel" | "level" | "plumb" | "gavel" | "gauge" | "hourglass" | "skull" | "anchor-ark" | "stair" | "acacia"
  | "triple-tau" | "keystone" | "great-lights" | "lesser-lights" | "jacobs-ladder" | "double-eagle";

const SERIF = "Georgia, 'Times New Roman', serif";
const SYMBOL_FONT = "'Segoe UI Symbol', 'Apple Symbols', 'Noto Sans Symbols', 'DejaVu Sans', sans-serif";

/** A stroked path in solid ink. */
const ln = (k: Ink, d: string, w = 5, cap = "round") => `<path d="${d}" fill="none" stroke="${k(0.95)}" stroke-width="${w}" stroke-linecap="${cap}" stroke-linejoin="round"/>`;
const ring = (k: Ink, cx: number, cy: number, r: number, w = 5, fill = "none") => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${k(0.95)}" stroke-width="${w}"/>`;
const dot = (k: Ink, cx: number, cy: number, r: number, d = 0.95) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${k(d)}"/>`;
const shape = (k: Ink, d: string, fill: number, w = 1.2) => `<path d="${d}" fill="${k(fill)}" stroke="${k(0.95)}" stroke-width="${w}" stroke-linejoin="round"/>`;
const text = (k: Ink, x: number, y: number, s: string, size: number, opts = "") =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="${SERIF}" font-size="${size}" fill="${k(0.95)}"${opts}>${s}</text>`;
/** A shading from one density to another along x or y. */
const lin = (id: string, k: Ink, stops: number[], dir: "x" | "y" = "x") =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${dir === "x" ? 1 : 0}" y2="${dir === "y" ? 1 : 0}">${stops.map((d, i) => `<stop offset="${i / (stops.length - 1)}" stop-color="${k(d)}"/>`).join("")}</linearGradient>`;
const rad = (id: string, k: Ink, inner: number, outer: number, cx = 0.35, cy = 0.35) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="0.75"><stop offset="0" stop-color="${k(inner)}"/><stop offset="1" stop-color="${k(outer)}"/></radialGradient>`;

const pt = (cx: number, cy: number, r: number, deg: number) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)] as const;
const f = (n: number) => n.toFixed(2);
/** A regular polygon or star {n/step} on a circle, first point up. */
const polygon = (cx: number, cy: number, r: number, n: number, step = 1) => {
  const pts = Array.from({ length: n }, (_, i) => pt(cx, cy, r, -90 + ((i * step) % n) * (360 / n)));
  return `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L")} Z`;
};
/** A five-pointed star, filled. */
const star5 = (cx: number, cy: number, r: number) => {
  const pts = Array.from({ length: 10 }, (_, i) => pt(cx, cy, i % 2 ? r * 0.42 : r, -90 + i * 36));
  return `M${pts.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L")} Z`;
};
/** The lens two equal circles share, centres a and b. */
const lens = (a: readonly [number, number], b: readonly [number, number], r: number) => {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
  const h = Math.sqrt(r * r - (d / 2) ** 2);
  const p = [mx - (dy / d) * h, my + (dx / d) * h], q = [mx + (dy / d) * h, my - (dx / d) * h];
  return `M${f(p[0])} ${f(p[1])} A${r} ${r} 0 0 1 ${f(q[0])} ${f(q[1])} A${r} ${r} 0 0 1 ${f(p[0])} ${f(p[1])} Z`;
};
/** The square and compasses, compasses over the square. */
const squareCompasses = (k: Ink) =>
  `<defs>${lin("steel", k, [0.95, 0.55, 0.9])}</defs>` +
  `<path d="M47 14 L18 86 L24 88 L50 24 L76 88 L82 86 L53 14 Z" fill="url(#steel)" stroke="${k(0.95)}" stroke-width="0.8"/>` +
  `<circle cx="50" cy="15" r="5" fill="${k(0.2)}" stroke="${k(0.95)}" stroke-width="2"/>` +
  `<path d="M12 52 L50 88 L88 52 L82 47 L50 77 L18 47 Z" fill="${k(0.9)}" stroke="${k(0.95)}" stroke-width="0.8"/>`;
/** A candle on a stick, flame at (x, y). */
const candle = (k: Ink, x: number, y: number) =>
  shape(k, `M${x} ${y - 9} C${x + 4} ${y - 4} ${x + 3} ${y} ${x} ${y} C${x - 3} ${y} ${x - 4} ${y - 4} ${x} ${y - 9} Z`, 0.3, 1) +
  shape(k, `M${x - 3} ${y + 1} L${x + 3} ${y + 1} L${x + 3} ${y + 18} L${x - 3} ${y + 18} Z`, 0.15, 1) +
  shape(k, `M${x - 7} ${y + 18} L${x + 7} ${y + 18} L${x + 4} ${y + 22} L${x - 4} ${y + 22} Z`, 0.85, 1);

/** The twelve signs, as the font draws them (forced to text, not emoji). */
const SIGNS = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];

export const SIGILS: Record<SigilName, Drawing> = {
  // The seven planets, each its metal.
  sol: { w: 100, h: 100, title: "Sun, gold", draw: (k) => ring(k, 50, 50, 32) + dot(k, 50, 50, 7) },
  luna: { w: 100, h: 100, title: "Moon, silver", draw: (k) => shape(k, "M68 14 A36 36 0 1 0 68 86 A44 44 0 0 1 68 14 Z", 0.95, 1) },
  mercury: { w: 100, h: 100, title: "Mercury, quicksilver", draw: (k) => ln(k, "M35 10 A15 13 0 0 0 65 10") + ring(k, 50, 40, 15) + ln(k, "M50 55 L50 92 M36 74 L64 74") },
  venus: { w: 100, h: 100, title: "Venus, copper", draw: (k) => ring(k, 50, 34, 21) + ln(k, "M50 55 L50 94 M34 76 L66 76") },
  mars: { w: 100, h: 100, title: "Mars, iron", draw: (k) => ring(k, 40, 60, 23) + ln(k, "M57 43 L84 16 M62 16 L84 16 L84 38") },
  jupiter: { w: 100, h: 100, title: "Jupiter, tin", draw: (k) => ln(k, "M22 36 C22 16 52 14 50 34 C48 50 34 60 22 66 L84 66 M66 20 L66 92") },
  saturn: { w: 100, h: 100, title: "Saturn, lead", draw: (k) => ln(k, "M40 8 L40 70 M26 24 L56 24 M40 50 C46 38 70 36 68 56 C66 68 56 74 62 88 C65 93 72 92 75 86") },

  // The four elements, the three principles, and the stone.
  fire: { w: 100, h: 100, title: "Fire", draw: (k) => ln(k, "M50 12 L88 80 L12 80 Z") },
  water: { w: 100, h: 100, title: "Water", draw: (k) => ln(k, "M50 88 L12 20 L88 20 Z") },
  air: { w: 100, h: 100, title: "Air", draw: (k) => ln(k, "M50 12 L88 80 L12 80 Z M18 54 L82 54") },
  earth: { w: 100, h: 100, title: "Earth", draw: (k) => ln(k, "M50 88 L12 20 L88 20 Z M18 46 L82 46") },
  sulfur: { w: 100, h: 100, title: "Sulfur", draw: (k) => ln(k, "M50 8 L74 50 L26 50 Z M50 50 L50 94 M32 72 L68 72") },
  salt: { w: 100, h: 100, title: "Salt", draw: (k) => ring(k, 50, 50, 34) + ln(k, "M16 50 L84 50") },
  antimony: { w: 100, h: 100, title: "Antimony", draw: (k) => ring(k, 50, 62, 26) + ln(k, "M50 36 L50 6 M36 20 L64 20") },
  "philosophers-stone": {
    w: 100,
    h: 100,
    title: "The squared circle",
    draw: (k) => ring(k, 50, 50, 44, 3.5) + ln(k, "M18.9 18.9 L81.1 18.9 L81.1 81.1 L18.9 81.1 Z M50 18.9 L81.1 81.1 L18.9 81.1 Z", 3.5) + ring(k, 50, 61.9, 19.2, 3.5) + dot(k, 50, 61.9, 3),
  },
  zodiac: {
    w: 100,
    h: 100,
    title: "The zodiac",
    draw: (k) => {
      let out = ring(k, 50, 50, 47, 2.5) + ring(k, 50, 50, 33, 2.5) + ring(k, 50, 50, 8, 2) + dot(k, 50, 50, 2.5);
      for (let i = 0; i < 12; i++) {
        const [x1, y1] = pt(50, 50, 33, i * 30 - 90), [x2, y2] = pt(50, 50, 47, i * 30 - 90);
        out += `<path d="M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}" stroke="${k(0.95)}" stroke-width="1.5"/>`;
        const [x, y] = pt(50, 50, 40, i * 30 - 75);
        out += `<text x="${f(x)}" y="${f(y + 3.6)}" text-anchor="middle" font-family="${SYMBOL_FONT}" font-size="10" fill="${k(0.95)}">${SIGNS[i]}︎</text>`;
      }
      return out;
    },
  },

  // The occult and the hermetic.
  ouroboros: {
    w: 100,
    h: 100,
    title: "Ouroboros",
    draw: (k) => {
      // The body thins from the head round to the tail in its mouth.
      let out = "";
      const n = 36;
      for (let i = 0; i < n; i++) {
        const a0 = -70 + (i / n) * 330, a1 = -70 + ((i + 1) / n) * 330;
        const [x0, y0] = pt(50, 50, 36, a0), [x1, y1] = pt(50, 50, 36, a1);
        out += `<path d="M${f(x0)} ${f(y0)} L${f(x1)} ${f(y1)}" stroke="${k(i % 2 ? 0.95 : 0.8)}" stroke-width="${f(13 - (i / n) * 10)}" stroke-linecap="round"/>`;
      }
      const [hx, hy] = pt(50, 50, 36, -76);
      return out + `<ellipse cx="${f(hx)}" cy="${f(hy)}" rx="10" ry="7.5" transform="rotate(-160 ${f(hx)} ${f(hy)})" fill="${k(0.95)}"/>` + dot(k, hx - 2, hy - 2.5, 1.6, 0);
    },
  },
  monas: {
    w: 100,
    h: 100,
    title: "Monas Hieroglyphica",
    draw: (k) => ln(k, "M33 8 A17 13 0 0 0 67 8", 4.5) + ring(k, 50, 32, 15, 4.5) + dot(k, 50, 32, 4) + ln(k, "M50 47 L50 82 M34 62 L66 62", 4.5) + ln(k, "M30 96 C30 82 42 78 50 86 C58 78 70 82 70 96", 4.5),
  },
  unicursal: {
    w: 100,
    h: 100,
    title: "Unicursal hexagram",
    draw: (k) => {
      const [T, LL, UR, B, UL, LR] = [-90, 150, -30, 90, 210, 30].map((a) => pt(50, 50, 44, a));
      return ln(k, `M${[T, LL, UR, B, UL, LR].map(([x, y]) => `${f(x)} ${f(y)}`).join(" L")} Z`, 4.5);
    },
  },
  caduceus: {
    w: 100,
    h: 100,
    title: "Caduceus",
    draw: (k) => {
      const wingL = "M48 18 C36 8 20 8 8 14 C18 16 22 18 26 22 C20 22 16 24 12 28 C24 28 34 26 48 24 Z";
      const snake = (s: number) => {
        let d = `M${50 + s * 4} 30`;
        for (let y = 30; y <= 86; y += 2) d += ` L${f(50 + s * 14 * Math.sin(((y - 30) / 56) * Math.PI * 2.5))} ${y}`;
        return d;
      };
      return (
        ln(k, "M50 10 L50 94", 5) + dot(k, 50, 10, 5) +
        shape(k, wingL, 0.8, 1) + `<g transform="translate(100 0) scale(-1 1)">${shape(k, wingL, 0.8, 1)}</g>` +
        ln(k, snake(1), 3.5) + ln(k, snake(-1), 3.5) + dot(k, 54, 30, 3.5) + dot(k, 46, 30, 3.5)
      );
    },
  },
  asclepius: {
    w: 100,
    h: 100,
    title: "Rod of Asclepius",
    draw: (k) => {
      let d = "M56 24";
      for (let y = 24; y <= 84; y += 2) d += ` L${f(50 + 12 * Math.cos(((y - 24) / 60) * Math.PI * 3))} ${y}`;
      return shape(k, "M47 8 L53 8 L53 94 L47 94 Z", 0.75, 1.2) + ln(k, d, 4) + `<ellipse cx="58" cy="20" rx="6" ry="4" fill="${k(0.95)}"/>`;
    },
  },
  "rose-cross": {
    w: 100,
    h: 100,
    title: "Rose Cross",
    draw: (k) => {
      let petals = "";
      for (let i = 0; i < 5; i++) {
        const [x, y] = pt(50, 42, 9, -90 + i * 72);
        petals += `<circle cx="${f(x)}" cy="${f(y)}" r="8" fill="${k(0.25)}" stroke="${k(0.95)}" stroke-width="1.2"/>`;
      }
      return shape(k, "M43 6 L57 6 L57 30 L82 30 L82 54 L57 54 L57 94 L43 94 L43 54 L18 54 L18 30 L43 30 Z", 0.85, 1) + petals + `<circle cx="50" cy="42" r="6" fill="${k(0.6)}" stroke="${k(0.95)}" stroke-width="1"/>` + dot(k, 50, 42, 2);
    },
  },
  "leviathan-cross": {
    w: 100,
    h: 100,
    title: "Leviathan cross",
    draw: (k) => ln(k, "M50 6 L50 74 M36 20 L64 20 M28 38 L72 38") + ln(k, "M50 76 C42 64 24 64 24 78 C24 92 42 92 50 80 C58 68 76 64 76 78 C76 92 58 92 50 76", 5),
  },
  "tree-of-life": {
    w: 100,
    h: 120,
    title: "Tree of life",
    draw: (k) => {
      const S: Record<string, [number, number]> = { K: [50, 9], C: [80, 24], B: [20, 24], H: [80, 50], G: [20, 50], T: [50, 62], N: [80, 82], O: [20, 82], Y: [50, 95], M: [50, 112] };
      const paths = ["KC", "KB", "KT", "CB", "CT", "CH", "BT", "BG", "HG", "HT", "HN", "GT", "GO", "TN", "TY", "TO", "NO", "NY", "NM", "OY", "OM", "YM"];
      return (
        paths.map((p) => `<path d="M${S[p[0]].join(" ")} L${S[p[1]].join(" ")}" stroke="${k(0.95)}" stroke-width="2.4"/>`).join("") +
        Object.values(S).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7.5" fill="${k(0.2)}" stroke="${k(0.95)}" stroke-width="2.4"/>`).join("")
      );
    },
  },
  sator: {
    w: 100,
    h: 100,
    title: "Sator square",
    draw: (k) => {
      const rows = ["SATOR", "AREPO", "TENET", "OPERA", "ROTAS"];
      let out = `<rect x="5" y="5" width="90" height="90" fill="none" stroke="${k(0.95)}" stroke-width="3"/>`;
      for (let i = 1; i < 5; i++) out += `<path d="M5 ${5 + i * 18} L95 ${5 + i * 18} M${5 + i * 18} 5 L${5 + i * 18} 95" stroke="${k(0.6)}" stroke-width="1"/>`;
      rows.forEach((r, y) => [...r].forEach((c, x) => (out += text(k, 14 + x * 18, 20.5 + y * 18, c, 13, ` font-weight="bold"`))));
      return out;
    },
  },
  abracadabra: {
    w: 100,
    h: 100,
    title: "Abracadabra",
    draw: (k) => {
      let out = "";
      for (let i = 0; i < 11; i++) out += `<text x="50" y="${12 + i * 8.2}" text-anchor="middle" font-family="${SERIF}" font-size="8.6" letter-spacing="1.4" fill="${k(0.95)}">${"ABRACADABRA".slice(0, 11 - i)}</text>`;
      return out;
    },
  },
  "sigillum-dei": {
    w: 100,
    h: 100,
    title: "Sigillum Dei",
    draw: (k) => {
      let ticks = "";
      for (let i = 0; i < 72; i++) {
        const [x, y] = pt(50, 50, 43.5, i * 5);
        ticks += dot(k, x, y, 0.9, 0.8);
      }
      return (
        ring(k, 50, 50, 47, 2.2) + ring(k, 50, 50, 40, 2.2) + ticks +
        `<path d="${polygon(50, 50, 40, 7)}" fill="none" stroke="${k(0.95)}" stroke-width="1.8"/>` +
        `<path d="${polygon(50, 50, 40, 7, 3)}" fill="none" stroke="${k(0.95)}" stroke-width="1.8"/>` +
        `<path d="${polygon(50, 50, 22, 7)}" fill="none" stroke="${k(0.95)}" stroke-width="1.8"/>` +
        `<path d="${polygon(50, 50, 18, 5, 2)}" fill="${k(0.15)}" stroke="${k(0.95)}" stroke-width="2"/>` + text(k, 50, 54, "T", 10)
      );
    },
  },
  "kamea-saturn": {
    w: 100,
    h: 100,
    title: "The square of Saturn",
    draw: (k) => {
      const n = [4, 9, 2, 3, 5, 7, 8, 1, 6];
      let out = `<rect x="8" y="8" width="84" height="84" fill="none" stroke="${k(0.95)}" stroke-width="3"/><path d="M36 8 L36 92 M64 8 L64 92 M8 36 L92 36 M8 64 L92 64" stroke="${k(0.95)}" stroke-width="2"/>`;
      n.forEach((v, i) => (out += text(k, 22 + (i % 3) * 28, 31 + Math.floor(i / 3) * 28, String(v), 19)));
      return out;
    },
  },
  triquetra: {
    w: 100,
    h: 100,
    title: "Triquetra",
    draw: (k) => {
      const c = [90, 210, 330].map((a) => pt(50, 56, 18, a));
      return ring(k, 50, 56, 24, 3) + ln(k, lens(c[0], c[1], 31) + lens(c[1], c[2], 31) + lens(c[2], c[0], 31), 4.5);
    },
  },
  vesica: { w: 100, h: 100, title: "Vesica piscis", draw: (k) => `<path d="${lens([37, 50], [63, 50], 26)}" fill="${k(0.35)}"/>` + ring(k, 37, 50, 26, 3.5) + ring(k, 63, 50, 26, 3.5) },
  "flower-of-life": {
    w: 100,
    h: 100,
    title: "Seed of life",
    draw: (k) => ring(k, 50, 50, 18, 2.4) + [0, 60, 120, 180, 240, 300].map((a) => ring(k, ...pt(50, 50, 18, a), 18, 2.4)).join("") + ring(k, 50, 50, 37, 3.5),
  },
  ankh: {
    w: 100,
    h: 100,
    title: "Ankh",
    draw: (k) => `<ellipse cx="50" cy="26" rx="14" ry="19" fill="none" stroke="${k(0.95)}" stroke-width="8"/>` + shape(k, "M18 46 L82 46 L82 56 L56 56 L60 94 L40 94 L44 56 L18 56 Z", 0.95, 1),
  },
  "eye-of-horus": {
    w: 100,
    h: 100,
    title: "Eye of Horus",
    draw: (k) =>
      ln(k, "M12 26 C30 12 70 10 90 22", 5) +
      shape(k, "M14 44 C30 28 64 26 84 40 L96 40 L96 45 L80 45 C64 56 30 56 14 44 Z", 0.1, 4) +
      dot(k, 50, 42, 10) +
      ln(k, "M40 54 L34 88", 4.5) +
      ln(k, "M56 54 C58 70 68 84 80 80 C88 76 86 66 78 68", 4.5),
  },
  tau: { w: 100, h: 100, title: "Tau cross", draw: (k) => shape(k, "M12 12 L88 12 L84 22 L84 30 L57 30 L59 88 L66 94 L34 94 L41 88 L43 30 L16 30 L16 22 Z", 0.9, 1) },
  "alpha-omega": { w: 100, h: 100, title: "Alpha and Omega", draw: (k) => text(k, 28, 66, "Α", 44) + text(k, 72, 66, "Ω", 44) },
  "shield-trinity": {
    w: 100,
    h: 100,
    title: "Shield of the Trinity",
    draw: (k) => {
      const [P, F, S, D] = [[18, 20], [82, 20], [50, 86], [50, 44]] as const;
      const link = (a: readonly number[], b: readonly number[]) => `<path d="M${a.join(" ")} L${b.join(" ")}" stroke="${k(0.95)}" stroke-width="3"/>`;
      const node = ([x, y]: readonly number[], s: string) => `<circle cx="${x}" cy="${y}" r="13" fill="${k(0.05)}" stroke="${k(0.95)}" stroke-width="2.6"/>` + text(k, x, y + 2, s, 5.4);
      return link(P, F) + link(F, S) + link(S, P) + link(P, D) + link(F, D) + link(S, D) + node(P, "PATER") + node(F, "FILIUS") + node(S, "SPIRITUS") + node(D, "DEUS");
    },
  },
  "cross-pattee": {
    w: 100,
    h: 100,
    title: "Cross pattée",
    draw: (k) => [0, 90, 180, 270].map((r) => `<path d="M45 50 L36 8 Q50 13 64 8 L55 50 Z" transform="rotate(${r} 50 50)" fill="${k(0.95)}"/>`).join(""),
  },

  // The lodge.
  pillars: {
    w: 100,
    h: 100,
    title: "Boaz and Jachin",
    draw: (k) => {
      const col = (x: number, letter: string) =>
        `<circle cx="${x + 9}" cy="13" r="9" fill="url(#globe)" stroke="${k(0.95)}" stroke-width="1.2"/>` +
        shape(k, `M${x - 2} 22 L${x + 20} 22 L${x + 18} 30 L${x} 30 Z`, 0.85) +
        `<rect x="${x + 2}" y="30" width="14" height="56" fill="url(#shaft)" stroke="${k(0.95)}" stroke-width="1.2"/>` +
        shape(k, `M${x - 2} 86 L${x + 20} 86 L${x + 20} 94 L${x - 2} 94 Z`, 0.85) +
        `<text x="${x + 9}" y="62" text-anchor="middle" font-family="${SERIF}" font-size="11" font-weight="bold" fill="${k(0)}">${letter}</text>`;
      return `<defs>${lin("shaft", k, [0.9, 0.35, 0.8])}${rad("globe", k, 0.15, 0.9)}</defs>` + col(10, "B") + col(72, "J");
    },
  },
  pavement: {
    w: 100,
    h: 100,
    title: "The mosaic pavement",
    draw: (k) => {
      const rows = 7, cols = 8;
      const yAt = (r: number) => 22 + 72 * (r / rows) ** 1.35;
      const half = (r: number) => 22 + 26 * (r / rows);
      let out = "";
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const y0 = yAt(r), y1 = yAt(r + 1), h0 = half(r), h1 = half(r + 1);
          const x = (h: number, i: number) => f(50 - h + (2 * h * i) / cols);
          out += `<path d="M${x(h0, c)} ${f(y0)} L${x(h0, c + 1)} ${f(y0)} L${x(h1, c + 1)} ${f(y1)} L${x(h1, c)} ${f(y1)} Z" fill="${k((r + c) % 2 ? 0.95 : 0.05)}"/>`;
        }
      return out + `<path d="M28 22 L72 22 L98 94 L2 94 Z" fill="none" stroke="${k(0.95)}" stroke-width="2.5"/>` + `<path d="M24 18 L76 18 L100 98 L0 98 Z" fill="none" stroke="${k(0.6)}" stroke-width="1" stroke-dasharray="3 2"/>`;
    },
  },
  "sun-moon": {
    w: 100,
    h: 100,
    title: "The sun and moon",
    draw: (k) => {
      let rays = "";
      for (let i = 0; i < 16; i++) {
        const [x1, y1] = pt(28, 34, 15, i * 22.5), [x2, y2] = pt(28, 34, i % 2 ? 21 : 25, i * 22.5);
        rays += `<path d="M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}" stroke="${k(0.95)}" stroke-width="2.2" stroke-linecap="round"/>`;
      }
      let stars = "";
      for (let i = 0; i < 7; i++) stars += `<path d="${star5(14 + i * 12, 82 - Math.sin((i / 6) * Math.PI) * 8, 4.2)}" fill="${k(0.95)}"/>`;
      return rays + `<circle cx="28" cy="34" r="12" fill="${k(0.85)}" stroke="${k(0.95)}" stroke-width="1.5"/>` + shape(k, "M80 14 A20 20 0 1 0 80 54 A26 26 0 0 1 80 14 Z", 0.75, 1.2) + stars;
    },
  },
  "letter-g": { w: 100, h: 100, title: "The letter G", draw: (k) => squareCompasses(k) + `<text x="50" y="62" text-anchor="middle" font-family="${SERIF}" font-size="24" font-weight="bold" fill="${k(0.95)}">G</text>` },
  "euclid-47": {
    w: 100,
    h: 100,
    title: "The forty-seventh problem",
    draw: (k) => {
      const grid = (pts: number[][], n: number) => {
        let g = "";
        for (let i = 1; i < n; i++) {
          const t = i / n;
          const a = [pts[0][0] + (pts[1][0] - pts[0][0]) * t, pts[0][1] + (pts[1][1] - pts[0][1]) * t], b = [pts[3][0] + (pts[2][0] - pts[3][0]) * t, pts[3][1] + (pts[2][1] - pts[3][1]) * t];
          const c = [pts[0][0] + (pts[3][0] - pts[0][0]) * t, pts[0][1] + (pts[3][1] - pts[0][1]) * t], d = [pts[1][0] + (pts[2][0] - pts[1][0]) * t, pts[1][1] + (pts[2][1] - pts[1][1]) * t];
          g += `<path d="M${a.map(f).join(" ")} L${b.map(f).join(" ")} M${c.map(f).join(" ")} L${d.map(f).join(" ")}" stroke="${k(0.5)}" stroke-width="0.8"/>`;
        }
        return g + `<path d="M${pts.map((p) => p.join(" ")).join(" L")} Z" fill="none" stroke="${k(0.95)}" stroke-width="2.6"/>`;
      };
      // A 3, 4, 5 triangle, a square on each side.
      const tri = `<path d="M38 26 L38 58 L62 58 Z" fill="${k(0.85)}" stroke="${k(0.95)}" stroke-width="2.6"/>`;
      return `<g transform="translate(0 8)">${grid([[38, 58], [62, 58], [62, 82], [38, 82]], 3)}${grid([[6, 26], [38, 26], [38, 58], [6, 58]], 4)}${grid([[38, 26], [70, 2], [94, 34], [62, 58]], 5)}${tri}</g>`;
    },
  },
  beehive: {
    w: 100,
    h: 100,
    title: "The beehive",
    draw: (k) => {
      let bands = "";
      for (let i = 0; i < 6; i++) {
        const y = 28 + i * 10, h = 14 + Math.min(i, 3) * 6 + (i > 3 ? 2 : 0);
        bands += `<path d="M${50 - h - 4} ${y} Q50 ${y + 5} ${50 + h + 4} ${y}" fill="none" stroke="${k(0.95)}" stroke-width="2"/>`;
      }
      let bees = "";
      for (const [x, y] of [[14, 22], [84, 16], [88, 40], [10, 50]]) bees += `<ellipse cx="${x}" cy="${y}" rx="3" ry="2" fill="${k(0.95)}"/><ellipse cx="${x - 1}" cy="${y - 2.5}" rx="2.4" ry="1.4" fill="${k(0.4)}"/>`;
      return `<defs>${lin("skep", k, [0.85, 0.3, 0.75])}</defs>` + `<path d="M20 86 C18 44 30 14 50 14 C70 14 82 44 80 86 Z" fill="url(#skep)" stroke="${k(0.95)}" stroke-width="2"/>` + bands + `<path d="M42 86 L42 76 A8 8 0 0 1 58 76 L58 86 Z" fill="${k(1)}"/>` + `<rect x="12" y="86" width="76" height="7" fill="${k(0.9)}"/>` + bees;
    },
  },
  "point-circle": {
    w: 100,
    h: 100,
    title: "The point within a circle",
    draw: (k) => ring(k, 50, 58, 26, 4) + dot(k, 50, 58, 4.5) + ln(k, "M18 28 L18 90 M82 28 L82 90", 4) + shape(k, "M30 22 C38 18 46 18 50 21 C54 18 62 18 70 22 L70 30 C62 26 54 26 50 29 C46 26 38 26 30 30 Z", 0.2, 1.5),
  },
  ashlars: {
    w: 100,
    h: 100,
    title: "The rough and perfect ashlars",
    draw: (k) =>
      shape(k, "M6 72 L10 50 L20 44 L30 46 L40 52 L44 66 L40 82 L24 86 L10 82 Z", 0.55, 1.6) +
      shape(k, "M14 56 L24 50 L34 54 L28 62 Z", 0.85, 0.8) + shape(k, "M18 74 L30 70 L36 78 L24 82 Z", 0.25, 0.8) +
      shape(k, "M56 44 L76 34 L96 44 L76 54 Z", 0.15, 1.6) + shape(k, "M56 44 L76 54 L76 84 L56 74 Z", 0.55, 1.6) + shape(k, "M76 54 L96 44 L96 74 L76 84 Z", 0.9, 1.6),
  },
  "blazing-star": {
    w: 100,
    h: 100,
    title: "The blazing star",
    draw: (k) => {
      let rays = "";
      for (let i = 0; i < 40; i++) rays += `<path d="M50 52 L49.2 4 L50.8 4 Z" transform="rotate(${i * 9} 50 52)" fill="${k(i % 2 ? 0.35 : 0.7)}"/>`;
      return rays + shape(k, star5(50, 54, 34), 0.95, 1) + `<text x="50" y="62" text-anchor="middle" font-family="${SERIF}" font-size="20" font-weight="bold" fill="${k(0)}">G</text>`;
    },
  },
  trowel: {
    w: 100,
    h: 100,
    title: "The trowel",
    draw: (k) => `<defs>${lin("blade", k, [0.95, 0.45, 0.85])}</defs><path d="M50 8 C70 30 80 52 74 62 L26 62 C20 52 30 30 50 8 Z" fill="url(#blade)" stroke="${k(0.95)}" stroke-width="1.6"/>` + ln(k, "M50 62 L50 70 L58 70 L58 74", 3) + shape(k, "M51 74 L65 74 L64 95 L52 95 Z", 0.75, 1.4),
  },
  level: {
    w: 100,
    h: 100,
    title: "The level",
    draw: (k) => ln(k, "M14 88 L50 12 L86 88 M26 64 L74 64", 6) + `<path d="M50 14 L50 52" stroke="${k(0.95)}" stroke-width="1.2"/>` + shape(k, "M50 52 L55 60 L50 68 L45 60 Z", 0.95, 1),
  },
  plumb: {
    w: 100,
    h: 100,
    title: "The plumb rule",
    draw: (k) => shape(k, "M36 6 L64 6 L64 94 L36 94 Z", 0.15, 3) + `<path d="M50 10 L50 70" stroke="${k(0.95)}" stroke-width="1.2"/>` + `<circle cx="50" cy="76" r="9" fill="none" stroke="${k(0.95)}" stroke-width="2"/>` + shape(k, "M50 64 L55 72 L50 82 L45 72 Z", 0.95, 1),
  },
  gavel: {
    w: 100,
    h: 100,
    title: "The common gavel",
    draw: (k) => `<g transform="rotate(-30 50 50)">` + shape(k, "M47 34 L53 34 L54 96 L46 96 Z", 0.6, 1.4) + shape(k, "M24 18 L62 18 L80 26 L62 34 L24 34 Z", 0.85, 1.6) + `<path d="M28 20 L28 32" stroke="${k(0.3)}" stroke-width="1.2"/></g>`,
  },
  gauge: {
    w: 100,
    h: 100,
    title: "The twenty-four-inch gauge",
    draw: (k) => {
      let ticks = "";
      for (let i = 1; i < 24; i++) ticks += `<path d="M${f(5 + (90 * i) / 24)} 42 L${f(5 + (90 * i) / 24)} ${i % 8 ? 48 : 56}" stroke="${k(0.95)}" stroke-width="${i % 8 ? 1 : 2}"/>`;
      return `<rect x="5" y="42" width="90" height="16" fill="${k(0.15)}" stroke="${k(0.95)}" stroke-width="2.4"/>` + ticks + text(k, 20, 74, "8", 9) + text(k, 50, 74, "8", 9) + text(k, 80, 74, "8", 9);
    },
  },
  hourglass: {
    w: 100,
    h: 100,
    title: "The hourglass",
    draw: (k) =>
      shape(k, "M20 6 L80 6 L80 14 L20 14 Z", 0.85) + shape(k, "M20 86 L80 86 L80 94 L20 94 Z", 0.85) + ln(k, "M24 14 L24 86 M76 14 L76 86", 3) +
      `<path d="M30 14 C30 34 46 44 48 50 C46 56 30 66 30 86 L70 86 C70 66 54 56 52 50 C54 44 70 34 70 14 Z" fill="${k(0.05)}" stroke="${k(0.95)}" stroke-width="2"/>` +
      `<path d="M37 30 L63 30 C60 40 52 44 50 50 C48 44 40 40 37 30 Z M34 86 C38 74 46 70 50 68 C54 70 62 74 66 86 Z" fill="${k(0.7)}"/>` + `<path d="M50 50 L50 68" stroke="${k(0.7)}" stroke-width="1"/>`,
  },
  skull: {
    w: 100,
    h: 100,
    title: "Skull and crossbones",
    draw: (k) => {
      const bone = (x1: number, y1: number, x2: number, y2: number) => ln(k, `M${x1} ${y1} L${x2} ${y2}`, 7) + dot(k, x1, y1, 5.5) + dot(k, x2, y2, 5.5);
      return (
        bone(16, 56, 84, 94) + bone(84, 56, 16, 94) +
        shape(k, "M28 40 C28 14 72 14 72 40 C72 52 66 54 64 62 L36 62 C34 54 28 52 28 40 Z", 0.12, 2.2) +
        `<ellipse cx="40" cy="40" rx="7" ry="8" fill="${k(0.95)}"/><ellipse cx="60" cy="40" rx="7" ry="8" fill="${k(0.95)}"/>` +
        shape(k, "M50 46 L54 54 L46 54 Z", 0.95, 0.6) + shape(k, "M38 62 L62 62 L60 72 L40 72 Z", 0.12, 2) + `<path d="M44 62 L44 72 M50 62 L50 72 M56 62 L56 72" stroke="${k(0.95)}" stroke-width="1.4"/>`
      );
    },
  },
  "anchor-ark": {
    w: 100,
    h: 100,
    title: "The anchor and ark",
    draw: (k) =>
      ring(k, 30, 12, 6, 3.5) + ln(k, "M30 18 L30 88 M16 30 L44 30 M10 66 C12 82 22 90 30 90 C38 90 48 82 50 66", 4) + shape(k, "M6 70 L10 60 L15 70 Z M54 70 L50 60 L45 70 Z", 0.95, 1) +
      shape(k, "M56 74 L96 74 L90 88 L62 88 Z", 0.8, 1.4) + shape(k, "M64 74 L64 60 L88 60 L88 74 Z", 0.25, 1.4) + shape(k, "M60 60 L76 50 L92 60 Z", 0.75, 1.4),
  },
  stair: {
    w: 100,
    h: 100,
    title: "The winding stair",
    draw: (k) => {
      // Three, five and seven steps, with a landing after each flight.
      let d = "M4 96", x = 4, y = 96;
      for (const [n, land] of [[3, 6], [5, 6], [7, 0]] as const) {
        for (let i = 0; i < n; i++) {
          y -= 5.2;
          d += ` L${f(x)} ${f(y)}`;
          x += 5.2;
          d += ` L${f(x)} ${f(y)}`;
        }
        x += land;
        d += ` L${f(x)} ${f(y)}`;
      }
      return `<path d="${d} L${f(x)} 96 Z" fill="${k(0.3)}" stroke="${k(0.95)}" stroke-width="2" stroke-linejoin="round"/>` + `<path d="${star5(x - 6, y - 14, 7)}" fill="${k(0.95)}"/>`;
    },
  },
  acacia: {
    w: 100,
    h: 100,
    title: "The sprig of acacia",
    draw: (k) => {
      let leaves = "";
      for (let i = 0; i < 9; i++) {
        const y = 22 + i * 8, s = 1 - i * 0.04, x = 50 + Math.sin(i * 0.6) * 1.5;
        leaves += `<ellipse cx="${f(x - 10 * s)}" cy="${y}" rx="${f(8 * s)}" ry="2.6" transform="rotate(-28 ${f(x)} ${y})" fill="${k(0.3)}" stroke="${k(0.95)}" stroke-width="0.8"/>`;
        leaves += `<ellipse cx="${f(x + 10 * s)}" cy="${y}" rx="${f(8 * s)}" ry="2.6" transform="rotate(28 ${f(x)} ${y})" fill="${k(0.3)}" stroke="${k(0.95)}" stroke-width="0.8"/>`;
      }
      return ln(k, "M50 96 C48 70 52 40 50 12", 3) + leaves + `<ellipse cx="50" cy="12" rx="3.4" ry="7" fill="${k(0.8)}" stroke="${k(0.95)}" stroke-width="0.8"/>`;
    },
  },
  "triple-tau": {
    w: 100,
    h: 100,
    title: "The triple tau",
    draw: (k) => ring(k, 50, 50, 46, 3) + `<path d="${polygon(50, 50, 46, 3)}" fill="none" stroke="${k(0.95)}" stroke-width="2"/>` + shape(k, "M30 34 L70 34 L70 40 L53 40 L53 50 L62 50 L62 46 L66 46 L66 72 L62 72 L62 56 L38 56 L38 72 L34 72 L34 46 L38 46 L38 50 L47 50 L47 40 L30 40 Z", 0.95, 0.6),
  },
  keystone: {
    w: 100,
    h: 100,
    title: "The keystone",
    draw: (k) => {
      let letters = "";
      [..."HTWSSTKS"].forEach((c, i) => {
        const [x, y] = pt(50, 42, 16, -90 + i * 45);
        letters += `<text x="${f(x)}" y="${f(y + 2.4)}" text-anchor="middle" font-family="${SERIF}" font-size="7" fill="${k(0.95)}">${c}</text>`;
      });
      return shape(k, "M18 8 L82 8 L68 92 L32 92 Z", 0.12, 3) + ring(k, 50, 42, 22, 1.6) + ring(k, 50, 42, 10, 1.6) + letters;
    },
  },
  "great-lights": {
    w: 100,
    h: 100,
    title: "The three great lights",
    draw: (k) => shape(k, "M4 70 C20 62 40 62 50 68 C60 62 80 62 96 70 L96 92 C80 84 60 84 50 90 C40 84 20 84 4 92 Z", 0.15, 2) + `<path d="M50 68 L50 90" stroke="${k(0.95)}" stroke-width="1.4"/>` + `<g transform="translate(14 0) scale(0.72)">${squareCompasses(k)}</g>`,
  },
  "lesser-lights": { w: 100, h: 100, title: "The three lesser lights", draw: (k) => candle(k, 50, 20) + candle(k, 22, 62) + candle(k, 78, 62) },
  "jacobs-ladder": {
    w: 100,
    h: 100,
    title: "Jacob's ladder",
    draw: (k) => {
      let rungs = "";
      for (let i = 0; i < 8; i++) {
        const t = i / 8 + 0.06, y = 94 - t * 76;
        rungs += `<path d="M${f(28 + t * 22)} ${f(y)} L${f(56 + t * 18)} ${f(y)}" stroke="${k(0.95)}" stroke-width="2.6"/>`;
      }
      return ln(k, "M26 96 L50 14 M58 96 L76 14", 3.5) + rungs + `<path d="${polygon(70, 10, 9, 7, 3)}" fill="none" stroke="${k(0.95)}" stroke-width="1.6"/>`;
    },
  },
  "double-eagle": {
    w: 100,
    h: 100,
    title: "The double-headed eagle",
    draw: (k) => {
      const wing = (s: number) => {
        let out = "";
        for (let i = 0; i < 5; i++) {
          const l = 40 - i * 4, y = 34 + i * 7;
          out += `<path d="M50 ${y} C${50 - s * l * 0.4} ${y - 14} ${50 - s * l * 0.9} ${y - 16 + i * 2} ${50 - s * l} ${y - 6 + i * 3} C${50 - s * l * 0.6} ${y + 2} ${50 - s * l * 0.3} ${y + 6} 50 ${y + 8} Z" fill="${k(0.9 - i * 0.12)}" stroke="${k(0.95)}" stroke-width="0.7"/>`;
        }
        return out;
      };
      return (
        wing(1) + wing(-1) +
        shape(k, "M42 40 C42 30 58 30 58 40 L58 70 L50 82 L42 70 Z", 0.75, 1.2) +
        ln(k, "M46 34 C42 26 36 22 30 22 M54 34 C58 26 64 22 70 22", 5) +
        dot(k, 30, 22, 6) + dot(k, 70, 22, 6) + shape(k, "M24 22 L18 25 L24 26 Z M76 22 L82 25 L76 26 Z", 0.95, 1) +
        shape(k, "M40 10 L44 4 L50 8 L56 4 L60 10 L58 16 L42 16 Z", 0.85, 1) +
        ln(k, "M44 82 L38 94 M56 82 L62 94", 3) + text(k, 50, 62, "33", 9, ` font-weight="bold"`)
      );
    },
  },
};
