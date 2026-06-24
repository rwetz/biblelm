import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  BookOpen01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// ── result types ─────────────────────────────────────────────────────────

interface VerseData {
  ref: string;
  book: string;
  chapter: number;
  verse: number;
  text: string;
}

type SearchResult =
  | { kind: "verse"; verse: VerseData; label?: string }
  | { kind: "count_verses"; word: string; count: number; sample: VerseData[] }
  | { kind: "word_frequency"; word: string; count: number }
  | { kind: "book_verse_count"; book: string; count: number }
  | { kind: "book_chapter_count"; book: string; count: number }
  | { kind: "total_verses"; count: number }
  | { kind: "total_books"; count: number; books: string[] }
  | { kind: "total_chapters"; count: number }
  | { kind: "total_words"; count: number }
  | { kind: "search"; word: string; count: number; results: VerseData[] }
  | { kind: "not_found"; message: string }
  | { kind: "no_results"; message: string }
  | { kind: "error"; message: string };

// ── example queries ───────────────────────────────────────────────────────

const EXAMPLES = [
  "John 3:16",
  "how many verses contain love",
  "how many times does grace appear",
  "how many verses in Psalms",
  "longest verse",
  "shortest verse",
  "find do unto others",
  "how many books",
];

// ── sub-components ────────────────────────────────────────────────────────

function VerseCard({ verse, label }: { verse: VerseData; label?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-2">
      {label && (
        <p className="text-[10px] uppercase tracking-widest font-semibold text-brand/70">
          {label}
        </p>
      )}
      <p className="text-xs font-semibold text-brand">{verse.ref}</p>
      <p className="font-serif text-sm leading-7 text-foreground">{verse.text}</p>
    </div>
  );
}

function BigStat({
  value,
  label,
  sub,
}: {
  value: string | number;
  label: string;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center space-y-1">
      <p className="text-4xl font-bold tabular-nums text-foreground">
        {typeof value === "number" ? value.toLocaleString() : value}
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {sub && <p className="text-xs text-muted-foreground/60">{sub}</p>}
    </div>
  );
}

function ResultPanel({ result }: { result: SearchResult }) {
  switch (result.kind) {
    case "verse":
      return <VerseCard verse={result.verse} label={result.label} />;

    case "count_verses":
      return (
        <div className="space-y-4">
          <BigStat
            value={result.count}
            label={`verses contain the word "${result.word}"`}
          />
          {result.sample.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Sample
              </p>
              {result.sample.map((v) => (
                <VerseCard key={v.ref} verse={v} />
              ))}
            </div>
          )}
        </div>
      );

    case "word_frequency":
      return (
        <BigStat
          value={result.count}
          label={`occurrences of "${result.word}" in the KJV`}
          sub="counts every instance — a verse mentioning it twice counts twice"
        />
      );

    case "book_verse_count":
      return (
        <BigStat
          value={result.count}
          label={`verses in ${result.book}`}
        />
      );

    case "book_chapter_count":
      return (
        <BigStat
          value={result.count}
          label={`chapters in ${result.book}`}
        />
      );

    case "total_verses":
      return (
        <BigStat
          value={result.count}
          label="total verses in the King James Bible"
        />
      );

    case "total_books":
      return (
        <div className="space-y-4">
          <BigStat
            value={result.count}
            label="books in the King James Bible"
            sub="39 Old Testament · 27 New Testament"
          />
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex flex-wrap gap-1.5">
              {result.books.map((b) => (
                <span
                  key={b}
                  className="rounded-md bg-accent px-2 py-0.5 text-xs text-foreground"
                >
                  {b}
                </span>
              ))}
            </div>
          </div>
        </div>
      );

    case "total_chapters":
      return (
        <BigStat
          value={result.count}
          label="total chapters in the King James Bible"
        />
      );

    case "total_words":
      return (
        <BigStat
          value={result.count}
          label="total words in the King James Bible"
        />
      );

    case "search":
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-semibold text-foreground">
              {result.count.toLocaleString()} verse{result.count !== 1 ? "s" : ""} containing &ldquo;{result.word}&rdquo;
            </p>
            {result.count > 12 && (
              <p className="text-xs text-muted-foreground">
                showing first 12
              </p>
            )}
          </div>
          <div className="space-y-2">
            {result.results.map((v) => (
              <VerseCard key={v.ref} verse={v} />
            ))}
          </div>
        </div>
      );

    case "not_found":
    case "no_results":
    case "error":
      return (
        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          {result.message}
        </div>
      );
  }
}

// ── main view ─────────────────────────────────────────────────────────────

export function AskView() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (q?: string) => {
    const searchQuery = (q ?? query).trim();
    if (!searchQuery) return;
    setQuery(searchQuery);
    setIsSearching(true);
    setError(null);
    setResult(null);
    try {
      const res = await invoke<SearchResult>("bible_search", {
        query: searchQuery,
      });
      setResult(res);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
        <div>
          <h1 className="text-base font-semibold text-foreground">Ask</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Search the King James Bible — exact answers, no guessing
          </p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-auto p-6 gap-5 nexis-scrollbar">
        {/* Search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <HugeiconsIcon
              icon={Search01Icon}
              size={15}
              strokeWidth={1.75}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="John 3:16  ·  how many verses contain love  ·  find grace"
              className="pl-9 pr-9 font-sans"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setResult(null);
                  setError(null);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.75} />
              </button>
            )}
          </div>
          <Button
            variant="brand"
            onClick={() => handleSearch()}
            disabled={isSearching || !query.trim()}
            className="gap-1.5 min-w-24"
          >
            {isSearching ? (
              <span className="size-3 rounded-full border-2 border-brand-foreground/30 border-t-brand-foreground animate-spin" />
            ) : (
              <HugeiconsIcon icon={Search01Icon} size={14} strokeWidth={2} />
            )}
            Search
          </Button>
        </div>

        {/* Example chips */}
        <div className="flex flex-wrap gap-1.5">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => handleSearch(ex)}
              className="rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-brand/40 transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>

        {/* Results */}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {result && <ResultPanel result={result} />}

        {/* Empty state */}
        {!result && !error && !isSearching && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground/40 min-h-[200px]">
            <HugeiconsIcon icon={BookOpen01Icon} size={36} strokeWidth={1.25} />
            <p className="text-sm font-serif italic">
              Ask and it shall be given unto you.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
