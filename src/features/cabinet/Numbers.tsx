// The cabinet's numbers: gematria and isopsephy worked by rule
// (src/lib/gematria.ts), and the Bible codes run honestly against Moby-Dick
// (the Lab's lesson, src/lib/els.ts).

import { useState } from "react";
import { Input, Spinner } from "@nexis/design";
import { Fleuron } from "@/art/Art";
import { count, EXAMPLES, numberOf, scriptOf, SCRIPTS, type Script } from "@/lib/gematria";
import { useTranslation } from "@/lib/hooks";
import { useStudy } from "@/store/study";
import { Codes } from "@/features/lab/lessons/LessonsView";

export function NumbersShelf() {
  const translation = useStudy((s) => s.translation);
  const [t] = useTranslation(translation);
  return (
    <div className="max-w-3xl">
      <h2 className="font-blackletter text-3xl">The number of a name</h2>
      <p className="mt-2 font-garamond text-[16px] leading-relaxed text-foreground/85">
        Hebrew and Greek wrote their numbers with their letters, so every word has a sum. "Let him that hath understanding count the number of the beast"
        (Revelation 13:18), and readers have been counting since. Type a word in Hebrew, Greek or Latin letters, or take one of the famous ones.
      </p>
      <Calculator />
      <Fleuron />
      <h2 className="font-blackletter text-3xl">The Bible codes</h2>
      <p className="mt-2 font-garamond text-[16px] leading-relaxed text-foreground/85">
        Take every n-th letter and words appear. In 1994 a paper found the names of rabbis hidden this way in Genesis; McKay, Bar-Natan, Bar-Hillel and Kalai
        then found as many in Moby-Dick, and showed that the freedom to choose words, spellings and skips after looking makes such finds certain. Search both.
      </p>
      <div className="mt-5">{t ? <Codes t={t} /> : <Spinner />}</div>
    </div>
  );
}

function Calculator() {
  const [word, setWord] = useState(EXAMPLES[0].word);
  const [chosen, setChosen] = useState<Script | null>(null);
  const script = chosen ?? scriptOf(word) ?? "latin";
  const letters = count(word, script);
  const total = numberOf(word, script);
  const example = EXAMPLES.find((e) => e.word === word);
  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-xs text-muted-foreground">
          A word or a name
          <Input value={word} onChange={(e) => setWord(e.target.value)} className="mt-1 h-9 w-72 font-garamond text-lg" dir="auto" aria-label="A word or a name" />
        </label>
        <div className="flex gap-1" role="group" aria-label="Reckoned as">
          {SCRIPTS.map((s) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={script === s.id}
              onClick={() => setChosen(chosen === s.id ? null : s.id)}
              className={script === s.id ? "rounded-full bg-foreground px-2.5 py-1 text-xs text-background" : "rounded-full bg-muted/70 px-2.5 py-1 text-xs text-muted-foreground hover:bg-foreground/10 hover:text-foreground"}
            >
              {s.name}, {s.gist}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5 flex flex-wrap items-end gap-x-1 gap-y-3" dir={script === "hebrew" ? "rtl" : "ltr"}>
        {letters.map((c, i) => (
          <span key={i} className="flex w-10 flex-col items-center">
            <span className="font-garamond text-2xl leading-none">{c.ch}</span>
            <span className="mt-1 text-[11px] tabular-nums text-muted-foreground">{c.value}</span>
          </span>
        ))}
        <span className="mx-3 self-center text-muted-foreground">=</span>
        <span className="self-center font-garamond text-4xl tabular-nums">{total}</span>
      </div>
      {letters.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No letter here has a value in {SCRIPTS.find((s) => s.id === script)!.name}.</p>}
      {example && <p className="mt-3 font-garamond text-[15px] italic text-muted-foreground">{example.gist}</p>}
      <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5">
        {EXAMPLES.map((e) => (
          <li key={e.word}>
            <button type="button" onClick={() => { setWord(e.word); setChosen(null); }} className="font-garamond text-[15px] hover:underline">
              {e.say} <span className="text-muted-foreground tabular-nums">{numberOf(e.word)}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        Standard values: a Hebrew final letter counts as its ordinary form; Greek counts stigma 6, koppa 90 and sampi 900; Latin counts only the Roman numerals.
      </p>
    </div>
  );
}
