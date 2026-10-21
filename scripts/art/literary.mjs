// The Lab's heroes: Doré's plates for the great religious poems rather than
// for Scripture (Milton's Paradise Lost, 1866; Coleridge's Rime of the Ancient
// Mariner, 1876). The Lab is the study of the machine, not of the text, so its
// pictures come from beside the Bible, not from it. They rotate on a timer.
//
//   node scripts/art/literary.mjs        (downloads to art-src/literary/)
//
// Images from Wikimedia Commons, public domain (Doré died in 1883). Each gets
// a grayscale tone JPEG like the Home heroes (scripts/art/heroes.mjs); the app
// dithers it live at the size it is drawn.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import sharp from "sharp";
import { ROOT } from "../data/lib.mjs";

const SRC = join(ROOT, "art-src", "literary");
const OUT = join(ROOT, "public", "art", "heroes");
const UA = { "User-Agent": "BibleLM art build (+https://github.com/rwetz/biblelm; rwetz00 at gmail)" };
const TONE_WIDTH = 1200;
const MEAN = 118; // the average tone every plate is brought to

/** Commons file, title shown in the caption, the work, and where the picture's weight sits (percent from the top). */
const LITERARY = [
  { file: "Paradise Lost 10.jpg", title: "The Heavenly Host", work: "Paradise Lost", focusY: 30 },
  { file: "Paradise Lost 12.jpg", title: "Satan's Flight Toward the Light", work: "Paradise Lost", focusY: 45 },
  { file: "Paradise Lost 24.jpg", title: "The War in Heaven", work: "Paradise Lost", focusY: 40 },
  { file: "Paradise Lost 1.jpg", title: "The Fall of the Rebel Angels", work: "Paradise Lost", focusY: 25 },
  { file: "Paradise Lost 31.jpg", title: "The Fifth Day of Creation", work: "Paradise Lost", focusY: 40 },
  { file: "Der Alte Matrose b 07.jpg", title: "The Ice Was All Around", work: "The Rime of the Ancient Mariner", focusY: 45 },
  { file: "Der Alte Matrose b 09.jpg", title: "The Albatross", work: "The Rime of the Ancient Mariner", focusY: 30 },
  { file: "Der Alte Matrose b 20.jpg", title: "The Moving Moon Went Up the Sky", work: "The Rime of the Ancient Mariner", focusY: 40 },
  { file: "Der Alte Matrose b 29.jpg", title: "The Seraph-Band", work: "The Rime of the Ancient Mariner", focusY: 40 },
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));

async function fetchOnce(url) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(url, { headers: UA });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    if (res.status !== 429) throw new Error(`${res.status} ${url}`);
    await wait(15000 * (attempt + 1)); // Commons rate-limits bursts
  }
  throw new Error(`rate limited: ${url}`);
}

async function main() {
  mkdirSync(SRC, { recursive: true });
  mkdirSync(OUT, { recursive: true });
  const done = [];
  for (const l of LITERARY) {
    const id = `lit-${slug(l.file.replace(/\.jpg$/, ""))}`;
    const cached = join(SRC, `${id}.img`);
    if (!existsSync(cached)) {
      const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(l.file.replace(/ /g, "_"))}`;
      writeFileSync(cached, await fetchOnce(url));
      await wait(1500);
    }
    const tone = `${id}-tone.jpg`;
    const { data, info: raw } = await sharp(readFileSync(cached))
      .grayscale()
      .resize({ width: TONE_WIDTH })
      .normalise({ lower: 1, upper: 96 })
      .raw()
      .toBuffer({ resolveWithObject: true });
    // The Mariner's night plates are mostly black: bend each plate's tones
    // so its average sits at MEAN, and every one dithers with the same weight.
    const mean = data.reduce((a, v) => a + v, 0) / data.length;
    const p = Math.log(MEAN / 255) / Math.log(Math.max(1, mean) / 255);
    for (let i = 0; i < data.length; i++) data[i] = Math.round(255 * (data[i] / 255) ** p);
    const info = await sharp(data, { raw: { width: raw.width, height: raw.height, channels: 1 } })
      .jpeg({ quality: 76, mozjpeg: true })
      .toFile(join(OUT, tone));
    done.push({
      id: `hero-${id}`,
      plate: id,
      title: l.title,
      work: l.work,
      focusY: l.focusY,
      algo: "atkinson",
      file: tone,
      tone,
      width: info.width,
      height: info.height,
      source: `https://commons.wikimedia.org/wiki/File:${l.file.replace(/ /g, "_")}`,
    });
    console.log(`  ${id} ${info.width}x${info.height}`);
  }
  writeFileSync(join(OUT, "literary.json"), JSON.stringify(done));
}

await main();
