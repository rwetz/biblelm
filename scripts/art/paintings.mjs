// Paintings: Caravaggio and the painters of his light (Rembrandt, Honthorst,
// Georges de La Tour), each tied to the passage it depicts. Unlike the Doré
// plates these are oil paintings in colour (and two Rembrandt etchings), so
// they are kept as they are: resized, never levelled, sharpened or regraded.
// The app lays its dots over them live and only in part (src/art/painting.ts),
// so the painting itself is what you see where it matters.
//
//   node scripts/art/paintings.mjs            # download + process
//   node scripts/art/paintings.mjs --process  # reprocess cached downloads only
//
// Sources are Wikimedia Commons files of public-domain works (PD-Art: a
// faithful photograph of a 2D public-domain work is itself public domain in
// the US). Where a museum releases its own scan as CC0 (the Met, the
// Rijksmuseum) that scan is the one used, and the licence says so. Downloads
// are cached in art-src/paintings/; credits go to docs/painting-credits.md.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { ROOT } from "../data/lib.mjs";

const SRC = join(ROOT, "art-src", "paintings");
const OUT = join(ROOT, "public", "art", "paintings");
const UA = { "User-Agent": "BibleLM art build (+https://github.com/rwetz/biblelm; rwetz00 at gmail)" };

const CARAVAGGIO = "Caravaggio";
const REMBRANDT = "Rembrandt";

/**
 * The catalogue. `ref` is the verse the painting shows; `place` where it
 * hangs (Italy's state museums restrict commercial reproduction under their
 * Cultural Heritage Code, so `place` is kept for anyone who sells a build).
 */
export const PAINTINGS = [
  // Caravaggio (1571-1610)
  { id: "calling-of-matthew", title: "The Calling of Saint Matthew", artist: CARAVAGGIO, year: "1599-1600", ref: "Matt.9.9", place: "San Luigi dei Francesi, Rome", file: "The Calling of Saint Matthew-Caravaggo (1599-1600).jpg" },
  { id: "supper-at-emmaus", title: "Supper at Emmaus", artist: CARAVAGGIO, year: "1601", ref: "Luke.24.30-31", place: "National Gallery, London", file: "Supper at Emmaus-Caravaggio (1601).jpg" },
  { id: "taking-of-christ", title: "The Taking of Christ", artist: CARAVAGGIO, year: "c. 1602", ref: "Matt.26.49-50", place: "National Gallery of Ireland, Dublin", file: "The Taking of Christ-Caravaggio (c.1602).jpg" },
  { id: "incredulity-of-thomas", title: "The Incredulity of Saint Thomas", artist: CARAVAGGIO, year: "1601-02", ref: "John.20.27", place: "Sanssouci, Potsdam", file: "The Incredulity of Saint Thomas-Caravaggio (1601-2).jpg" },
  { id: "conversion-of-paul", title: "The Conversion on the Way to Damascus", artist: CARAVAGGIO, year: "1600-01", ref: "Acts.9.3-4", place: "Santa Maria del Popolo, Rome", file: "Conversion on the Way to Damascus-Caravaggio (c.1600-1).jpg" },
  { id: "sacrifice-of-isaac", title: "The Sacrifice of Isaac", artist: CARAVAGGIO, year: "1603", ref: "Gen.22.10-12", place: "Uffizi, Florence", file: "Sacrifice of Isaac-Caravaggio (Uffizi).jpg" },
  { id: "david-and-goliath", title: "David with the Head of Goliath", artist: CARAVAGGIO, year: "1610", ref: "1Sam.17.51", place: "Galleria Borghese, Rome", file: "David with the Head of Goliath-Caravaggio (1610).jpg" },
  { id: "raising-of-lazarus", title: "The Raising of Lazarus", artist: CARAVAGGIO, year: "1609", ref: "John.11.43-44", place: "Museo Regionale, Messina", file: "The Raising of Lazarus-Caravaggio (c. 1609).jpg" },
  { id: "entombment", title: "The Entombment of Christ", artist: CARAVAGGIO, year: "1602-03", ref: "John.19.40", place: "Vatican Museums", file: "The Entombment of Christ-Caravaggio (c.1602-3).jpg" },
  { id: "denial-of-peter", title: "The Denial of Saint Peter", artist: CARAVAGGIO, year: "1610", ref: "Matt.26.69-70", place: "The Metropolitan Museum of Art, New York", file: "The Denial of Saint Peter MET DP-12413-001.jpg", licence: "CC0 (The Met Open Access)" },
  { id: "seven-works-of-mercy", title: "The Seven Works of Mercy", artist: CARAVAGGIO, year: "1607", ref: "Matt.25.35-36", place: "Pio Monte della Misericordia, Naples", file: "The Seven Works of Mercy-Caravaggio (1607).jpg" },
  { id: "judith-and-holofernes", title: "Judith Beheading Holofernes", artist: CARAVAGGIO, year: "1598-99", ref: "Jdt.13.8", place: "Palazzo Barberini, Rome", file: "Judith Beheading Holofernes-Caravaggio (c.1598-9).jpg" },
  { id: "jerome-writing", title: "Saint Jerome Writing", artist: CARAVAGGIO, year: "1605-06", ref: null, about: "Jerome translating the Scriptures into Latin: the Vulgate", place: "Galleria Borghese, Rome", file: "Saint Jerome Writing-Caravaggio (1605-6).jpg" },
  // Rembrandt (1606-1669), the north's master of the same light
  { id: "jeremiah-lamenting", title: "Jeremiah Lamenting the Destruction of Jerusalem", artist: REMBRANDT, year: "1630", ref: "Lam.1.1", place: "Rijksmuseum, Amsterdam", file: "Jeremia treurend over de verwoesting van Jeruzalem Rijksmuseum SK-A-3276.jpeg", licence: "CC0 (Rijksmuseum)" },
  { id: "rembrandt-denial-of-peter", title: "The Denial of Peter", artist: REMBRANDT, year: "1660", ref: "Luke.22.61", place: "Rijksmuseum, Amsterdam", file: "De verloochening van Petrus Rijksmuseum SK-A-3137.jpeg", licence: "CC0 (Rijksmuseum)" },
  { id: "belshazzars-feast", title: "Belshazzar's Feast", artist: REMBRANDT, year: "c. 1636-38", ref: "Dan.5.5", place: "National Gallery, London", file: "Rembrandt-Belsazar.jpg" },
  { id: "prodigal-son", title: "The Return of the Prodigal Son", artist: REMBRANDT, year: "c. 1668", ref: "Luke.15.20", place: "Hermitage, Saint Petersburg", file: "Rembrandt Harmensz. van Rijn - The Return of the Prodigal Son.jpg" },
  { id: "storm-on-galilee", title: "The Storm on the Sea of Galilee", artist: REMBRANDT, year: "1633", ref: "Mark.4.37-38", place: "Stolen in 1990 from the Isabella Stewart Gardner Museum, Boston", file: "Rembrandt Christ in the Storm on the Lake of Galilee.jpg" },
  { id: "moses-tablets", title: "Moses with the Ten Commandments", artist: REMBRANDT, year: "1659", ref: "Exod.32.19", place: "Gemäldegalerie, Berlin", file: "Rembrandt - Moses with the Ten Commandments - Google Art Project.jpg" },
  { id: "jacob-wrestling", title: "Jacob Wrestling with the Angel", artist: REMBRANDT, year: "c. 1659", ref: "Gen.32.24", place: "Gemäldegalerie, Berlin", file: "Rembrandt - Jacob Wrestling with the Angel - Google Art Project.jpg" },
  { id: "simeon-in-the-temple", title: "Simeon's Song of Praise", artist: REMBRANDT, year: "1631", ref: "Luke.2.28-29", place: "Mauritshuis, The Hague", file: "Het loflied van Simeon, Rembrandt van Rijn, 1631, Mauritshuis, The Hague.jpg" },
  { id: "three-crosses", title: "The Three Crosses", artist: REMBRANDT, year: "1653", ref: "Luke.23.33", place: "The Metropolitan Museum of Art, New York", file: "Christ Crucified between the Two Thieves- The Three Crosses MET MM9567.jpg", licence: "CC0 (The Met Open Access)", medium: "etching" },
  { id: "hundred-guilder-print", title: "Christ Healing the Sick (The Hundred Guilder Print)", artist: REMBRANDT, year: "c. 1648", ref: "Matt.19.13-14", place: "The Metropolitan Museum of Art, New York", file: "The Hundred Guilder Print MET DP230429.jpg", licence: "CC0 (The Met Open Access)", medium: "etching" },
  // Caravaggio's followers
  { id: "christ-before-the-high-priest", title: "Christ before the High Priest", artist: "Gerrit van Honthorst", year: "c. 1617", ref: "Matt.26.63", place: "National Gallery, London", file: "Gerard van Honthorst - Christ before the High Priest - WGA11650.jpg" },
  { id: "dream-of-joseph", title: "The Dream of Saint Joseph", artist: "Georges de La Tour", year: "c. 1640", ref: "Matt.1.20", place: "Musée d'Arts, Nantes", file: "Le Songe de saint Joseph de Georges de La Tour - Musée d'Art de Nantes.jpg" },
];

const WIDTH = 2000; // long side of the shown painting: a 2x hero up to 1000 css px tall
const THUMB = 520;

/** "Matt.26.69-70" -> { book, chapter, verse, verseEnd } */
function parseRef(s) {
  if (!s) return null;
  const m = /^([1-4]?[A-Za-z]+)\.(\d+)\.(\d+)(?:-(\d+))?$/.exec(s);
  if (!m) throw new Error(`bad ref ${s}`);
  return { book: m[1], chapter: +m[2], verse: +m[3], ...(m[4] ? { verseEnd: +m[4] } : {}) };
}

async function info(file) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(`File:${file}`)}&prop=imageinfo&iiprop=url|size|extmetadata&iiurlwidth=2400&format=json&formatversion=2`;
  const page = (await (await fetch(url, { headers: UA })).json()).query.pages[0];
  if (page.missing || !page.imageinfo) throw new Error(`missing on Commons: ${file}`);
  const ii = page.imageinfo[0];
  const meta = ii.extmetadata ?? {};
  return {
    url: ii.thumburl ?? ii.url,
    page: ii.descriptionurl,
    licence: meta.LicenseShortName?.value ?? "Public domain",
  };
}

async function download(p) {
  const img = join(SRC, `${p.id}.img`);
  const metaFile = join(SRC, `${p.id}.json`);
  if (existsSync(img) && existsSync(metaFile)) return JSON.parse(readFileSync(metaFile, "utf8"));
  const i = await info(p.file);
  console.log(`  fetch ${p.id}`);
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(i.url, { headers: UA });
    if (res.ok) {
      writeFileSync(img, Buffer.from(await res.arrayBuffer()));
      break;
    }
    if (attempt >= 3 || res.status !== 429) throw new Error(`${p.id}: HTTP ${res.status}`);
    await new Promise((r) => setTimeout(r, 4000 * (attempt + 1)));
  }
  writeFileSync(metaFile, JSON.stringify(i));
  return i;
}

/**
 * What the picture is made of, measured on a small copy: whether it is in
 * colour (an etching is not, however yellow its paper), how dark it is, and
 * where its light falls (the centroid of its brightest tenth), which becomes
 * the focus of every crop and the place the reveal begins.
 */
async function measure(buf, medium) {
  const { data, info } = await sharp(buf).resize({ width: 160, height: 160, fit: "inside" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const n = info.width * info.height;
  const lum = new Float32Array(n);
  let chroma = 0;
  for (let i = 0; i < n; i++) {
    const r = data[i * 3], g = data[i * 3 + 1], b = data[i * 3 + 2];
    lum[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    chroma += Math.max(r, g, b) - Math.min(r, g, b);
  }
  // Old paper is warm, not coloured: a print's chroma is one even tint, a
  // painting's runs from its neutral ground up to its reds and blues.
  const spread = Array.from({ length: n }, (_, i) => Math.max(data[i * 3], data[i * 3 + 1], data[i * 3 + 2]) - Math.min(data[i * 3], data[i * 3 + 1], data[i * 3 + 2])).sort((a, b) => a - b);
  const colour = spread[Math.floor(n * 0.98)] - spread[n >> 1] > 25;
  const sorted = Float32Array.from(lum).sort();
  const cut = sorted[Math.floor(n * 0.9)];
  let sx = 0, sy = 0, c = 0;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (lum[y * info.width + x] >= cut) {
        sx += x;
        sy += y;
        c++;
      }
  const mean = lum.reduce((a, b) => a + b, 0) / n;
  return {
    colour: colour && medium !== "etching",
    chroma: Math.round(chroma / n),
    key: Math.round(mean),
    lightX: Math.round((sx / c / info.width) * 100),
    lightY: Math.round((sy / c / info.height) * 100),
  };
}

async function main() {
  const processOnly = process.argv.includes("--process");
  mkdirSync(SRC, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  const out = [];
  const credits = [];
  for (const p of PAINTINGS) {
    let src;
    try {
      src = processOnly ? JSON.parse(readFileSync(join(SRC, `${p.id}.json`), "utf8")) : await download(p);
    } catch (e) {
      console.log(`  skip ${p.id}: ${e.message}`);
      continue;
    }
    const buf = readFileSync(join(SRC, `${p.id}.img`));
    const m = await measure(buf, p.medium);
    // Keep the painting as painted: sRGB, resized, nothing else. An etching
    // keeps its paper too; only its colour channels go, so the theme can tint it.
    const base = () => sharp(buf).rotate().toColourspace("srgb");
    const shown = await (m.colour ? base() : base().grayscale())
      .resize({ width: WIDTH, height: WIDTH, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 84, mozjpeg: true, chromaSubsampling: "4:4:4" })
      .toBuffer({ resolveWithObject: true });
    const file = `${p.id}.jpg`;
    writeFileSync(join(OUT, file), shown.data);
    const thumb = await (m.colour ? base() : base().grayscale())
      .resize({ width: THUMB, height: THUMB, fit: "inside" })
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
    const thumbFile = `${p.id}-thumb.jpg`;
    writeFileSync(join(OUT, thumbFile), thumb.data);
    const licence = p.licence ?? `${src.licence} (PD-Art)`;
    out.push({
      id: p.id,
      title: p.title,
      artist: p.artist,
      year: p.year,
      ref: parseRef(p.ref),
      ...(p.about ? { about: p.about } : {}),
      medium: p.medium ?? "oil on canvas",
      place: p.place,
      colour: m.colour,
      key: m.key,
      focusX: m.lightX,
      focusY: m.lightY,
      source: src.page,
      licence,
      full: { file, width: shown.info.width, height: shown.info.height },
      thumb: { file: thumbFile, width: thumb.info.width, height: thumb.info.height },
    });
    credits.push(`| ${p.title} | ${p.artist}, ${p.year} | ${p.ref ?? "-"} | ${p.place} | ${licence} | [Commons](${src.page}) |`);
    console.log(`  ${p.id} ${m.colour ? "colour" : "mono"} key ${m.key} light ${m.lightX},${m.lightY} ${shown.info.width}x${shown.info.height}`);
  }
  writeFileSync(join(OUT, "paintings.json"), JSON.stringify(out));
  writeFileSync(
    join(ROOT, "docs", "painting-credits.md"),
    `# Painting credits\n\nOil paintings and etchings by Caravaggio, Rembrandt and their followers, all long in the public domain.\n` +
      `Images from Wikimedia Commons (PD-Art: a faithful photograph of a 2D public-domain work is public domain in the US),\n` +
      `or the museum's own CC0 release where it made one. Several hang in Italian state museums, whose Cultural Heritage Code\n` +
      `restricts commercial reproduction there; check before selling a build.\n` +
      `Generated by \`scripts/art/paintings.mjs\`; do not edit by hand.\n\n` +
      `| Painting | Artist | Passage | Where it hangs | Licence | Source |\n|---|---|---|---|---|---|\n${credits.join("\n")}\n`,
  );
  console.log(`  ${out.length} paintings`);
}

await main();
