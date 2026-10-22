import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Badge,
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Icon,
  Input,
  SectionLabel,
  Textarea,
  toast,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  cn,
} from "@nexis/design";
import { ArtSpot, Dither, Engraving, Ornament, Painting, paintingShadow, usePagePlate, usePaintings, usePlates } from "@/art/Art";
import { PAGE_PAINTINGS, PAGE_PLATES, paintingCredit, paintingUrl, plateUrl, type Plate } from "@/lib/art";
import { formatRef, parseOsis, SHELVES, type Shelf } from "@/lib/canon";
import { useCatalog } from "@/lib/hooks";
import { bibleOrder, noteSpans, spansLabel, useNotebooks, type Note, type Notebook } from "@/store/notebooks";
import { useStudy } from "@/store/study";
import { ExportDialog, type PrintScope } from "./ExportDialog";
import { PrintNotebook } from "./PrintNotebook";

const label = (osis: string) => {
  const r = parseOsis(osis);
  return r ? formatRef(r) : osis;
};

export function NotebooksView() {
  const { notebooks, active, setActive, loaded, error } = useNotebooks();
  const [creating, setCreating] = useState(false);
  const plate = usePagePlate(PAGE_PLATES.notebooks);
  useEffect(() => {
    const open = () => setCreating(true);
    window.addEventListener("biblelm:new-notebook", open);
    return () => window.removeEventListener("biblelm:new-notebook", open);
  }, []);
  const nb = notebooks.find((b) => b.id === active);

  return (
    <div className="relative flex min-h-0 flex-1">
      <aside className="flex w-72 shrink-0 flex-col border-r border-border/60 bg-sidebar/40">
        <div className="flex items-center gap-2 px-4 pb-2 pt-6">
          <h1 className="font-blackletter text-3xl">Notebooks</h1>
          <span className="flex-1" />
          <MergeButton />
          <Button variant="ghost" size="icon-sm" aria-label="New notebook" onClick={() => setCreating(true)}>
            <Icon name="add" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
          {notebooks.map((b) => (
            <NotebookRow key={b.id} b={b} active={b.id === active} onClick={() => setActive(b.id)} />
          ))}
          {loaded && !notebooks.length && <p className="px-2 py-4 text-sm text-muted-foreground">No studies yet. Each notebook keeps its own translations, canon and notes.</p>}
          {error && <p className="px-2 py-2 text-xs text-destructive">Could not read your notes: {error}. Nothing was overwritten.</p>}
        </div>
      </aside>
      <div className="relative min-w-0 flex-1 overflow-y-auto">
        {nb ? <NotebookDetail nb={nb} /> : <EmptyNotebooks plate={plate} onCreate={() => setCreating(true)} />}
      </div>
      <NotebookDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}

/**
 * Merge in another copy of your notes (a notes.json from another machine, or
 * one of the daily backups): nothing is lost, newer edits win, deletions hold.
 */
function MergeButton() {
  const mergeFrom = useNotebooks((s) => s.mergeFrom);
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          try {
            const before = useNotebooks.getState().notes.length;
            mergeFrom(JSON.parse(await f.text()));
            const after = useNotebooks.getState().notes.length;
            toast.success("Merged", { description: `${after - before >= 0 ? after - before : 0} notes added; newer edits kept.` });
          } catch (err) {
            toast.error("Could not merge that file", { description: String(err) });
          }
        }}
      />
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Merge another copy of your notes" onClick={() => input.current?.click()}>
            <Icon name="git-compare" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Merge another copy of your notes (from another machine or a backup)</TooltipContent>
      </Tooltip>
    </>
  );
}

function NotebookRow({ b, active, onClick }: { b: Notebook; active: boolean; onClick: () => void }) {
  const plates = usePlates();
  const count = useNotebooks((s) => s.notes.filter((n) => n.notebook === b.id).length);
  const cover = plates.find((p) => p.id === b.plate);
  return (
    <button type="button" onClick={onClick} className={cn("flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-sidebar-accent/70", active && "bg-sidebar-accent")}>
      <div className="grid h-12 w-9 shrink-0 place-items-center overflow-hidden rounded-sm bg-muted">
        {cover ? <Engraving plate={cover} size="thumb" className="h-full w-full object-cover" /> : <Icon name="note" className="text-muted-foreground" />}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{b.title}</p>
        <p className="truncate text-xs text-muted-foreground">{count} notes · {b.translations.join(", ").toUpperCase()}</p>
      </div>
    </button>
  );
}

function EmptyNotebooks({ plate, onCreate }: { plate?: Plate; onCreate: () => void }) {
  // Saint Jerome at his desk, translating: the scholar's own picture.
  const jerome = usePaintings().find((p) => p.id === PAGE_PAINTINGS.notebooks);
  const art = useStudy((s) => s.illustrations) !== "off";
  if (jerome && art)
    return (
      <div className="grid h-full place-items-center p-8">
        <div className="flex max-w-xl flex-col items-center text-center">
          <Painting
            src={paintingUrl(jerome.full)}
            dot={2}
            label={`${jerome.title}, ${paintingCredit(jerome)}`}
            look={{ colour: jerome.colour, focusX: jerome.focusX, focusY: jerome.focusY, edges: { top: 0.2, right: 0.22, bottom: 0.25, left: 0.22 }, grain: 0.04, shadow: paintingShadow(jerome) }}
            className="mb-4 aspect-[7/5] w-[30rem] max-w-full"
          />
          <p className="font-garamond text-3xl">A study of your own</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            A notebook is one study: Romans with Paul, the Psalms of lament, the Apocrypha as a curiosity. Each keeps the translations and canon you chose
            for it, and notes anchored to verses so they follow the text into every translation.
          </p>
          <Button variant="brand" className="mt-5" onClick={onCreate}>
            <Icon name="add" /> New notebook
          </Button>
          <p className="mt-4 font-garamond text-xs italic text-muted-foreground">{jerome.title}, {paintingCredit(jerome)}</p>
        </div>
      </div>
    );
  return (
    <div className="grid h-full place-items-center p-8">
      <ArtSpot plate={plate} title={<span className="text-3xl">A study of your own</span>} className="max-w-md">
        <p className="mt-1.5">
          A notebook is one study: Romans with Paul, the Psalms of lament, the Apocrypha as a curiosity. Each keeps the translations and canon you chose
          for it, and notes anchored to verses so they follow the text into every translation.
        </p>
        <Button variant="brand" className="mt-5" onClick={onCreate}>
          <Icon name="add" /> New notebook
        </Button>
      </ArtSpot>
    </div>
  );
}

function NotebookDetail({ nb }: { nb: Notebook }) {
  const { notes, highlights, updateNotebook, deleteNotebook, updateNote, deleteNote } = useNotebooks();
  const study = useStudy();
  const plates = usePlates();
  const [editing, setEditing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [printing, setPrinting] = useState<PrintScope | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [filter, setFilter] = useState("");
  const mine = useMemo(
    () =>
      notes
        .filter((n) => n.notebook === nb.id)
        .filter((n) => !filter || n.body.toLowerCase().includes(filter.toLowerCase()) || n.tags.some((t) => t.includes(filter.toLowerCase())) || spansLabel(noteSpans(n), label).toLowerCase().includes(filter.toLowerCase()))
        .sort(bibleOrder),
    [notes, nb.id, filter],
  );
  const hls = highlights.filter((h) => h.notebook === nb.id);
  const cover = plates.find((p) => p.id === nb.plate);

  const openInReader = (osis?: string) => {
    study.set({ translation: nb.translations[0] ?? study.translation, parallel: nb.translations.slice(1), shelves: nb.shelves });
    const r = osis ? parseOsis(osis) : undefined;
    if (r) study.read(r, { select: true });
    else study.go("read");
  };


  return (
    <div className="mx-auto max-w-3xl px-8 pb-24 pt-8">
      <header className="flex gap-6">
        {cover && <Engraving plate={cover} className="w-40 shrink-0 self-start" />}
        <div className="min-w-0 flex-1">
          <h2 className="font-blackletter text-4xl">{nb.title}</h2>
          {nb.description && <p className="mt-2 font-garamond text-lg text-muted-foreground">{nb.description}</p>}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {nb.translations.map((t) => <Badge key={t} variant="secondary">{t.toUpperCase()}</Badge>)}
            {nb.shelves.filter((s) => s !== "protestant").map((s) => <Badge key={s} variant="outline">{SHELVES.find((x) => x.id === s)?.label}</Badge>)}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="brand" size="sm" onClick={() => openInReader()}>
              <Icon name="document" /> Open in reader
            </Button>
            <Button variant="outline" size="sm" onClick={() => setExporting(true)}>
              <Icon name="download" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPrinting({ keep: () => true })}>
              <Icon name="file-pdf" /> Print illustrated
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
              <Icon name="edit" /> Edit
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" onClick={() => setConfirmDelete(true)}>
              <Icon name="delete" /> Delete
            </Button>
          </div>
        </div>
      </header>

      <div className="mt-8 flex items-center gap-3">
        <SectionLabel className="flex-1">{mine.length} notes</SectionLabel>
        <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter notes" className="h-8 w-56" />
      </div>
      <div className="mt-3 space-y-3">
        {mine.map((n) => (
          <NoteCard key={n.id} n={n} onOpen={() => openInReader(n.start)} onChange={(body) => updateNote(n.id, { body })} onTags={(tags) => updateNote(n.id, { tags })} onDelete={() => deleteNote(n.id)} />
        ))}
        {!mine.length && (
          <p className="flex items-start gap-3 text-sm text-muted-foreground">
            <NotebookLion />
            Open the reader, tap a verse, and write in the panel that opens. Ctrl-click or shift-click to write on several verses at once. Notes land here.
          </p>
        )}
      </div>

      {hls.length > 0 && (
        <>
          <SectionLabel className="mt-8">{hls.length} highlighted verses</SectionLabel>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {hls.map((h) => (
              <button key={h.id} type="button" onClick={() => openInReader(h.ref)} className="rounded-full bg-muted px-2.5 py-0.5 text-xs hover:bg-accent">
                {label(h.ref)}
              </button>
            ))}
          </div>
        </>
      )}

      {printing && <PrintNotebook nb={nb} keep={printing.keep} subtitle={printing.subtitle} onDone={() => setPrinting(null)} />}
      <ExportDialog nb={nb} open={exporting} onOpenChange={setExporting} onPrint={setPrinting} />
      <NotebookDialog open={editing} onOpenChange={setEditing} editing={nb} onSave={(patch) => updateNotebook(nb.id, patch)} />
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{nb.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              Its {mine.length} notes and highlights go with it. The last 14 daily backups of your notes stay in the app data folder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => deleteNotebook(nb.id)}>Delete notebook</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** An empty notebook: Jerome's lion asleep, from Dürer's St Jerome in His Study. */
function NotebookLion() {
  const lion = usePagePlate(PAGE_PLATES.notebookEmpty);
  const off = useStudy((s) => s.illustrations) === "off";
  if (!lion || off) return <Ornament name="quill" className="h-12" />;
  return <Dither src={plateUrl(lion.full)} dot={1} label={`${lion.title}, after ${lion.artist}`} className="aspect-[2/1] w-40 shrink-0 text-foreground" />;
}

function NoteCard({ n, onOpen, onChange, onTags, onDelete }: { n: Note; onOpen: () => void; onChange: (b: string) => void; onTags: (t: string[]) => void; onDelete: () => void }) {
  const [tagDraft, setTagDraft] = useState("");
  return (
    <article className="group rounded-xl bg-card p-4 ring-1 ring-foreground/6">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onOpen} className="font-garamond text-lg text-brand hover:underline">
          {spansLabel(noteSpans(n), label)}
        </button>
        {n.translation && <Badge variant="outline">{n.translation.toUpperCase()} wording</Badge>}
        <span className="flex-1" />
        <span className="text-[11px] text-muted-foreground">{new Date(n.updated).toLocaleDateString()}</span>
        <Button variant="ghost" size="icon-xs" aria-label="Delete note" className="opacity-0 group-hover:opacity-100" onClick={onDelete}>
          <Icon name="delete" size="xs" />
        </Button>
      </div>
      <Textarea value={n.body} onChange={(e) => onChange(e.target.value)} className="mt-2 min-h-20 resize-y border-none bg-transparent p-0 font-garamond text-[16px] leading-7 shadow-none focus-visible:ring-0" />
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {n.tags.map((t) => (
          <button key={t} type="button" onClick={() => onTags(n.tags.filter((x) => x !== t))} className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground hover:line-through">
            #{t}
          </button>
        ))}
        <input
          value={tagDraft}
          onChange={(e) => setTagDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && tagDraft.trim()) {
              onTags([...new Set([...n.tags, tagDraft.trim().toLowerCase()])]);
              setTagDraft("");
            }
          }}
          placeholder="+ tag"
          className="w-20 bg-transparent text-[11px] text-muted-foreground outline-none placeholder:text-muted-foreground/60"
        />
      </div>
    </article>
  );
}

function NotebookDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Notebook;
  onSave?: (patch: Partial<Notebook>) => void;
}) {
  const study = useStudy();
  const create = useNotebooks((s) => s.createNotebook);
  const [catalog] = useCatalog();
  const plates = usePlates();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [translations, setTranslations] = useState<string[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>(["protestant"]);
  const [plate, setPlate] = useState<string | undefined>();
  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? "");
    setDescription(editing?.description ?? "");
    setTranslations(editing?.translations ?? [study.translation]);
    setShelves(editing?.shelves ?? study.shelves);
    setPlate(editing?.plate);
  }, [open, editing, study.translation, study.shelves]);

  const save = () => {
    const data = { title: title.trim() || "Untitled study", description: description.trim(), translations: translations.length ? translations : ["kjv"], shelves, plate };
    if (editing) onSave?.(data);
    else create(data);
    onOpenChange(false);
  };
  const suggestions = plateSuggestions(plates, title + " " + description);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit notebook" : "New notebook"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Romans with Paul" autoFocus />
          </Field>
          <Field label="What is this study about?">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Grace, faith and the law, read slowly." />
          </Field>
          <Field label="Translations, the first is the main one">
            <div className="grid grid-cols-2 gap-2">
              {(catalog ?? []).map((t) => (
                <label key={t.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={translations.includes(t.id)}
                    onCheckedChange={(on) => setTranslations(on ? [...translations, t.id] : translations.filter((x) => x !== t.id))}
                  />
                  {t.abbr} · {t.name}
                </label>
              ))}
            </div>
          </Field>
          <Field label="Canon">
            <div className="space-y-1.5">
              {SHELVES.map((s) => (
                <label key={s.id} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={shelves.includes(s.id)}
                    disabled={s.id === "protestant"}
                    onCheckedChange={(on) => setShelves(on ? [...shelves, s.id] : shelves.filter((x) => x !== s.id))}
                  />
                  <span>
                    {s.label} <span className="text-muted-foreground">· {s.blurb}</span>
                  </span>
                </label>
              ))}
            </div>
          </Field>
          <Field label="Cover plate">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {suggestions.map((p) => (
                <button key={p.id} type="button" title={p.title} onClick={() => setPlate(p.id === plate ? undefined : p.id)} className={cn("h-24 w-[4.5rem] shrink-0 overflow-hidden rounded-md ring-2", p.id === plate ? "ring-brand" : "ring-transparent")}>
                  <Engraving plate={p} size="thumb" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="brand" onClick={save}>{editing ? "Save" : "Create notebook"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Plates whose title or book matches the notebook's words, then a spread of the rest. */
function plateSuggestions(plates: Plate[], words: string): Plate[] {
  const w = words.toLowerCase().split(/\W+/).filter((x) => x.length > 3);
  const scored = plates.map((p) => ({ p, s: w.filter((x) => p.title.toLowerCase().includes(x) || (p.ref?.book ?? "").toLowerCase().startsWith(x.slice(0, 3))).length }));
  const hits = scored.filter((x) => x.s > 0).sort((a, b) => b.s - a.s).map((x) => x.p);
  const spread = plates.filter((_, i) => i % 12 === 0);
  return [...new Set([...hits, ...spread])].slice(0, 24);
}
