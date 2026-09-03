import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Download01Icon,
  CheckmarkCircle01Icon,
  PlusSignIcon,
  Cancel01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InfoTip } from "@/components/InfoTip";
import { useAppStore, type CorpusInfo } from "@/store/appStore";
import { cn } from "@/lib/utils";

interface Translation {
  id: string;
  name: string;
  language: string;
  license: string;
  verified: boolean;
  hasUrl: boolean;
  downloaded: boolean;
  sizeBytes?: number;
  charCount?: number;
  wordCount?: number;
  tokenCount?: number;
  vocabSize?: number;
}

export function CorpusView() {
  const activeCorpus = useAppStore((s) => s.activeCorpus);
  const setActiveCorpus = useAppStore((s) => s.setActiveCorpus);
  const setCorpus = useAppStore((s) => s.setCorpus);

  const [translations, setTranslations] = useState<Translation[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ bytes: number; total: number } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [sample, setSample] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setTranslations(await invoke<Translation[]>("corpus_list"));
    } catch (err) {
      console.error("corpus_list failed:", err);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Keep the selection honest. It is restored from localStorage before the list
  // is known, so it can point at a translation that was since removed or was
  // never downloaded — in which case training would fail with a confusing
  // "corpus isn't downloaded". Fall back to whatever is actually available.
  useEffect(() => {
    if (translations.length === 0) return;
    const current = translations.find((t) => t.id === activeCorpus);
    if (current?.downloaded) return;
    const fallback = translations.find((t) => t.downloaded);
    if (fallback && fallback.id !== activeCorpus) setActiveCorpus(fallback.id);
  }, [translations, activeCorpus, setActiveCorpus]);

  // Publish the selected corpus's stats to the store. Nothing did this before,
  // so the training view's VRAM estimate always assumed a 75-token vocabulary
  // no matter which translation was picked.
  useEffect(() => {
    let stale = false;
    invoke<CorpusInfo>("corpus_status", { version: activeCorpus })
      .then((info) => {
        if (!stale) setCorpus(info.downloaded ? info : null);
      })
      .catch(() => {
        if (!stale) setCorpus(null);
      });
    return () => {
      stale = true;
    };
  }, [activeCorpus, setCorpus]);

  // Show the opening of the translation actually selected, rather than a
  // hardcoded KJV snippet that stayed put whichever language you chose.
  useEffect(() => {
    let stale = false;
    setSample(null);
    invoke<string>("corpus_preview", { version: activeCorpus })
      .then((text) => {
        if (!stale) setSample(text);
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, [activeCorpus, translations]);

  useEffect(() => {
    const un = listen<{ bytes: number; total: number }>("corpus:progress", (e) =>
      setProgress(e.payload),
    );
    return () => {
      un.then((f) => f());
    };
  }, []);

  const handleDownload = async (id: string) => {
    setDownloading(id);
    setProgress({ bytes: 0, total: 0 });
    try {
      await invoke("corpus_download", { version: id });
      await refresh();
      setActiveCorpus(id);
      toast.success("Translation downloaded");
    } catch (err) {
      console.error("Download failed:", err);
      toast.error("Download failed", { description: String(err) });
    } finally {
      setDownloading(null);
      setProgress(null);
    }
  };

  const handleRemove = async (t: Translation) => {
    try {
      await invoke("corpus_remove", { id: t.id });
      await refresh();
      toast.success(`Removed ${t.name}`);
    } catch (err) {
      toast.error("Couldn't remove translation", { description: String(err) });
    }
  };

  const handleAdd = async (t: { id: string; name: string; language: string; url: string }) => {
    try {
      await invoke("corpus_add", t);
      await refresh();
      setShowAdd(false);
      toast.success(`Added ${t.name}`);
    } catch (err) {
      toast.error("Couldn't add translation", { description: String(err) });
    }
  };

  const active = translations.find((t) => t.id === activeCorpus);

  // Group by language for a clean, scalable list.
  const byLang = translations.reduce<Record<string, Translation[]>>((acc, t) => {
    (acc[t.language] ??= []).push(t);
    return acc;
  }, {});
  const languages = Object.keys(byLang).sort();

  return (
    <div className="flex h-full flex-col">
      <ViewHeader
        title="Corpus"
        description="Pick a Bible translation to train on — or add your own"
      />

      <ScrollArea className="flex-1">
        <div className="mx-auto max-w-3xl space-y-6 p-6">
          {/* Translations */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
              <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Translations
                <InfoTip>
                  Each translation is its own training corpus. Download one, select
                  it (the dot), then train on it. The model's vocabulary and style
                  come entirely from whichever text you pick.
                </InfoTip>
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowAdd((v) => !v)}
                className="h-7 gap-1.5 rounded-md text-muted-foreground"
              >
                <HugeiconsIcon
                  icon={showAdd ? Cancel01Icon : PlusSignIcon}
                  size={14}
                  strokeWidth={2}
                />
                {showAdd ? "Cancel" : "Add translation"}
              </Button>
            </div>

            {showAdd && <AddForm onAdd={handleAdd} />}

            {languages.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                Loading translations…
              </p>
            ) : (
              languages.map((lang) => (
                <div key={lang}>
                  <p className="bg-muted/40 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                    {lang}
                  </p>
                  <div className="divide-y divide-border/50">
                    {byLang[lang].map((t) => (
                      <TranslationRow
                        key={t.id}
                        t={t}
                        active={t.id === activeCorpus}
                        downloading={downloading === t.id}
                        busy={downloading !== null}
                        progress={downloading === t.id ? progress : null}
                        onDownload={() => handleDownload(t.id)}
                        onSelect={() => setActiveCorpus(t.id)}
                        onRemove={t.verified ? undefined : () => handleRemove(t)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Active corpus stats */}
          {active?.downloaded && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard label="Characters" value={(active.charCount ?? 0).toLocaleString()} />
              <StatCard label="Words" value={(active.wordCount ?? 0).toLocaleString()} />
              <StatCard label="Tokens" value={(active.tokenCount ?? 0).toLocaleString()} unit="(char-level)" />
              <StatCard label="Vocab size" value={(active.vocabSize ?? 0).toLocaleString()} />
            </div>
          )}

          {/* Scale check vs GPT-3 */}
          <ScaleCompare
            dataMb={active?.downloaded ? (active.sizeBytes ?? 0) / 1_048_576 : 4.4}
            vocabSize={active?.downloaded ? active.vocabSize : undefined}
          />

          {/* Sample preview — the opening of the selected translation itself */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
              <span className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Sample{active ? ` — ${active.name}` : ""}
              </span>
              <Badge variant="outline" className="shrink-0 text-xs">
                Preview
              </Badge>
            </div>
            <div className="p-4">
              {sample ? (
                <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/80">
                  {sample}
                </pre>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {active?.downloaded
                    ? "Loading preview…"
                    : "Download a translation to see how its text looks."}
                </p>
              )}
            </div>
          </div>

          {/* Tokenizer info */}
          <div className="space-y-3 rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground">Tokenizer</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              BibleLM uses{" "}
              <span className="font-medium text-foreground">character-level tokenization</span>{" "}
              — each distinct character becomes a token. This keeps the vocabulary
              tiny{active?.vocabSize ? ` (${active.vocabSize} symbols in ${active.name})` : " (~75 symbols for English)"}{" "}
              and works for any language, including non-Latin scripts. The
              vocabulary is rebuilt from whichever translation you train on.
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function TranslationRow({
  t,
  active,
  downloading,
  busy,
  progress,
  onDownload,
  onSelect,
  onRemove,
}: {
  t: Translation;
  active: boolean;
  downloading: boolean;
  busy: boolean;
  progress: { bytes: number; total: number } | null;
  onDownload: () => void;
  onSelect: () => void;
  /** Only user-added translations can be removed; presets pass undefined. */
  onRemove?: () => void;
}) {
  return (
    <div className={cn("px-4 py-3 transition-colors", active && "bg-brand/[0.06]")}>
      <div className="flex items-center gap-3">
        {/* Select-for-training radio */}
        <button
          type="button"
          onClick={onSelect}
          disabled={!t.downloaded}
          aria-label={`Use ${t.name} for training`}
          className={cn(
            "flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
            active
              ? "border-brand bg-brand"
              : t.downloaded
                ? "border-muted-foreground/40 hover:border-brand"
                : "border-border opacity-30",
          )}
        >
          {active && <span className="size-1.5 rounded-full bg-brand-foreground" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium text-foreground">{t.name}</p>
            {!t.verified && (
              <Badge variant="outline" className="text-[10px]">
                custom
              </Badge>
            )}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {t.downloaded
              ? `${((t.sizeBytes ?? 0) / 1_048_576).toFixed(1)} MB · ${(t.wordCount ?? 0).toLocaleString()} words · vocab ${t.vocabSize ?? "—"}`
              : t.license}
          </p>
        </div>

        {/* Status / action */}
        <div className="flex shrink-0 items-center gap-1.5">
          {t.downloaded ? (
            <Badge variant={active ? "brand" : "success"} className="gap-1">
              <HugeiconsIcon icon={CheckmarkCircle01Icon} size={12} strokeWidth={2} />
              {active ? "Training set" : "Ready"}
            </Badge>
          ) : downloading ? (
            <span className="text-xs text-muted-foreground">Downloading…</span>
          ) : (
            <Button
              size="sm"
              variant="brand"
              onClick={onDownload}
              disabled={!t.hasUrl || busy}
              className="h-7 gap-1.5"
              title={t.hasUrl ? undefined : "No source URL set for this translation"}
            >
              <HugeiconsIcon icon={Download01Icon} size={13} strokeWidth={2} />
              {t.downloaded ? "Re-download" : "Download"}
            </Button>
          )}
          {/* Without this a mistyped URL was permanent — the broken row stayed
              in the list forever with no way to correct it. */}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              disabled={busy}
              aria-label={`Remove ${t.name}`}
              title="Remove this translation"
              className="grid size-7 place-items-center rounded-md text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
            >
              <HugeiconsIcon icon={Delete02Icon} size={14} strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>

      {downloading && progress && (
        <div className="mt-2.5 space-y-1">
          <Progress value={progress.total > 0 ? (progress.bytes / progress.total) * 100 : 0} />
          <p className="text-right font-mono text-[11px] tabular-nums text-muted-foreground">
            {(progress.bytes / 1_048_576).toFixed(1)}
            {progress.total > 0 && ` / ${(progress.total / 1_048_576).toFixed(1)}`} MB
          </p>
        </div>
      )}
    </div>
  );
}

function AddForm({
  onAdd,
}: {
  onAdd: (t: { id: string; name: string; language: string; url: string }) => void;
}) {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState("");
  const [url, setUrl] = useState("");

  const id = slugify(name);
  const hasName = name.trim().length > 0;
  const hasLanguage = language.trim().length > 0;
  const hasUrl = /^https?:\/\//.test(url.trim());
  const valid = hasName && hasLanguage && hasUrl;

  // Say which field is holding things up. The Add button used to just sit there
  // disabled — most confusingly for a name in a non-Latin script, which slugged
  // to an empty id and could never be added at all.
  const blocker = !hasName
    ? "Give the translation a name"
    : !hasLanguage
      ? "Add a language"
      : !hasUrl
        ? "Paste a URL starting with http:// or https://"
        : null;

  return (
    <div className="space-y-3 border-b border-border/60 bg-muted/20 px-4 py-4">
      <p className="text-xs leading-relaxed text-muted-foreground">
        Point at any plain-text Bible (e.g. a Project Gutenberg{" "}
        <code className="rounded bg-muted px-1 font-mono">.txt</code> URL). Any
        language works — the character tokenizer adapts to the script.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Name">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="World English Bible"
            className="h-8 text-xs"
          />
        </Field>
        <Field label="Language">
          <Input
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            placeholder="English"
            className="h-8 text-xs"
          />
        </Field>
      </div>
      <Field label="Plain-text URL">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.gutenberg.org/cache/epub/…/pg….txt"
          className="h-8 font-mono text-xs"
        />
      </Field>
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 truncate text-[11px] text-muted-foreground/60">
          {blocker ? blocker : <span className="font-mono">id: {id}</span>}
        </span>
        <Button
          size="sm"
          variant="brand"
          disabled={!valid}
          onClick={() => onAdd({ id, name: name.trim(), language: language.trim(), url: url.trim() })}
          className="h-7"
        >
          Add
        </Button>
      </div>
    </div>
  );
}

/**
 * A filesystem-safe id for a translation, derived from its name.
 *
 * The name is used verbatim as a filename (`<id>.txt`), so it has to reduce to
 * ASCII. Accents fold to their base letters; a name in a script that leaves
 * nothing behind (Greek, Cyrillic, Chinese, …) falls back to a short stable
 * hash rather than an empty id, which previously made those translations
 * impossible to add at all.
 */
function slugify(name: string): string {
  const ascii = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (ascii) return ascii.slice(0, 40);

  const trimmed = name.trim();
  if (!trimmed) return "";
  let hash = 0;
  for (const ch of trimmed) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0;
  return `bible-${hash.toString(36)}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function ScaleCompare({
  dataMb,
  vocabSize,
}: {
  dataMb: number;
  vocabSize?: number;
}) {
  // BibleLM numbers reflect the default config; GPT-3 is the 175B model.
  // Vocabulary is the exception — it comes from the corpus, not the config, so
  // it tracks whichever translation is selected.
  const rows: Array<[string, string, string]> = [
    ["Parameters", "3.2M", "175B"],
    ["Transformer layers", "4", "96"],
    ["Embedding dim (d_model)", "256", "12,288"],
    ["Context window", "256", "2,048"],
    ["Vocabulary", vocabSize ? vocabSize.toLocaleString() : "—", "50,257"],
    ["Training text", `${dataMb.toFixed(1)} MB`, "~570 GB"],
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center gap-1.5 border-b border-border/60 px-4 py-2.5">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Scale check — BibleLM vs GPT-3
        </span>
        <InfoTip>
          GPT-3 is OpenAI's 2020 model — the one that made "large language model" a
          household phrase. This shows just how tiny (and trainable-at-home) BibleLM
          is by comparison.
        </InfoTip>
      </div>
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-8 px-4 py-2 text-xs">
        <span />
        <span className="py-1.5 text-right text-[11px] font-semibold uppercase tracking-wider text-brand">
          BibleLM
        </span>
        <span className="py-1.5 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          GPT-3
        </span>
        {rows.map(([label, a, b]) => (
          <div className="contents" key={label}>
            <span className="border-t border-border/40 py-1.5 text-muted-foreground">{label}</span>
            <span className="border-t border-border/40 py-1.5 text-right font-mono tabular-nums text-foreground">
              {a}
            </span>
            <span className="border-t border-border/40 py-1.5 text-right font-mono tabular-nums text-muted-foreground">
              {b}
            </span>
          </div>
        ))}
      </div>
      <p className="border-t border-border/60 px-4 py-2.5 text-xs leading-relaxed text-muted-foreground">
        GPT-3 has roughly <span className="font-medium text-foreground">55,000×</span>{" "}
        more parameters and trained on about{" "}
        <span className="font-medium text-foreground">130,000×</span> more text. BibleLM
        is teaching-scale — small enough to train in minutes and actually watch it learn.
      </p>
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-foreground">{value}</p>
      {unit && <p className="mt-0.5 text-xs text-muted-foreground/60">{unit}</p>}
    </div>
  );
}

function ViewHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border/60 px-6 py-4">
      <div>
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
