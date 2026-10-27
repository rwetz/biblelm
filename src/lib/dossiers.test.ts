import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CURIOS, curio, curioRefs, FAMILIES, SYMBOLS, TAGS } from "./dossiers";
import { NUMBERS, OFFICERS, LODGE_PAINTINGS, LODGE_PLATES, RITES } from "./lodge";
import { studyRef } from "./studies";
import { ORNAMENTS } from "@/art/ornaments";

describe("dossiers and symbols", () => {
  it("are well formed: unique ids, a claim each, every reference parses, every mark drawn", () => {
    expect(new Set(CURIOS.map((c) => c.id)).size).toBe(CURIOS.length);
    for (const c of CURIOS) {
      if (c.kind === "dossier") expect(c.claims.length, c.id).toBeGreaterThan(0);
      for (const x of c.claims) expect(Object.keys(TAGS)).toContain(x.tag);
      if (c.mark) expect(ORNAMENTS[c.mark], c.id).toBeDefined();
      if (c.kind === "symbol") expect(c.mark ?? c.plates?.[0], c.id).toBeDefined();
    }
    expect(curioRefs().filter((r) => !studyRef(r))).toEqual([]);
  });

  it("uses no em dashes in anything a person reads", () => {
    expect(JSON.stringify(CURIOS)).not.toContain("—");
    expect(JSON.stringify([RITES, OFFICERS, NUMBERS])).not.toContain("—");
  });

  it("files every symbol in a family, with facts or claims, and every link resolves", () => {
    for (const c of SYMBOLS) {
      expect(c.family?.length, c.id).toBeGreaterThan(0);
      for (const f of c.family ?? []) expect(FAMILIES[f], c.id).toBeDefined();
      expect((c.data?.length ?? 0) + c.claims.length, c.id).toBeGreaterThan(0);
      for (const s of c.see ?? []) expect(curio(s), `${c.id} sees ${s}`).toBeDefined();
    }
    for (const o of OFFICERS) if (o.mark) expect(curio(o.mark)?.mark, o.name).toBeDefined();
    for (const x of NUMBERS) if (x.symbol) expect(curio(x.symbol), x.n).toBeDefined();
  });

  it("numbers the Scottish Rite 4 to 33, each once", () => {
    const nums = RITES.find((r) => r.id === "scottish")!.bodies.flatMap((b) => b.degrees.map((d) => d.n));
    expect(nums).toEqual(Array.from({ length: 30 }, (_, i) => i + 4));
  });

  it.skipIf(!existsSync("public/art/curios/paintings.json"))("shows only art that was built", () => {
    const paintings = new Set(JSON.parse(readFileSync("public/art/curios/paintings.json", "utf8")).map((p: { id: string }) => p.id));
    const plates = new Set(JSON.parse(readFileSync("public/art/curios/plates.json", "utf8")).map((p: { n: number }) => p.n));
    for (const id of [...LODGE_PAINTINGS, ...CURIOS.flatMap((c) => c.paintings ?? [])].filter((x) => !x.match(/^(raphael|botticelli|mouth)/))) expect(paintings.has(id), id).toBe(true);
    for (const n of [...LODGE_PLATES, ...CURIOS.flatMap((c) => c.plates ?? []).filter((n) => n >= 2000)]) expect(plates.has(n), String(n)).toBe(true);
  });

  it("tags every claim that quotes Scripture's own words with its verses", () => {
    for (const c of CURIOS) for (const x of c.claims) if (x.tag === "scripture") expect(x.refs?.length, `${c.id}: ${x.text}`).toBeGreaterThan(0);
  });

  it.skipIf(!existsSync("public/data/bible/james.json"))("points only at verses that exist", () => {
    const have = new Set<string>();
    for (const id of ["kjv", "enoch", "jubilees", "conybeare", "james"])
      for (const b of JSON.parse(readFileSync(`public/data/bible/${id}.json`, "utf8")).books) for (const c of b.chapters) for (const [v] of c.v) have.add(`${b.osis}.${c.c}.${v}`);
    const missing = curioRefs().flatMap((s) => {
      const r = studyRef(s)!;
      return Array.from({ length: (r.verseEnd ?? r.verse) - r.verse + 1 }, (_, i) => `${r.book}.${r.chapter}.${r.verse + i}`).filter((k) => !have.has(k));
    });
    expect(missing).toEqual([]);
  });

  it.skipIf(!existsSync("public/data/library.json"))("reads on only into sections the library has", () => {
    const lib: { id: string; sections: { title: string }[] }[] = JSON.parse(readFileSync("public/data/library.json", "utf8"));
    for (const c of CURIOS)
      for (const r of c.read ?? [])
        if ("library" in r) expect(lib.find((t) => t.id === r.library)?.sections.some((s) => s.title === r.section), `${c.id}: ${r.library}, ${r.section}`).toBe(true);
  });
});
