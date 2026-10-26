import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CURIOS, curioRefs, TAGS } from "./dossiers";
import { studyRef } from "./studies";
import { ORNAMENTS } from "@/art/ornaments";

describe("dossiers and symbols", () => {
  it("are well formed: unique ids, a claim each, every reference parses, every mark drawn", () => {
    expect(new Set(CURIOS.map((c) => c.id)).size).toBe(CURIOS.length);
    for (const c of CURIOS) {
      expect(c.claims.length, c.id).toBeGreaterThan(0);
      for (const x of c.claims) expect(Object.keys(TAGS)).toContain(x.tag);
      if (c.mark) expect(ORNAMENTS[c.mark], c.id).toBeDefined();
      if (c.kind === "symbol") expect(c.mark ?? c.plates?.[0], c.id).toBeDefined();
    }
    expect(curioRefs().filter((r) => !studyRef(r))).toEqual([]);
  });

  it("uses no em dashes in anything a person reads", () => {
    expect(JSON.stringify(CURIOS)).not.toContain("—");
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
