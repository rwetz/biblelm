// Gematria and isopsephy (docs/SUBROSA.md, S5): a word's number, from letters
// that were also numerals. Rules in code, nothing guessed:
//
//   Hebrew   standard values (mispar hechrechi): alef 1 to tet 9, yod 10 to
//            tsadi 90, qof 100 to tav 400; a final form counts as its letter.
//   Greek    the Milesian numerals: alpha 1 to theta 9 with stigma 6, iota 10
//            to koppa 90, rho 100 to sampi 900; accents and breathings ignored.
//   Latin    the Roman numerals in a word (I V X L C D M, U as V), summed: the
//            reckoning behind "Vicarius Filii Dei", a Protestant polemic.
//
// Revelation 13:18 asks the reader to "count the number of the beast"; Nero
// Caesar in Hebrew letters gives 666, and without the final nun 616, the
// variant Irenaeus knew. The dossier on 666 tells that story.

export type Script = "hebrew" | "greek" | "latin";

const HEBREW: Record<string, number> = {
  א: 1, ב: 2, ג: 3, ד: 4, ה: 5, ו: 6, ז: 7, ח: 8, ט: 9,
  י: 10, כ: 20, ך: 20, ל: 30, מ: 40, ם: 40, נ: 50, ן: 50, ס: 60, ע: 70, פ: 80, ף: 80, צ: 90, ץ: 90,
  ק: 100, ר: 200, ש: 300, ת: 400,
};

const GREEK: Record<string, number> = {
  α: 1, β: 2, γ: 3, δ: 4, ε: 5, ϛ: 6, ϝ: 6, ζ: 7, η: 8, θ: 9,
  ι: 10, κ: 20, λ: 30, μ: 40, ν: 50, ξ: 60, ο: 70, π: 80, ϙ: 90, ϟ: 90,
  ρ: 100, σ: 200, ς: 200, ϲ: 200, τ: 300, υ: 400, φ: 500, χ: 600, ψ: 700, ω: 800, ϡ: 900,
};

const LATIN: Record<string, number> = { I: 1, V: 5, U: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

export const SCRIPTS: { id: Script; name: string; gist: string }[] = [
  { id: "hebrew", name: "Hebrew", gist: "gematria" },
  { id: "greek", name: "Greek", gist: "isopsephy" },
  { id: "latin", name: "Latin", gist: "Roman numerals" },
];

/** Which script a word is written in, by its first letter that has a value. */
export function scriptOf(word: string): Script | null {
  for (const ch of letters(word)) {
    if (HEBREW[ch]) return "hebrew";
    if (GREEK[ch]) return "greek";
    if (/[A-Z]/i.test(ch)) return "latin";
  }
  return null;
}

/** Accents, breathings and vowel points off; Greek lowercased. */
const letters = (word: string) => [...word.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()];

export interface Counted {
  ch: string;
  value: number;
}

/** Each letter with its value (letters without one count nothing and are dropped). */
export function count(word: string, script: Script = scriptOf(word) ?? "latin"): Counted[] {
  const table = script === "hebrew" ? HEBREW : script === "greek" ? GREEK : null;
  const out: Counted[] = [];
  for (const ch of letters(word)) {
    const value = table ? table[ch] : LATIN[ch.toUpperCase()];
    if (value) out.push({ ch: table ? ch : ch.toUpperCase(), value });
  }
  return out;
}

export const numberOf = (word: string, script?: Script) => count(word, script).reduce((n, c) => n + c.value, 0);

/** Worked examples, each a claim with its history; the numbers are computed, never stored. */
export const EXAMPLES: { word: string; say: string; gist: string }[] = [
  { word: "נרון קסר", say: "Neron Qesar", gist: "Nero Caesar in Hebrew letters: the reading of Revelation 13:18 most scholars favour." },
  { word: "נרו קסר", say: "Nero Qesar", gist: "The Latin spelling, without the final nun: 616, the number some manuscripts give." },
  { word: "Ἰησοῦς", say: "Iesous", gist: "Jesus in Greek. The Sibylline Oracles (book 1) set his name's number at 888." },
  { word: "λατεινος", say: "Lateinos", gist: "\"The Latin man\": one of Irenaeus's guesses at the beast, about 180." },
  { word: "αβρασαξ", say: "Abrasax", gist: "The Gnostic power whose number is the days of the year." },
  { word: "יהוה", say: "YHWH", gist: "The divine name: 26." },
  { word: "Vicarius Filii Dei", say: "Vicarius Filii Dei", gist: "A Protestant polemic of the 1600s and after, reckoned in Roman numerals; it was never an official papal title." },
];
