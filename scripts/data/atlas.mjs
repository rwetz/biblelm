// The Atlas: places, people and the land they lived in.
//
//   node scripts/data/atlas.mjs      (after build-bible.mjs: needs refs.json)
//
// Sources, parsed as text, never executed:
//   Places  OpenBible.info Bible Geocoding Data (CC BY 4.0): every place in the
//           Protestant Bible with its likeliest modern location and its verses.
//   People  STEPBible TIPNR, Translators Individualised Proper Names (CC BY 4.0,
//           Tyndale House): every named person, their family and all their verses.
//   Land    Natural Earth 1:50m land, rivers and lakes (public domain), clipped
//           to the lands of the Bible.
//
// Outputs (public/data): places.json, people.json, land.json.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { OUT, cached, kb, stepBook, writeJson } from "./lib.mjs";

const GEO = "https://raw.githubusercontent.com/openbibleinfo/Bible-Geocoding-Data/main/data/ancient.jsonl";
const TIPNR = "https://raw.githubusercontent.com/STEPBible/STEPBible-Data/master/Proper%20Nouns/TIPNR%20-%20Translators%20Individualised%20Proper%20Names%20with%20all%20References%20-%20STEPBible.org%20CC%20BY.txt";
const NE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";

// From Rome and Spain (Paul's last journeys) to Persia and Ur.
const BBOX = { w: 8, s: 21, e: 54, n: 44 };

const refs = JSON.parse(readFileSync(join(OUT, "refs.json"), "utf8"));
const idx = new Map(refs.map((r, i) => [r, i]));

/** "Gen.46.10; Exo.6.15-16" (STEPBible book codes) -> verse indices. */
function stepRefs(s) {
  const out = [];
  for (const tok of s.split(/[;,]\s*/)) {
    const m = /^([1-3]?[A-Za-z]{2,3})\.(\d+)\.(\d+)(?:-(\d+))?/.exec(tok.trim());
    if (!m) continue;
    const osis = stepBook(m[1]);
    if (!osis) continue;
    for (let v = +m[3]; v <= +(m[4] ?? m[3]); v++) {
      const i = idx.get(`${osis}.${m[2]}.${v}`);
      if (i !== undefined) out.push(i);
    }
  }
  return [...new Set(out)].sort((a, b) => a - b);
}

async function places() {
  const text = (await cached(GEO, "geo/ancient.jsonl")).toString("utf8");
  const out = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const p = JSON.parse(line);
    // The likeliest identification first (OpenBible orders them by confidence).
    const ident = (p.identifications ?? []).find((x) => x.resolutions?.some((r) => r.lonlat));
    const res = ident?.resolutions.find((r) => r.lonlat);
    if (!res) continue;
    const [lon, lat] = res.lonlat.split(",").map(Number);
    const verses = [...new Set((p.verses ?? []).map((v) => idx.get(v.osis)).filter((i) => i !== undefined))].sort((a, b) => a - b);
    if (!verses.length) continue;
    // 0..1: how sure the identification is (OpenBible's 0..1000 score).
    const sure = Math.round((ident.score?.vote_average ?? 500) / 10) / 100;
    out.push({
      id: p.id,
      name: p.friendly_id,
      type: (p.types ?? [])[0] ?? "settlement",
      lon: Math.round(lon * 1000) / 1000,
      lat: Math.round(lat * 1000) / 1000,
      sure,
      modern: ident.description?.replace(/<[^>]+>/g, "").slice(0, 120) ?? "",
      verses,
    });
  }
  out.sort((a, b) => b.verses.length - a.verses.length);
  const p = writeJson("places.json", out);
  console.log(`  places ${out.length} ${kb(p)}`);
}

/** TIPNR's "living at the time of ..." folded into the timeline's eras (src/lib/people.ts). */
function eraOf(desc) {
  const d = desc.replace(/\s+-\s.*$/, "");
  if (/before the Flood/i.test(d)) return "Before the Flood";
  if (/before Israel's Monarchy|Conquest/i.test(d) && !/Egypt/i.test(d)) return "Conquest and Judges";
  for (const e of ["Patriarchs", "Egypt and Wilderness", "United Monarchy", "Divided Monarchy", "Exile and Return", "New Testament"]) if (d.includes(e)) return e;
  return "";
}

async function people() {
  const text = (await cached(TIPNR, "stepbible/tipnr.txt")).toString("utf8");
  // Records start at "$==========" headers of every kind (people, then places
  // and others); keep the people, each ending where the next record begins.
  const records = text
    .split(/\r?\n\$=+\s*/)
    .filter((r) => r.startsWith("PERSON"))
    .map((r) => r.slice(r.indexOf("\n") + 1));
  const strip = (s) => s.replace(/\([a-z?]\)/g, "").trim();
  const list = [];
  const byUnified = new Map();
  for (const rec of records) {
    const lines = rec.split(/\r?\n/);
    const head = lines[0].split("\t");
    const [unified, ustrong] = head[0].split("=");
    if (!unified || !ustrong || !unified.includes("@")) continue;
    // Every form of the name has its own exhaustive list (the Total line abbreviates).
    const forms = lines.filter((l) => l.startsWith("– ") && !l.startsWith("– Total")).map((l) => l.split("\t")[4] ?? "");
    const brief = lines.find((l) => l.startsWith("@Brief="))?.slice(7).trim() ?? "";
    const era = eraOf(head[1] ?? "");
    const names = (s) => (s ?? "").split(/,\s*|\s\+\s*/).map(strip).filter((x) => x.includes("@"));
    const person = {
      id: ustrong.trim(),
      unified: unified.trim(),
      name: unified.split("@")[0].trim(),
      sex: /female/i.test(head[8] ?? "") ? "f" : /male/i.test(head[8] ?? "") ? "m" : "",
      era,
      // The column holds ">" (a spreadsheet marker) when there is no tribe.
      tribe: /[a-z]/i.test(head[6] ?? "") ? head[6].trim() : "",
      brief,
      parents: names(head[2]),
      siblings: names(head[3]),
      partners: names(head[4]),
      children: names(head[5]),
      verses: stepRefs(forms.join("; ")),
    };
    if (!person.verses.length) continue;
    list.push(person);
    byUnified.set(person.unified, person.id);
  }
  // Family links by id; names that are not records (an unnamed "wife of") drop out.
  const link = (xs) => [...new Set(xs.map((u) => byUnified.get(u)).filter(Boolean))];
  const out = list.map(({ unified: _u, ...p }) => ({
    ...p,
    parents: link(p.parents),
    siblings: link(p.siblings),
    partners: link(p.partners),
    children: link(p.children),
  }));
  out.sort((a, b) => b.verses.length - a.verses.length);
  const p = writeJson("people.json", out);
  console.log(`  people ${out.length} ${kb(p)}`);
}

// ── the land ────────────────────────────────────────────────────────────────

const inside = (p, edge) => (edge === 0 ? p[0] >= BBOX.w : edge === 1 ? p[0] <= BBOX.e : edge === 2 ? p[1] >= BBOX.s : p[1] <= BBOX.n);
function cross(a, b, edge) {
  const v = [BBOX.w, BBOX.e, BBOX.s, BBOX.n][edge];
  if (edge < 2) {
    const t = (v - a[0]) / (b[0] - a[0]);
    return [v, a[1] + t * (b[1] - a[1])];
  }
  const t = (v - a[1]) / (b[1] - a[1]);
  return [a[0] + t * (b[0] - a[0]), v];
}
/** Sutherland-Hodgman: a ring clipped to the box. */
function clipRing(ring) {
  let out = ring;
  for (let edge = 0; edge < 4 && out.length; edge++) {
    const input = out;
    out = [];
    for (let i = 0; i < input.length; i++) {
      const a = input[(i + input.length - 1) % input.length], b = input[i];
      if (inside(b, edge)) {
        if (!inside(a, edge)) out.push(cross(a, b, edge));
        out.push(b);
      } else if (inside(a, edge)) out.push(cross(a, b, edge));
    }
  }
  return out;
}
/** A line split into the runs that lie inside the box. */
function clipLine(line) {
  const runs = [];
  let cur = [];
  for (const p of line) {
    if (p[0] >= BBOX.w && p[0] <= BBOX.e && p[1] >= BBOX.s && p[1] <= BBOX.n) cur.push(p);
    else if (cur.length) {
      runs.push(cur);
      cur = [];
    }
  }
  if (cur.length) runs.push(cur);
  return runs.filter((r) => r.length > 1);
}
const round = (pts) => {
  const out = [];
  for (const p of pts) {
    const q = [Math.round(p[0] * 100) / 100, Math.round(p[1] * 100) / 100];
    const last = out[out.length - 1];
    if (!last || last[0] !== q[0] || last[1] !== q[1]) out.push(q);
  }
  return out;
};
const polys = (g) => (g.type === "Polygon" ? [g.coordinates] : g.type === "MultiPolygon" ? g.coordinates : []);
const lines = (g) => (g.type === "LineString" ? [g.coordinates] : g.type === "MultiLineString" ? g.coordinates : []);

async function land() {
  const get = async (name) => JSON.parse((await cached(`${NE}/${name}.geojson`, `geo/${name}.geojson`)).toString("utf8"));
  const landJ = await get("ne_50m_land");
  const lakesJ = await get("ne_50m_lakes");
  const riversJ = await get("ne_50m_rivers_lake_centerlines");
  const rings = (fc) =>
    fc.features.flatMap((f) => polys(f.geometry).map((poly) => round(clipRing(poly[0])))).filter((r) => r.length > 3);
  const out = {
    bbox: BBOX,
    land: rings(landJ),
    lakes: rings(lakesJ),
    rivers: riversJ.features
      .filter((f) => (f.properties?.scalerank ?? 9) <= 6)
      .flatMap((f) => lines(f.geometry).flatMap(clipLine).map((l) => ({ name: f.properties?.name ?? "", line: round(l) })))
      .filter((r) => r.line.length > 1),
  };
  const p = writeJson("land.json", out);
  console.log(`  land ${out.land.length} rings, ${out.rivers.length} rivers ${kb(p)}`);
}

console.log("atlas");
await places();
await people();
await land();
