// Tier 3 ornament (docs/ART.md), drawn by hand as SVG in shades of gray and
// dithered live at the size it is shown, so it prints in the theme's ink like
// the plates. Each ornament is drawn in ink densities (0 paper, 1 solid ink);
// `ornamentSrc` turns those into grays for the scheme: dark ink on white by
// day, light on black by night, where Dither draws the lit dots instead.

export type OrnamentName =
  | "fleuron"
  | "vine"
  | "urn"
  | "chi-rho"
  | "ihs"
  | "tetragrammaton"
  | "cross"
  | "compass"
  | "wheels"
  | "sun"
  | "lamp"
  | "quill"
  | "angel"
  | "lion"
  | "ox"
  | "eagle"
  | "seraph"
  | "winged-eye"
  | "ophan"
  | "crucifix"
  | "petrine"
  | "ichthys"
  | "pentagram"
  | "pentagram-inverted"
  | "hexagram"
  | "eye"
  | "square-compasses";

/** Ink density 0..1 as a gray for this scheme. */
type Ink = (density: number) => string;

interface Drawing {
  w: number;
  h: number;
  /** What it is, for a screen reader when the ornament carries meaning. */
  title: string;
  draw: (k: Ink) => string;
}

const SERIF = "Georgia, 'Times New Roman', serif";

/** A vertical or horizontal shading, densities from start to end. */
const lin = (id: string, k: Ink, stops: number[], dir: "x" | "y" = "y") =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="${dir === "x" ? 1 : 0}" y2="${dir === "y" ? 1 : 0}">${stops
    .map((d, i) => `<stop offset="${i / (stops.length - 1)}" stop-color="${k(d)}"/>`)
    .join("")}</linearGradient>`;

/** A round shading from the light point (cx, cy as fractions) outwards. */
const rad = (id: string, k: Ink, inner: number, outer: number, cx = 0.35, cy = 0.35) =>
  `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="0.75"><stop offset="0" stop-color="${k(inner)}"/><stop offset="1" stop-color="${k(outer)}"/></radialGradient>`;

const mirror = (w: number, body: string) => `${body}<g transform="translate(${w} 0) scale(-1 1)">${body}</g>`;

/** A vine leaf: three lobes and a midrib, pointing up before rotation. */
const leaf = (x: number, y: number, rot: number, s: number, fill: string, vein: string) =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})">` +
  `<path d="M0 0 C-4 -3 -11 -4 -12 -10 C-9 -11 -7 -12 -8 -16 C-4 -15 -2 -17 0 -22 C2 -17 4 -15 8 -16 C7 -12 9 -11 12 -10 C11 -4 4 -3 0 0Z" fill="${fill}"/>` +
  `<path d="M0 0 L0 -18 M0 -8 L-7 -12 M0 -8 L7 -12" stroke="${vein}" stroke-width="0.9" fill="none"/></g>`;

/** A hanging bunch of grapes, each lit from the upper left. */
const grapes = (x: number, y: number, s: number) => {
  const rows = [3, 3, 2, 2, 1];
  let out = "";
  rows.forEach((n, r) => {
    for (let i = 0; i < n; i++) out += `<circle cx="${x + (i - (n - 1) / 2) * 6 * s}" cy="${y + r * 5.4 * s}" r="${3.2 * s}" fill="url(#grape)"/>`;
  });
  return out;
};

/** The ring every evangelist's emblem sits in, like a medallion in a Gospel book. */
const roundel = (k: Ink) =>
  `<circle cx="50" cy="50" r="46" fill="none" stroke="${k(0.95)}" stroke-width="2.6"/><circle cx="50" cy="50" r="41.5" fill="none" stroke="${k(0.55)}" stroke-width="1"/>` +
  Array.from({ length: 24 }, (_, i) => `<circle cx="50" cy="6.2" r="0.9" transform="rotate(${i * 15} 50 50)" fill="${k(0.8)}"/>`).join("");

/** A wing of layered feathers, drawn pointing left from (x, y); mirror for the right. */
const wing = (x: number, y: number, k: Ink, rows = 4, len = 30) => {
  let out = "";
  for (let r = 0; r < rows; r++) {
    const l = len - r * 5, yy = y + r * 6;
    out += `<path d="M${x} ${yy} C${x - l * 0.45} ${yy - 9 + r} ${x - l * 0.85} ${yy - 4} ${x - l} ${yy + 4} C${x - l * 0.7} ${yy + 3} ${x - l * 0.35} ${yy + 6} ${x} ${yy + 7} Z" fill="${k(0.95 - r * 0.12)}" stroke="${k(0.15)}" stroke-width="0.6"/>`;
  }
  return out;
};

/** An eye: lids, a shaded iris, the pupil and its glint, at (x, y), `w` wide. */
const eye = (k: Ink, x: number, y: number, w: number, id: string) =>
  `<path d="M${x - w / 2} ${y} C${x - w / 4} ${y - w * 0.36} ${x + w / 4} ${y - w * 0.36} ${x + w / 2} ${y} C${x + w / 4} ${y + w * 0.36} ${x - w / 4} ${y + w * 0.36} ${x - w / 2} ${y}Z" fill="${k(0.05)}" stroke="${k(1)}" stroke-width="${Math.max(0.6, w * 0.05)}"/>` +
  `<circle cx="${x}" cy="${y}" r="${w * 0.2}" fill="url(#${id})"/><circle cx="${x}" cy="${y}" r="${w * 0.09}" fill="${k(1)}"/><circle cx="${x - w * 0.06}" cy="${y - w * 0.07}" r="${w * 0.035}" fill="${k(0)}"/>`;

/** A plain Latin cross in an 80 by 100 frame, shaded as if cut from wood; turned over for St Peter's. */
const latinCross = (k: Ink, turned = false) =>
  `<defs>${lin("beam", k, [0.95, 0.5, 0.85], "x")}${lin("beamh", k, [0.95, 0.5, 0.85], "y")}</defs>` +
  `<g${turned ? ` transform="rotate(180 40 50)"` : ""}><rect x="34" y="6" width="12" height="88" fill="url(#beam)"/><rect x="12" y="24" width="56" height="11" fill="url(#beamh)"/></g>`;

/** A five-pointed star drawn in one line, every second point joined, point up unless `down`. */
const star = (k: Ink, down = false) => {
  const pts = Array.from({ length: 5 }, (_, i) => {
    const a = ((down ? 90 : -90) + i * 144) * (Math.PI / 180);
    return `${(50 + 42 * Math.cos(a)).toFixed(2)} ${(53 + 42 * Math.sin(a)).toFixed(2)}`;
  });
  return `<path d="M${pts.join(" L")} Z" fill="none" stroke="${k(0.95)}" stroke-width="4" stroke-linejoin="miter"/>` + `<path d="M${pts.join(" L")} Z" fill="none" stroke="${k(0.35)}" stroke-width="1" stroke-linejoin="miter"/>`;
};

const DRAWINGS: Record<OrnamentName, Drawing> = {
  // A printer's flower: a bud between two curling leaves, between rules of dots.
  fleuron: {
    w: 120,
    h: 40,
    title: "Fleuron",
    draw: (k) =>
      `<defs>${lin("bud", k, [0.95, 0.4])}${lin("lf", k, [0.9, 0.55], "x")}</defs>` +
      mirror(
        120,
        `<path d="M47 20 C40 9 28 8 22 16 C28 13 34 14 39 19 C33 21 30 25 30 29 C36 25 42 23 47 20Z" fill="url(#lf)"/>` +
          `<circle cx="14" cy="20" r="2.6" fill="${k(0.9)}"/><circle cx="7" cy="20" r="1.6" fill="${k(0.8)}"/><circle cx="2" cy="20" r="0.9" fill="${k(0.7)}"/>`,
      ) +
      `<path d="M60 3 C66 11 70 16 70 20 C70 25 65 32 60 37 C55 32 50 25 50 20 C50 16 54 11 60 3Z" fill="url(#bud)"/>` +
      `<path d="M60 9 L60 31" stroke="${k(0.15)}" stroke-width="1.2"/>`,
  },

  // A headpiece for a book's first chapter: the true vine (John 15), grapes hanging from it.
  vine: {
    w: 480,
    h: 64,
    title: "Vine",
    draw: (k) =>
      `<defs>${rad("grape", k, 0.35, 1)}${lin("leaf", k, [0.55, 0.95])}</defs>` +
      mirror(
        480,
        `<path d="M240 30 C214 8 192 52 166 30 S118 8 92 30 S44 52 18 30 C12 25 6 26 4 30" stroke="${k(0.9)}" stroke-width="2.6" fill="none"/>` +
          `<path d="M166 30 C170 18 182 16 186 22 C182 20 176 22 176 27" stroke="${k(0.8)}" stroke-width="1.2" fill="none"/>` +
          `<path d="M92 30 C96 42 108 46 112 40 C108 41 102 39 102 34" stroke="${k(0.8)}" stroke-width="1.2" fill="none"/>` +
          `<path d="M18 30 C22 18 32 16 36 22" stroke="${k(0.8)}" stroke-width="1.1" fill="none"/>` +
          leaf(203, 20, -30, 0.95, "url(#leaf)", k(0.15)) +
          leaf(130, 39, 150, 0.95, "url(#leaf)", k(0.15)) +
          leaf(56, 20, -40, 0.85, "url(#leaf)", k(0.15)) +
          grapes(140, 16, 0.75) +
          grapes(68, 36, 0.6),
      ) +
      grapes(240, 34, 0.95) +
      `<path d="M240 30 L240 34" stroke="${k(0.9)}" stroke-width="2"/>`,
  },

  // A tailpiece: a classical urn on its foot, with handles and a lid.
  urn: {
    w: 80,
    h: 100,
    title: "Urn",
    draw: (k) =>
      `<defs>${lin("body", k, [0.95, 0.75, 0.3, 0.55, 0.95], "x")}${lin("lid", k, [0.9, 0.4, 0.85], "x")}</defs>` +
      `<circle cx="40" cy="8" r="4" fill="url(#lid)"/>` +
      `<path d="M28 20 C30 14 50 14 52 20 Z" fill="url(#lid)"/><rect x="24" y="20" width="32" height="4" fill="${k(0.9)}"/>` +
      `<path d="M28 24 C14 32 12 58 26 72 L54 72 C68 58 66 32 52 24 Z" fill="url(#body)"/>` +
      `<path d="M20 44 C28 48 52 48 60 44" stroke="${k(0.2)}" stroke-width="1.6" fill="none"/>` +
      `<path d="M21 52 C29 56 51 56 59 52" stroke="${k(0.95)}" stroke-width="1" fill="none"/>` +
      `<path d="M23 30 C10 26 8 42 18 44" stroke="${k(0.9)}" stroke-width="2.4" fill="none"/>` +
      `<path d="M57 30 C70 26 72 42 62 44" stroke="${k(0.9)}" stroke-width="2.4" fill="none"/>` +
      `<rect x="34" y="72" width="12" height="10" fill="url(#lid)"/>` +
      `<path d="M24 92 C26 84 54 84 56 92 Z" fill="url(#body)"/><rect x="22" y="92" width="36" height="4" fill="${k(0.95)}"/>`,
  },

  // Chi and Rho, the first letters of Christ in Greek, in a laurel wreath.
  "chi-rho": {
    w: 100,
    h: 100,
    title: "Chi-Rho",
    draw: (k) => {
      let wreath = "";
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * 360;
        wreath += `<ellipse cx="50" cy="6" rx="2.4" ry="5" transform="rotate(${a} 50 50) rotate(${i % 2 ? 28 : -28} 50 6)" fill="${k(i % 2 ? 0.85 : 0.6)}"/>`;
      }
      return (
        `<defs>${lin("bar", k, [0.95, 0.5], "x")}</defs>` +
        wreath +
        `<circle cx="50" cy="50" r="38" fill="none" stroke="${k(0.5)}" stroke-width="1"/>` +
        `<path d="M27 30 L33 24 L73 70 L67 76 Z" fill="url(#bar)"/><path d="M73 30 L67 24 L27 70 L33 76 Z" fill="url(#bar)"/>` +
        `<rect x="46" y="18" width="8" height="66" fill="url(#bar)"/>` +
        `<path d="M54 18 C74 18 74 46 54 46 L54 39 C64 39 64 25 54 25 Z" fill="url(#bar)"/>`
      );
    },
  },

  // IHS, the first letters of Jesus in Greek, in a sunburst with a cross over the H.
  ihs: {
    w: 100,
    h: 100,
    title: "IHS",
    draw: (k) => {
      let rays = "";
      for (let i = 0; i < 32; i++) {
        const a = (i / 32) * 360;
        rays += i % 2
          ? `<path d="M50 50 L48.6 4 L51.4 4 Z" transform="rotate(${a} 50 50)" fill="${k(0.7)}"/>`
          : `<path d="M50 50 C47 36 53 26 49 14 C52 22 47 34 50 50Z" transform="rotate(${a} 50 50)" fill="${k(0.9)}"/>`;
      }
      return (
        `<defs>${rad("disc", k, 0.05, 0.3, 0.5, 0.5)}</defs>` +
        rays +
        `<circle cx="50" cy="50" r="27" fill="url(#disc)" stroke="${k(0.9)}" stroke-width="1.6"/>` +
        `<rect x="48.6" y="26" width="2.8" height="12" fill="${k(1)}"/><rect x="45" y="29" width="10" height="2.6" fill="${k(1)}"/>` +
        `<text x="50" y="61" text-anchor="middle" font-family="${SERIF}" font-weight="bold" font-size="20" fill="${k(1)}">IHS</text>`
      );
    },
  },

  // The divine name in Hebrew, in a triangle of light.
  tetragrammaton: {
    w: 100,
    h: 100,
    title: "The divine name",
    draw: (k) => {
      let rays = "";
      for (let i = 0; i < 24; i++) rays += `<path d="M50 58 L48.8 8 L51.2 8 Z" transform="rotate(${(i / 24) * 360} 50 58)" fill="${k(i % 2 ? 0.45 : 0.8)}"/>`;
      return (
        `<defs>${rad("glow", k, 0, 0.15, 0.5, 0.55)}</defs>` +
        rays +
        `<path d="M50 22 L84 80 L16 80 Z" fill="url(#glow)" stroke="${k(1)}" stroke-width="3" stroke-linejoin="round"/>` +
        `<text x="50" y="70" text-anchor="middle" font-family="${SERIF}" font-weight="bold" font-size="21" fill="${k(1)}">יהוה</text>`
      );
    },
  },

  // A budded cross, each arm ending in three buds, shaded as if carved.
  cross: {
    w: 80,
    h: 100,
    title: "Cross",
    draw: (k) => {
      const bud = (x: number, y: number, rot: number) =>
        `<g transform="translate(${x} ${y}) rotate(${rot})"><circle cx="0" cy="-6" r="5" fill="url(#bud)"/><circle cx="-6" cy="1" r="4.4" fill="url(#bud)"/><circle cx="6" cy="1" r="4.4" fill="url(#bud)"/></g>`;
      return (
        `<defs>${lin("arm", k, [0.95, 0.45, 0.8], "x")}${lin("armh", k, [0.95, 0.45, 0.8], "y")}${rad("bud", k, 0.3, 1)}</defs>` +
        `<rect x="34" y="14" width="12" height="76" fill="url(#arm)"/>` +
        `<rect x="10" y="32" width="60" height="12" fill="url(#armh)"/>` +
        bud(40, 12, 0) + bud(40, 92, 180) + bud(8, 38, -90) + bud(72, 38, 90) +
        `<circle cx="40" cy="38" r="3.4" fill="${k(0.1)}"/>`
      );
    },
  },

  // A compass rose for the Atlas: eight points, each half lit and half in shadow.
  compass: {
    w: 100,
    h: 100,
    title: "Compass rose",
    draw: (k) => {
      const point = (a: number, len: number, wide: number) =>
        `<g transform="rotate(${a} 50 50)"><path d="M50 50 L50 ${50 - len} L${50 - wide} ${50 - wide} Z" fill="${k(0.95)}"/><path d="M50 50 L50 ${50 - len} L${50 + wide} ${50 - wide} Z" fill="${k(0.2)}" stroke="${k(0.95)}" stroke-width="0.6"/></g>`;
      let ticks = "";
      for (let i = 0; i < 32; i++) ticks += `<rect x="49.6" y="5" width="0.8" height="${i % 4 ? 2.5 : 5}" transform="rotate(${(i / 32) * 360} 50 50)" fill="${k(0.9)}"/>`;
      return (
        `<circle cx="50" cy="50" r="45" fill="none" stroke="${k(0.9)}" stroke-width="1.4"/><circle cx="50" cy="50" r="41" fill="none" stroke="${k(0.6)}" stroke-width="0.8"/>` +
        ticks +
        [45, 135, 225, 315].map((a) => point(a, 30, 6)).join("") +
        [0, 90, 180, 270].map((a) => point(a, 44, 8)).join("") +
        `<circle cx="50" cy="50" r="4" fill="${k(0.95)}"/><circle cx="50" cy="50" r="1.6" fill="${k(0.1)}"/>` +
        `<text x="50" y="4.5" text-anchor="middle" font-family="${SERIF}" font-weight="bold" font-size="6" fill="${k(1)}">N</text>`
      );
    },
  },

  // Ezekiel's wheels: a wheel in the middle of a wheel, the rims full of eyes (Ezekiel 1:16-18).
  wheels: {
    w: 100,
    h: 100,
    title: "Ezekiel's wheels",
    draw: (k) => {
      const eyes = (rx: number, ry: number, rot: number, n: number) => {
        let out = "";
        for (let i = 0; i < n; i++) {
          const t = (i / n) * Math.PI * 2;
          const x = 50 + rx * Math.cos(t), y = 50 + ry * Math.sin(t);
          out += `<g transform="rotate(${rot} 50 50)"><ellipse cx="${x}" cy="${y}" rx="3.2" ry="1.9" fill="${k(0.05)}" stroke="${k(0.95)}" stroke-width="0.8"/><circle cx="${x}" cy="${y}" r="1.1" fill="${k(1)}"/></g>`;
        }
        return out;
      };
      return (
        `<defs>${lin("rim", k, [0.95, 0.5, 0.9])}</defs>` +
        `<circle cx="50" cy="50" r="42" fill="none" stroke="url(#rim)" stroke-width="7"/>` +
        `<ellipse cx="50" cy="50" rx="42" ry="17" transform="rotate(62 50 50)" fill="none" stroke="url(#rim)" stroke-width="6"/>` +
        [0, 45, 90, 135].map((a) => `<rect x="49.3" y="10" width="1.4" height="80" transform="rotate(${a} 50 50)" fill="${k(0.6)}"/>`).join("") +
        `<circle cx="50" cy="50" r="6" fill="${k(0.95)}"/>` +
        eyes(42, 42, 0, 12) +
        eyes(42, 17, 62, 8)
      );
    },
  },

  // The sun for Morning Prayer: a lit disc, straight and flaming rays.
  sun: {
    w: 100,
    h: 100,
    title: "Morning",
    draw: (k) => {
      let rays = "";
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * 360;
        rays += i % 2
          ? `<path d="M50 50 L47.5 8 L52.5 8 Z" transform="rotate(${a} 50 50)" fill="${k(0.85)}"/>`
          : `<path d="M50 50 C45 36 55 28 49 14 C55 22 46 32 52 50Z" transform="rotate(${a} 50 50)" fill="${k(0.65)}"/>`;
      }
      return `<defs>${rad("disc", k, 0.05, 0.8, 0.4, 0.38)}</defs>` + rays + `<circle cx="50" cy="50" r="22" fill="url(#disc)" stroke="${k(0.95)}" stroke-width="1.4"/>`;
    },
  },

  // An oil lamp for Evening Prayer (Psalm 119:105), its flame the lightest thing on the page.
  lamp: {
    w: 100,
    h: 70,
    title: "Evening",
    draw: (k) =>
      `<defs>${lin("clay", k, [0.4, 0.95])}${rad("flame", k, 0, 0.75, 0.5, 0.7)}</defs>` +
      `<path d="M74 16 C66 6 70 0 74 -2 C76 6 84 10 74 16Z" transform="translate(0 6)" fill="url(#flame)" stroke="${k(0.9)}" stroke-width="0.8"/>` +
      `<path d="M8 40 C10 30 26 26 46 26 L70 26 C76 26 80 24 84 22 C86 26 84 32 78 36 C72 44 60 52 40 52 C22 52 8 50 8 40Z" fill="url(#clay)"/>` +
      `<ellipse cx="40" cy="30" rx="12" ry="3" fill="${k(1)}"/>` +
      `<path d="M10 36 C0 30 0 46 10 44" stroke="${k(0.9)}" stroke-width="2.6" fill="none"/>` +
      `<rect x="28" y="52" width="24" height="5" fill="${k(0.9)}"/>` +
      `<path d="M20 64 L60 64" stroke="${k(0.7)}" stroke-width="1.2"/>`,
  },

  // A quill for notes: the vane shaded, the barbs ruled, a split nib.
  quill: {
    w: 60,
    h: 100,
    title: "Quill",
    draw: (k) => {
      let barbs = "";
      for (let i = 0; i < 16; i++) {
        const y = 10 + i * 4.2;
        barbs += `<path d="M${33 - i * 0.6} ${y} C${24 - i * 0.4} ${y - 2} ${16 - i * 0.2} ${y + 1} ${10 + i * 0.5} ${y + 6}" stroke="${k(0.95)}" stroke-width="0.7" fill="none"/>`;
      }
      return (
        `<defs>${lin("vane", k, [0.25, 0.75], "x")}</defs>` +
        `<path d="M50 2 C30 8 10 30 12 66 C18 58 30 50 36 40 C30 56 26 70 24 80 C34 62 46 40 50 2Z" fill="url(#vane)"/>` +
        barbs +
        `<path d="M50 2 C42 30 30 60 18 92" stroke="${k(0.95)}" stroke-width="1.8" fill="none"/>` +
        `<path d="M22 82 L14 98 L20 92 L24 86 Z" fill="${k(1)}"/>`
      );
    },
  },

  // The four living creatures (Ezekiel 1:10, Revelation 4:7), each the emblem
  // of a Gospel since Jerome: the man for Matthew, the lion for Mark, the ox
  // for Luke, the eagle for John. Winged, haloed, in a ring.
  angel: {
    w: 100,
    h: 100,
    title: "The man, for Matthew",
    draw: (k) =>
      `<defs>${lin("robe", k, [0.35, 0.95], "x")}${rad("face", k, 0.15, 0.55)}</defs>` +
      roundel(k) +
      mirror(100, wing(44, 34, k, 4, 30)) +
      `<circle cx="50" cy="24" r="10.5" fill="none" stroke="${k(0.9)}" stroke-width="1.6"/>` +
      `<circle cx="50" cy="25" r="7" fill="url(#face)" stroke="${k(0.95)}" stroke-width="0.8"/>` +
      `<path d="M47.5 25 L48.5 25 M51.5 25 L52.5 25" stroke="${k(1)}" stroke-width="1.2"/>` +
      `<path d="M50 32 C40 36 37 52 35 80 L65 80 C63 52 60 36 50 32Z" fill="url(#robe)"/>` +
      `<path d="M50 34 L50 79 M44 46 C47 50 53 50 56 46" stroke="${k(0.2)}" stroke-width="1" fill="none"/>` +
      `<rect x="43" y="52" width="14" height="10" rx="1" fill="${k(0.15)}" stroke="${k(1)}" stroke-width="1.2"/><path d="M50 52 L50 62" stroke="${k(1)}" stroke-width="0.8"/>`,
  },

  lion: {
    w: 100,
    h: 100,
    title: "The lion, for Mark",
    draw: (k) => {
      // The mane as two rings of curling locks, the outer darker, around a lit face.
      let mane = "";
      for (const [r, n, d, size] of [[29, 16, 0.95, 6.2], [22, 14, 0.7, 5.2]] as const) {
        for (let i = 0; i < n; i++) {
          const t = (i / n) * Math.PI * 2 + (r === 22 ? 0.2 : 0);
          const x = 50 + r * Math.cos(t), y = 52 + r * Math.sin(t) * 1.05;
          mane += `<path d="M${x - size} ${y} C${x - size} ${y - size * 1.3} ${x + size} ${y - size * 1.3} ${x + size * 0.6} ${y + size * 0.2} C${x + size * 0.3} ${y - size * 0.5} ${x - size * 0.3} ${y - size * 0.4} ${x - size * 0.2} ${y + size * 0.5}" fill="${k(d)}" stroke="${k(0.2)}" stroke-width="0.5" transform="rotate(${(t * 180) / Math.PI + 90} ${x} ${y})"/>`;
        }
      }
      return (
        `<defs>${rad("muzzle", k, 0.1, 0.6, 0.5, 0.35)}</defs>` +
        roundel(k) +
        mane +
        `<circle cx="36" cy="34" r="5" fill="${k(0.9)}"/><circle cx="64" cy="34" r="5" fill="${k(0.9)}"/><circle cx="36" cy="34" r="2.2" fill="${k(0.3)}"/><circle cx="64" cy="34" r="2.2" fill="${k(0.3)}"/>` +
        `<path d="M50 35 C38 35 34 46 36 56 C38 66 44 70 50 70 C56 70 62 66 64 56 C66 46 62 35 50 35Z" fill="url(#muzzle)" stroke="${k(0.95)}" stroke-width="1.2"/>` +
        `<path d="M41 48 C43 45.5 46 45.5 47.5 48 M52.5 48 C54 45.5 57 45.5 59 48" stroke="${k(1)}" stroke-width="1.5" fill="none"/>` +
        `<circle cx="44.3" cy="49.5" r="1.3" fill="${k(1)}"/><circle cx="55.7" cy="49.5" r="1.3" fill="${k(1)}"/>` +
        `<path d="M47 50 L47 56 M53 50 L53 56" stroke="${k(0.4)}" stroke-width="0.7"/>` +
        `<path d="M45.5 56 C47 55 53 55 54.5 56 L50 60.5 Z" fill="${k(1)}"/>` +
        `<path d="M50 60.5 L50 63 M44 63.5 C47 66.5 53 66.5 56 63.5" stroke="${k(1)}" stroke-width="1.3" fill="none"/>` +
        `<path d="M40 59 L33 58 M40 61.5 L33 63 M60 59 L67 58 M60 61.5 L67 63" stroke="${k(0.8)}" stroke-width="0.6"/>`
      );
    },
  },

  ox: {
    w: 100,
    h: 100,
    title: "The ox, for Luke",
    draw: (k) =>
      `<defs>${lin("hide", k, [0.95, 0.45, 0.9], "x")}${lin("horn", k, [0.2, 0.9])}</defs>` +
      roundel(k) +
      mirror(
        100,
        `<path d="M38 32 C26 32 16 26 14 14 C22 22 30 24 40 26 Z" fill="url(#horn)" stroke="${k(0.95)}" stroke-width="0.9"/>` +
          `<path d="M36 38 C28 36 22 40 20 46 C26 46 32 44 37 42 Z" fill="${k(0.85)}"/>`,
      ) +
      `<path d="M36 28 C40 24 60 24 64 28 C67 40 64 56 60 66 C57 74 43 74 40 66 C36 56 33 40 36 28Z" fill="url(#hide)"/>` +
      `<path d="M50 28 L50 50" stroke="${k(0.25)}" stroke-width="1"/>` +
      `<circle cx="43" cy="42" r="2" fill="${k(1)}"/><circle cx="57" cy="42" r="2" fill="${k(1)}"/>` +
      `<ellipse cx="50" cy="66" rx="9" ry="6" fill="${k(0.2)}" stroke="${k(1)}" stroke-width="1"/>` +
      `<ellipse cx="46.5" cy="66" rx="1.6" ry="2.2" fill="${k(1)}"/><ellipse cx="53.5" cy="66" rx="1.6" ry="2.2" fill="${k(1)}"/>`,
  },

  eagle: {
    w: 100,
    h: 100,
    title: "The eagle, for John",
    draw: (k) => {
      // A wing raised as in heraldry: long primaries fanning up and out, then coverts.
      let w = "";
      for (let i = 0; i < 7; i++) {
        const a = -6 + i * 8;
        const len = 40 - i * 2.4;
        w += `<path d="M45 46 C${45 - len * 0.2} 44 ${45 - len * 0.6} 40 ${45 - len} 40 C${45 - len * 0.7} 46 ${45 - len * 0.3} 49 45 50Z" transform="rotate(${a} 45 46)" fill="${k(0.95 - (i % 2) * 0.2)}" stroke="${k(0.1)}" stroke-width="0.6"/>`;
      }
      w += `<path d="M45 42 C38 38 30 40 27 46 C33 47 40 49 45 52Z" fill="${k(0.6)}" stroke="${k(0.1)}" stroke-width="0.6"/>`;
      return (
        `<defs>${lin("breast", k, [0.95, 0.35, 0.9], "x")}</defs>` +
        roundel(k) +
        mirror(100, w + `<path d="M47 70 L40 84 L46 80 L48 86 L50 78 Z" fill="${k(0.9)}"/><path d="M46 70 L42 74 M47 72 L44 77" stroke="${k(0.95)}" stroke-width="1.4"/>`) +
        `<path d="M50 32 C43 36 42 52 44 64 C46 73 54 73 56 64 C58 52 57 36 50 32Z" fill="url(#breast)"/>` +
        `<path d="M46 44 C48 46 52 46 54 44 M46 51 C48 53 52 53 54 51 M47 58 C49 60 51 60 53 58" stroke="${k(0.2)}" stroke-width="0.8" fill="none"/>` +
        `<circle cx="51" cy="26" r="7" fill="${k(0.85)}" stroke="${k(1)}" stroke-width="0.8"/>` +
        `<path d="M57 24 C62 24 64 27 61 30 C60 28 58 28 57 29 Z" fill="${k(1)}"/>` +
        `<circle cx="53" cy="24.5" r="1.2" fill="${k(0.05)}"/>` +
        `<circle cx="51" cy="26" r="10.5" fill="none" stroke="${k(0.75)}" stroke-width="1"/>`
      );
    },
  },

  // "Each one had six wings; with twain he covered his face, and with twain he
  // covered his feet, and with twain he did fly" (Isaiah 6:2).
  seraph: {
    w: 100,
    h: 100,
    title: "Seraph",
    draw: (k) => {
      // Each pair is one layered wing and its mirror, turned about the shoulders.
      const pair = (rot: number, rows: number, len: number) =>
        mirror(100, `<g transform="rotate(${rot} 46 50)">${wing(46, 46, k, rows, len)}</g>`);
      return (
        `<defs>${rad("glow", k, 0.05, 0.55, 0.5, 0.45)}</defs>` +
        Array.from({ length: 24 }, (_, i) => `<path d="M50 50 L49.3 3 L50.7 3Z" transform="rotate(${i * 15} 50 50)" fill="${k(i % 2 ? 0.25 : 0.45)}"/>`).join("") +
        pair(38, 4, 34) + // two over the head
        pair(-30, 4, 34) + // two over the feet
        pair(4, 5, 44) + // two to fly
        `<circle cx="50" cy="49" r="9.5" fill="url(#glow)" stroke="${k(1)}" stroke-width="1.1"/>` +
        `<path d="M45 48.5 Q47 50 49 48.5 M51 48.5 Q53 50 55 48.5" stroke="${k(1)}" stroke-width="0.9" fill="none"/>` +
        `<path d="M50 49 L50 52.5 M48.2 54.6 L51.8 54.6" stroke="${k(0.9)}" stroke-width="0.8"/>` +
        `<circle cx="50" cy="49" r="12.5" fill="none" stroke="${k(0.85)}" stroke-width="1" stroke-dasharray="1.4 1.6"/>`
      );
    },
  },

  // The eye with wings: the watchful living creatures, "full of eyes before and behind" (Revelation 4:6-8).
  "winged-eye": {
    w: 120,
    h: 100,
    title: "Winged eye",
    draw: (k) =>
      `<defs>${rad("iris", k, 0.4, 0.95, 0.4, 0.4)}</defs>` +
      mirror(120, `<g transform="rotate(16 44 50)">${wing(44, 44, k, 5, 46)}</g><g transform="rotate(-28 44 54)">${wing(44, 54, k, 3, 28)}</g>`) +
      Array.from({ length: 13 }, (_, i) => `<path d="M60 50 L59.3 14 L60.7 14Z" transform="rotate(${-72 + i * 12} 60 50)" fill="${k(0.45)}"/>`).join("") +
      `<ellipse cx="60" cy="50" rx="19" ry="12.5" fill="${k(0)}"/>` +
      eye(k, 60, 50, 34, "iris"),
  },

  // "Their rings were full of eyes round about them four", "a wheel in the middle of a wheel" (Ezekiel 1:16-18).
  ophan: {
    w: 100,
    h: 100,
    title: "Ophan",
    draw: (k) => {
      const ring = (rx: number, ry: number, rot: number, eyes: number, w: number) => {
        let out = `<ellipse cx="50" cy="50" rx="${rx}" ry="${ry}" transform="rotate(${rot} 50 50)" fill="none" stroke="${k(0.95)}" stroke-width="5"/><ellipse cx="50" cy="50" rx="${rx}" ry="${ry}" transform="rotate(${rot} 50 50)" fill="none" stroke="${k(0.3)}" stroke-width="1.2"/>`;
        for (let i = 0; i < eyes; i++) {
          const t = (i / eyes) * Math.PI * 2;
          const r = (rot * Math.PI) / 180;
          const ex = rx * Math.cos(t), ey = ry * Math.sin(t);
          const x = 50 + ex * Math.cos(r) - ey * Math.sin(r), y = 50 + ex * Math.sin(r) + ey * Math.cos(r);
          out += eye(k, x, y, w, "iris");
        }
        return out;
      };
      const flames = Array.from({ length: 14 }, (_, i) => `<path d="M50 6 C47 10 48 13 50 16 C52 13 53 10 50 6Z" transform="rotate(${i * 25.7} 50 50)" fill="${k(0.55)}"/>`).join("");
      return (
        `<defs>${rad("iris", k, 0.35, 0.95, 0.4, 0.4)}</defs>` +
        flames +
        ring(38, 38, 0, 10, 6.4) +
        ring(38, 14, 60, 6, 5.4) +
        ring(38, 14, -60, 6, 5.4) +
        `<circle cx="50" cy="50" r="5.5" fill="${k(0.95)}"/>` +
        eye(k, 50, 50, 9, "iris")
      );
    },
  },

  // A crucifix: the Latin cross with the body and the title over the head.
  crucifix: {
    w: 80,
    h: 100,
    title: "Crucifix",
    draw: (k) =>
      latinCross(k) +
      `<rect x="31" y="9" width="18" height="7" fill="${k(0.15)}" stroke="${k(0.9)}" stroke-width="0.8"/>` +
      `<text x="40" y="14.6" text-anchor="middle" font-family="${SERIF}" font-size="5" fill="${k(0.95)}">INRI</text>` +
      `<circle cx="40" cy="24" r="4.4" fill="${k(0.2)}" stroke="${k(0.95)}" stroke-width="1"/>` +
      `<path d="M15 30 C24 32 32 31 36 33 L44 33 C48 31 56 32 65 30 L65 33 C56 35 48 35 45 37 L44 56 L36 56 L35 37 C32 35 24 35 15 33 Z" fill="${k(0.15)}" stroke="${k(0.95)}" stroke-width="0.9"/>` +
      `<path d="M35 54 L45 54 L44 62 L36 62 Z" fill="${k(0.4)}" stroke="${k(0.95)}" stroke-width="0.8"/>` +
      `<path d="M37 62 L39 84 L41 84 L43 62" fill="${k(0.15)}" stroke="${k(0.95)}" stroke-width="0.9"/>`,
  },

  // St Peter's cross: the Latin cross turned over, as he asked to be crucified.
  petrine: {
    w: 80,
    h: 100,
    title: "St Peter's cross",
    draw: (k) => latinCross(k, true),
  },

  // Ichthys: two arcs crossing at the tail.
  ichthys: {
    w: 100,
    h: 60,
    title: "Ichthys",
    draw: (k) =>
      `<path d="M6 30 C28 4 64 4 94 46 M6 30 C28 56 64 56 94 14" fill="none" stroke="${k(0.95)}" stroke-width="5" stroke-linecap="round"/>` +
      `<circle cx="24" cy="26" r="2.4" fill="${k(0.95)}"/>`,
  },

  // The pentagram, point up: health to the Pythagoreans, the pentalpha on Solomon's ring.
  pentagram: {
    w: 100,
    h: 100,
    title: "Pentagram",
    draw: (k) => star(k),
  },

  // The pentagram point down, as Lévi read it in the 1850s.
  "pentagram-inverted": {
    w: 100,
    h: 100,
    title: "Inverted pentagram",
    draw: (k) => star(k, true),
  },

  // Two triangles interlaced: the seal of Solomon, the Star of David.
  hexagram: {
    w: 100,
    h: 100,
    title: "Hexagram",
    draw: (k) =>
      `<path d="M50 8 L88 74 L12 74 Z" fill="none" stroke="${k(0.95)}" stroke-width="4.5" stroke-linejoin="miter"/>` +
      `<path d="M50 92 L12 26 L88 26 Z" fill="none" stroke="${k(0.95)}" stroke-width="4.5" stroke-linejoin="miter"/>` +
      `<path d="M50 8 L88 74 L12 74 Z M50 92 L12 26 L88 26 Z" fill="none" stroke="${k(0.3)}" stroke-width="1"/>`,
  },

  // The eye of Providence: an eye in a triangle, in rays.
  eye: {
    w: 100,
    h: 100,
    title: "Eye of Providence",
    draw: (k) => {
      let rays = "";
      for (let i = 0; i < 28; i++) rays += `<path d="M50 60 L48.9 6 L51.1 6 Z" transform="rotate(${(i / 28) * 360} 50 60)" fill="${k(i % 2 ? 0.4 : 0.75)}"/>`;
      return (
        `<defs>${rad("glow", k, 0, 0.15, 0.5, 0.6)}${rad("iris", k, 0.4, 0.95, 0.4, 0.4)}</defs>` +
        rays +
        `<path d="M50 22 L86 84 L14 84 Z" fill="url(#glow)" stroke="${k(1)}" stroke-width="3" stroke-linejoin="round"/>` +
        eye(k, 50, 64, 28, "iris")
      );
    },
  },

  // The square and compasses: the builder's tools, the compasses' points over the square.
  "square-compasses": {
    w: 100,
    h: 100,
    title: "Square and compasses",
    draw: (k) =>
      `<defs>${lin("steel", k, [0.95, 0.55, 0.9], "x")}</defs>` +
      `<path d="M47 14 L18 86 L24 88 L50 24 L76 88 L82 86 L53 14 Z" fill="url(#steel)" stroke="${k(0.95)}" stroke-width="0.8"/>` +
      `<circle cx="50" cy="15" r="5" fill="${k(0.2)}" stroke="${k(0.95)}" stroke-width="2"/>` +
      `<path d="M12 52 L50 88 L88 52 L82 47 L50 77 L18 47 Z" fill="${k(0.9)}" stroke="${k(0.95)}" stroke-width="0.8"/>` +
      `<path d="M18 50 L50 80 L82 50" fill="none" stroke="${k(0.35)}" stroke-width="0.8"/>`,
  },
};

export const ORNAMENTS: Readonly<Record<OrnamentName, Pick<Drawing, "w" | "h" | "title">>> = DRAWINGS;

/** The emblem of each Gospel. */
export const EVANGELIST: Record<string, OrnamentName> = { Matt: "angel", Mark: "lion", Luke: "ox", John: "eagle" };

/**
 * The ornament as an SVG data URL in grays for the scheme. Rasterised large
 * (four times its drawing units) so Dither samples it smoothly at any size.
 */
export function ornamentSrc(name: OrnamentName, dark: boolean): string {
  const d = DRAWINGS[name];
  const k: Ink = (density) => {
    const x = Math.max(0, Math.min(1, density));
    const v = Math.round(255 * (dark ? x : 1 - x));
    return `rgb(${v},${v},${v})`;
  };
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${d.w} ${d.h}" width="${d.w * 4}" height="${d.h * 4}">` +
    `<rect width="${d.w}" height="${d.h}" fill="${k(0)}"/>${d.draw(k)}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
