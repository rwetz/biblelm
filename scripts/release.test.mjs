// The release job builds the git-ignored data and art once and hands it to
// each installer build as an artifact. A folder missing from that upload
// ships an installer without it (2.2.0 shipped without Sub Rosa's art), so
// every git-ignored folder under public/ must be covered by an upload path.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (p) => readFileSync(join(process.cwd(), p), "utf8").replace(/\r\n/g, "\n");

describe("release workflow", () => {
  it("uploads every git-ignored folder under public/", () => {
    const ignored = read(".gitignore")
      .split(/\r?\n/)
      .map((l) => l.trim().replace(/^\//, "").replace(/\/$/, ""))
      .filter((l) => l.startsWith("public/"));
    const yml = read(".github/workflows/release.yml");
    const block = /name: public-data\s+[\s\S]*?path: \|\n([\s\S]*?)\n\s*(?:if-no-files-found|retention-days)/.exec(yml);
    expect(block).not.toBeNull();
    const paths = block[1].split("\n").map((l) => l.trim()).filter((l) => l && !l.startsWith("#"));
    expect(ignored.length).toBeGreaterThan(0);
    const missing = ignored.filter((d) => !paths.some((p) => d === p || d.startsWith(`${p}/`)));
    expect(missing).toEqual([]);
  });
});
