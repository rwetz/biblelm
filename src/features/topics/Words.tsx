// Words: what counting can show about a book's vocabulary and style.
// Distinctive words (tf-idf), the company a word keeps (PMI), the words used
// only once (hapax legomena) and how alike books are in style (Burrows' Delta).

import { useMemo, useState } from "react";
import { Input, SectionLabel } from "@nexis/design";
import type { Translation } from "@/lib/bible";
import { BOOKS, bookName, formatRef } from "@/lib/canon";
import { collocates, delta, distinctive, hapax } from "@/lib/words";
import { useStudy } from "@/store/study";
import { Choice } from "@/app/controls";

export function Words({ t }: { t: Translation }) {
  const [book, setBook] = useState("Eccl");
  const [word, setWord] = useState("grace");
  const [hq, setHq] = useState("");
  const read = useStudy((s) => s.read);
  const searchFor = useStudy((s) => s.searchFor);
  const books = useMemo(() => BOOKS.filter((b) => b.shelf === "protestant" && t.hasBook(b.osis)), [t]);
  const dist = useMemo(() => distinctive(t, book), [t, book]);
  const style = useMemo(() => delta(t), [t]);
  const near = useMemo(
    () => style.books.filter((b) => b !== book).map((b) => ({ b, d: style.d(book, b) })).filter((x) => !Number.isNaN(x.d)).sort((x, y) => x.d - y.d).slice(0, 6),
    [style, book],
  );
  const coll = useMemo(() => collocates(t, word), [t, word]);
  const once = useMemo(() => hapax(t), [t]);
  const onceShown = useMemo(() => (hq ? once.filter((h) => h.word.startsWith(hq.toLowerCase())) : once).slice(0, 300), [once, hq]);
  const max = dist[0]?.score ?? 1;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-(--gutter) py-6 lg:grid-cols-3">
        <section>
          <SectionLabel>A book's own words</SectionLabel>
          <Choice size="sm" label="Book" value={book} onChange={setBook} options={books.map((b) => ({ value: b.osis, label: b.name }))} className="mt-2 w-full" />
          <p className="mt-2 text-xs text-muted-foreground">Words {bookName(book)} uses far more than the rest of the Bible (tf-idf): its fingerprint.</p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {dist.map((d) => (
              <button key={d.word} type="button" onClick={() => setWord(d.word)} className="font-garamond hover:text-brand" style={{ fontSize: `${0.9 + 0.9 * (d.score / max)}rem` }} title={`${d.count} times`}>
                {d.word}
              </button>
            ))}
          </div>
          <SectionLabel className="mt-8">Closest in style</SectionLabel>
          <p className="mt-1 text-xs text-muted-foreground">
            Burrows' Delta over the 150 commonest words: how alike two books are in their little words. It measures style, not who wrote them, and scholars disagree on what it proves.
          </p>
          <ol className="mt-2 space-y-1 text-sm">
            {near.map(({ b, d }) => (
              <li key={b} className="flex items-baseline gap-2">
                <button type="button" className="font-garamond text-base hover:underline" onClick={() => setBook(b)}>{bookName(b)}</button>
                <span className="h-1 flex-1 rounded-full bg-muted">
                  <span className="block h-1 rounded-full bg-foreground/50" style={{ width: `${Math.max(4, 100 - d * 60)}%` }} />
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <SectionLabel>The company a word keeps</SectionLabel>
          <Input value={word} onChange={(e) => setWord(e.target.value)} className="mt-2 h-8" placeholder="A word" />
          <p className="mt-2 text-xs text-muted-foreground">Words found within four of it far more often than chance (pointwise mutual information). Shows idioms a concordance cannot.</p>
          <ol className="mt-3 space-y-0.5">
            {coll.map((c) => (
              <li key={c.word}>
                <button type="button" onClick={() => searchFor(`${word} ${c.word}`)} className="flex w-full items-baseline gap-2 rounded px-1 py-0.5 text-left hover:bg-muted/60">
                  <span className="font-garamond text-[17px]">{c.word}</span>
                  <span className="text-xs text-muted-foreground">together {c.together} times</span>
                </button>
              </li>
            ))}
            {!coll.length && <li className="text-sm text-muted-foreground">Not enough to go on: try a word the {t.meta.abbr} uses often.</li>}
          </ol>
        </section>

        <section>
          <SectionLabel>Said once</SectionLabel>
          <p className="mt-2 text-xs text-muted-foreground">
            {once.length.toLocaleString()} words in the {t.meta.abbr} occur exactly once (hapax legomena): the scholar's classic list of rare words.
          </p>
          <Input value={hq} onChange={(e) => setHq(e.target.value)} className="mt-2 h-8" placeholder="Starting with" />
          <ul className="mt-2 max-h-[28rem] space-y-0.5 overflow-y-auto">
            {onceShown.map((h) => (
              <li key={h.word}>
                <button type="button" onClick={() => read({ book: h.verse.book, chapter: h.verse.chapter, verse: h.verse.verse }, { select: true })} className="flex w-full items-baseline gap-2 rounded px-1 py-0.5 text-left hover:bg-muted/60">
                  <span className="font-garamond text-[16px]">{h.word}</span>
                  <span className="text-xs text-muted-foreground">{formatRef({ book: h.verse.book, chapter: h.verse.chapter, verse: h.verse.verse })}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
