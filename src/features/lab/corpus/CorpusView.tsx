import { invoke, listen } from "@/lib/backend";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { InfoTip } from "@/features/lab/InfoTip";
import { useAppStore, type CorpusInfo } from "@/store/appStore";
import { cn } from "@/lib/utils";
import { Button, Icon, IN_TAURI, Input, Panel, Progress } from "@nexis/design";
import { LabSection } from "@/features/lab/LabSection";
import { Reading, ScaleField, TypeCase } from "./Figures";

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

/**
 * `front`: only the translations and the alphabet, set under the Lab's title
 * on its front page; the Corpus tab below then shows the rest.
 */
export function CorpusView({ front = false }: { front?: boolean } = {}) {
  const activeCorpus = useAppStore((s) => s.activeCorpus);
  const setActiveCorpus = useAppStore((s) => s.setActiveCorpus);
  const setCorpus = useAppStore((s) => s.setCorpus);

  const [translations, setTranslations] = useState<Translation[]>([]);
  const [listError, setListError] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ bytes: number; total: number } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [sample, setSample] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setTranslations(await invoke<Translation[]>("corpus_list"));
      setListError(false);
    } catch (err) {
      // In the browser there is no Lab backend: say so instead of loading forever.
      if (IN_TAURI) console.error("corpus_list failed:", err);
      setListError(true);
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

  const translationsPanel = (
          <Panel
            title="Translations"
            meta={translations.length ? `${translations.filter((t) => t.downloaded).length} of ${translations.length} downloaded` : undefined}
            actions={
              <InfoTip>
                Each translation is its own training corpus. Download one, select it (the dot), then train on it. The model's vocabulary and style
                come entirely from whichever text you pick.
              </InfoTip>
            }
            flush
          >
            {showAdd && <AddForm onAdd={handleAdd} />}
            {languages.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">{listError ? "The Lab's translations live in the desktop app." : "Loading translations…"}</p>
            ) : (
              languages.map((lang) => (
                <div key={lang}>
                  {languages.length > 1 && <p className="px-4 pt-3 pb-1 text-xs text-muted-foreground">{lang}</p>}
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
          </Panel>
  );
  const addButton = (
    <Button size="sm" variant="ghost" onClick={() => setShowAdd((v) => !v)} className="gap-1.5 text-muted-foreground">
      <Icon name={showAdd ? "close" : "add"} size="sm" />
      {showAdd ? "Cancel" : "Add a translation"}
    </Button>
  );

  if (front)
    return (
      <div className="space-y-6">
        {translationsPanel}
        <div className="-mt-3 flex justify-end">{addButton}</div>
        {active?.downloaded && <TypeCase t={active} />}
      </div>
    );

  return (
    <LabSection
      title="The text it learns from"
      lede="The model knows nothing but the one translation you give it: its words, its spelling, its rhythm. Choose it above, or add your own."
    >
      {active?.downloaded && <Reading t={active} />}
      <div className={cn("grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]", active?.downloaded && "mt-6")}>
        {/* The opening of the selected translation, exactly as the model reads it. */}
        <Panel title="As the model sees it" meta={active?.name}>
          {sample ? (
            <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/80">{sample}</pre>
          ) : (
            <p className="text-sm text-muted-foreground">
              {active?.downloaded ? "Loading the opening lines…" : "Download a translation to see how its text looks."}
            </p>
          )}
          <p className="mt-4 border-t border-border/60 pt-3 text-xs leading-relaxed text-muted-foreground">
            Every distinct character is one token, so the vocabulary stays tiny
            {active?.vocabSize ? ` (${active.vocabSize} symbols in the ${active.name})` : " (about 75 symbols for English)"} and any script
            works. The vocabulary is rebuilt from whichever translation you train on.
          </p>
        </Panel>
        <ScaleField
          dataMb={active?.downloaded ? (active.sizeBytes ?? 0) / 1_048_576 : 4.4}
          vocabSize={active?.downloaded ? active.vocabSize : undefined}
        />
      </div>
    </LabSection>
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
    <div className="px-4 py-3">
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
            {!t.verified && <span className="text-xs text-muted-foreground">added by you</span>}
          </div>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {t.downloaded
              ? `${((t.sizeBytes ?? 0) / 1_048_576).toFixed(1)} MB · ${(t.wordCount ?? 0).toLocaleString()} words · vocab ${t.vocabSize ?? "–"}`
              : t.license}
          </p>
        </div>

        {/* Status / action */}
        <div className="flex shrink-0 items-center gap-1.5">
          {t.downloaded ? (
            <span className={cn("text-xs", active ? "font-medium text-brand" : "text-muted-foreground")}>
              {active ? "Training on this" : "Downloaded"}
            </span>
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
              <Icon name="download" size="sm" />
              {t.downloaded ? "Re-download" : "Download"}
            </Button>
          )}
          {/* Without this a mistyped URL was permanent, the broken row stayed
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
              <Icon name="delete" size="sm" />
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
        language works, the character tokenizer adapts to the script.
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
