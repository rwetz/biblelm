import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Download01Icon,
  CheckmarkCircle01Icon,
  PlusSignIcon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { InfoTip } from "@/components/InfoTip";
import { useAppStore } from "@/store/appStore";
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

const KJV_SAMPLE = `In the beginning God created the heaven and the earth.
And the earth was without form, and void; and darkness was upon the face of the deep.
And the Spirit of God moved upon the face of the waters.
And God said, Let there be light: and there was light.`;

export function CorpusView() {
  const activeCorpus = useAppStore((s) => s.activeCorpus);
  const setActiveCorpus = useAppStore((s) => s.setActiveCorpus);

  const [translations, setTranslations] = useState<Translation[]>([]);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ bytes: number; total: number } | null>(null);
  const [showAdd, setShowAdd] = useState(false);

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
          />

          {/* Sample preview */}
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Sample — KJV, Genesis 1:1–4
              </span>
              <Badge variant="outline" className="text-xs">
                Preview
              </Badge>
            </div>
            <div className="p-4">
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground/80">
                {KJV_SAMPLE}
              </pre>
            </div>
          </div>

          {/* Tokenizer info */}
          <div className="space-y-3 rounded-xl border border-border bg-card p-5">
            <h3 className="text-sm font-semibold text-foreground">Tokenizer</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              BibleLM uses{" "}
              <span className="font-medium text-foreground">character-level tokenization</span>{" "}
              — each distinct character becomes a token. This keeps the vocabulary
              tiny (~75 symbols for English) and works for any language, including
              non-Latin scripts. The vocabulary is rebuilt from whichever
              translation you train on.
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
}: {
  t: Translation;
  active: boolean;
  downloading: boolean;
  busy: boolean;
  progress: { bytes: number; total: number } | null;
  onDownload: () => void;
  onSelect: () => void;
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
        <div className="shrink-0">
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
              Download
            </Button>
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

  const id = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const valid = id.length > 0 && language.trim().length > 0 && /^https?:\/\//.test(url);

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
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-muted-foreground/60">
          {id ? `id: ${id}` : " "}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function ScaleCompare({ dataMb }: { dataMb: number }) {
  // BibleLM numbers reflect the default config; GPT-3 is the 175B model.
  const rows: Array<[string, string, string]> = [
    ["Parameters", "3.2M", "175B"],
    ["Transformer layers", "4", "96"],
    ["Embedding dim (d_model)", "256", "12,288"],
    ["Context window", "256", "2,048"],
    ["Vocabulary", "75", "50,257"],
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
