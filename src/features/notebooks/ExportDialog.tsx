// Export a notebook, or one book or chapter of it: as Markdown (one file, a
// file per book or a file per chapter, Obsidian-friendly) with the verses
// quoted above each note, or laid out for paper by PrintNotebook.

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Icon,
  Segmented,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  toast,
  IN_TAURI,
} from "@nexis/design";
import { backend } from "@/lib/backend";
import { loadTranslation } from "@/lib/bible";
import { bookName, formatRef, parseOsis } from "@/lib/canon";
import { bibleOrder, fileSafe, toMarkdown, useNotebooks, type Note, type Notebook, type Span } from "@/store/notebooks";

const label = (osis: string) => {
  const r = parseOsis(osis);
  return r ? formatRef(r) : osis;
};

type Scope = "all" | "book" | "chapter";
type As = "markdown" | "print";
type Split = "one" | "book" | "chapter";

/** What went to the printer: which notes, and the line under the title. */
export type PrintScope = { keep: (n: Note) => boolean; subtitle?: string };

export function ExportDialog({ nb, open, onOpenChange, onPrint }: { nb: Notebook; open: boolean; onOpenChange: (o: boolean) => void; onPrint: (s: PrintScope) => void }) {
  const all = useNotebooks((s) => s.notes);
  const notes = useMemo(() => all.filter((n) => n.notebook === nb.id).sort(bibleOrder), [all, nb.id]);
  const books = useMemo(() => [...new Set(notes.map((n) => n.start.split(".")[0]))], [notes]);
  const chapters = useMemo(() => [...new Set(notes.map((n) => n.start.split(".").slice(0, 2).join(".")))], [notes]);
  const count = (prefix: string) => {
    const k = notes.filter((n) => n.start.startsWith(`${prefix}.`)).length;
    return `${k} ${k === 1 ? "note" : "notes"}`;
  };

  const [scope, setScope] = useState<Scope>("all");
  const [book, setBook] = useState("");
  const [chapter, setChapter] = useState("");
  const [as, setAs] = useState<As>("markdown");
  const [split, setSplit] = useState<Split>("one");
  const [quote, setQuote] = useState(true);
  const [busy, setBusy] = useState(false);
  // Start on the book and chapter the first note is in.
  useEffect(() => {
    if (!open) return;
    setBook((b) => (books.includes(b) ? b : books[0] ?? ""));
    setChapter((c) => (chapters.includes(c) ? c : chapters[0] ?? ""));
  }, [open, books, chapters]);

  const prefix = scope === "book" ? book : scope === "chapter" ? chapter : "";
  const keep = (n: Note) => !prefix || n.start.startsWith(`${prefix}.`);
  const chosen = notes.filter(keep).length;
  const scopeName = scope === "book" ? bookName(book) : scope === "chapter" && chapter ? label(chapter) : "";
  // A file per chapter of one chapter is one file; a file per book of one book, likewise.
  const splits = [
    { id: "one" as const, label: "One file" },
    ...(scope === "all" ? [{ id: "book" as const, label: "A file per book" }] : []),
    ...(scope !== "chapter" ? [{ id: "chapter" as const, label: "A file per chapter" }] : []),
  ];
  const effectiveSplit = splits.some((s) => s.id === split) ? split : "one";

  const run = async () => {
    if (as === "print") {
      onPrint({ keep, subtitle: scopeName || undefined });
      onOpenChange(false);
      return;
    }
    setBusy(true);
    try {
      const tid = nb.translations[0] ?? "kjv";
      const t = quote ? await loadTranslation(tid) : null;
      const passage = t
        ? (s: Span) => {
            const r = parseOsis(s.start);
            const end = s.end ? parseOsis(s.end) : undefined;
            return r ? t.range({ ...r, verseEnd: end?.verse }).map((v) => `**${v.verse}** ${v.text}`) : [];
          }
        : undefined;
      const files = toMarkdown(useNotebooks.getState(), nb.id, label, { keep, split: effectiveSplit, passage, passageFrom: t?.meta.abbr });
      const name = fileSafe(scopeName ? `${nb.title} ${scopeName}` : nb.title);
      if (effectiveSplit === "one") files[0].path = `${name}.md`;
      if (IN_TAURI) {
        const dir = await backend.exportMarkdown(files.map((f) => ({ path: effectiveSplit === "one" ? f.path : `${name}/${f.path}`, body: f.body })));
        toast.success("Exported to Markdown", { description: dir ?? undefined });
      } else {
        // A browser can only hand over one file at a time: the files run together, each marked.
        const body = files.length === 1 ? files[0].body : files.map((f) => `<!-- ${f.path} -->\n${f.body}`).join("\n\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([body], { type: "text/markdown" }));
        a.download = `${name}.md`;
        a.click();
        URL.revokeObjectURL(a.href);
      }
      onOpenChange(false);
    } catch (e) {
      toast.error("Could not export", { description: String(e) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Export {nb.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Which notes">
            <div className="space-y-2">
              <Segmented
                label="Which notes"
                value={scope}
                onChange={setScope}
                segments={[
                  { id: "all", label: "The whole notebook" },
                  { id: "book", label: "One book" },
                  { id: "chapter", label: "One chapter" },
                ]}
              />
              {scope === "book" && (
                <Select value={book} onValueChange={setBook}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {books.map((b) => (
                      <SelectItem key={b} value={b}>{bookName(b)} · {count(b)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {scope === "chapter" && (
                <Select value={chapter} onValueChange={setChapter}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {chapters.map((c) => (
                      <SelectItem key={c} value={c}>{label(c)} · {count(c)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </Field>
          <Field label="As">
            <Segmented
              label="Export as"
              value={as}
              onChange={setAs}
              segments={[
                { id: "markdown", label: "Markdown", icon: "document" },
                { id: "print", label: "Print or PDF, illustrated", icon: "file-pdf" },
              ]}
            />
          </Field>
          {as === "markdown" && (
            <>
              {splits.length > 1 && (
                <Field label="Files">
                  <Segmented label="Files" value={effectiveSplit} onChange={setSplit} segments={splits} />
                </Field>
              )}
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={quote} onCheckedChange={(on) => setQuote(on === true)} />
                Quote the verses above each note ({(nb.translations[0] ?? "kjv").toUpperCase()})
              </label>
              <p className="text-xs text-muted-foreground">
                {IN_TAURI
                  ? "Written to the exports folder in the app data folder, with [[Rom.8.28]] links that Obsidian follows."
                  : "Downloaded as one Markdown file, with [[Rom.8.28]] links that Obsidian follows."}
              </p>
            </>
          )}
          {as === "print" && <p className="text-xs text-muted-foreground">Each note under its passage, with the pictures of that chapter. Choose Save as PDF in the print dialog for a file.</p>}
        </div>
        <DialogFooter className="items-center">
          <span className="mr-auto text-xs text-muted-foreground">{chosen} {chosen === 1 ? "note" : "notes"}</span>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant="brand" disabled={!chosen || busy} onClick={run}>
            <Icon name={as === "print" ? "file-pdf" : "download"} /> {as === "print" ? "Print" : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
