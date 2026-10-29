import { describe, expect, it } from "vitest";
import { count, EXAMPLES, numberOf, scriptOf } from "./gematria";

describe("gematria and isopsephy", () => {
  it("gives the classic numbers", () => {
    expect(numberOf("נרון קסר")).toBe(666);
    expect(numberOf("נרו קסר")).toBe(616);
    expect(numberOf("Ἰησοῦς")).toBe(888);
    expect(numberOf("λατεινος")).toBe(666);
    expect(numberOf("αβρασαξ")).toBe(365);
    expect(numberOf("יהוה")).toBe(26);
    expect(numberOf("Vicarius Filii Dei")).toBe(666);
  });

  it("knows the script, and ignores accents, points and spaces", () => {
    expect(scriptOf("Ἰησοῦς")).toBe("greek");
    expect(scriptOf("שָׁלוֹם")).toBe("hebrew");
    expect(scriptOf("Dei")).toBe("latin");
    expect(numberOf("שָׁלוֹם")).toBe(numberOf("שלום"));
    expect(count("ΛΟΓΟΣ").map((c) => c.value)).toEqual([30, 70, 3, 70, 200]);
  });

  it("writes its examples without em dashes", () => {
    expect(JSON.stringify(EXAMPLES)).not.toContain("—");
  });
});
