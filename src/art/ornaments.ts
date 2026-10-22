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
  | "quill";

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
};

export const ORNAMENTS: Readonly<Record<OrnamentName, Pick<Drawing, "w" | "h" | "title">>> = DRAWINGS;

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
