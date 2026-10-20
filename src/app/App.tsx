import { useEffect, useMemo, useState } from "react";
import {
  Button,
  CommandPalette,
  fmtShortcut,
  Icon,
  MOD_KEY,
  SidebarNav,
  StatusBar,
  StatusItem,
  TitleBar,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useCommandPaletteShortcut,
  useTheme,
  ViewEnter,
  WindowResizeEdges,
  type PaletteCommand,
  type SidebarNavSection,
} from "@nexis/design";
import { Heptagram } from "@/art/Art";
import { formatRef, SHELVES } from "@/lib/canon";
import { useCatalog } from "@/lib/hooks";
import { refreshGpuInfo } from "@/lib/gpu";
import { HomeView } from "@/features/home/HomeView";
import { ReadView, chapterStep } from "@/features/read/ReadView";
import { SearchView } from "@/features/search/SearchView";
import { TopicsView } from "@/features/topics/TopicsView";
import { NotebooksView } from "@/features/notebooks/NotebooksView";
import { LabView } from "@/features/lab/LabView";
import { SettingsView } from "@/features/settings/SettingsView";
import { useNotebooks } from "@/store/notebooks";
import { useStudy, type Page } from "@/store/study";

const NAV: SidebarNavSection<Page>[] = [
  {
    title: "Study",
    items: [
      { id: "home", label: "Home", icon: "home" },
      { id: "read", label: "Read", icon: "document" },
      { id: "search", label: "Search", icon: "search" },
      { id: "topics", label: "Topics", icon: "nodes" },
      { id: "notebooks", label: "Notebooks", icon: "note" },
    ],
  },
  { title: "Machine", items: [{ id: "lab", label: "Lab", icon: "brain" }] },
  { items: [{ id: "settings", label: "Settings", icon: "settings" }] },
];

const VIEWS: Record<Page, () => React.ReactNode> = {
  home: () => <HomeView />,
  read: () => <ReadView />,
  search: () => <SearchView />,
  topics: () => <TopicsView />,
  notebooks: () => <NotebooksView />,
  lab: () => <LabView />,
  settings: () => <SettingsView />,
};

export default function App() {
  const page = useStudy((s) => s.page);
  const go = useStudy((s) => s.go);
  const [palette, setPalette] = useState(false);
  useCommandPaletteShortcut(() => setPalette((o) => !o));
  const commands = useCommands(() => setPalette(true));
  const loadNotes = useNotebooks((s) => s.load);

  useEffect(() => {
    loadNotes();
    refreshGpuInfo();
  }, [loadNotes]);

  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <WindowResizeEdges />
      <TitleBar
        brand={<Heptagram className="size-[18px] text-brand" />}
        title={<span className="font-blackletter text-[17px] tracking-wide">BibleLM</span>}
        center={
          <button
            type="button"
            onClick={() => setPalette(true)}
            className="flex h-7 w-72 items-center gap-2 rounded-md bg-muted/60 px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            <Icon name="search" size="xs" />
            <span className="flex-1 text-left">Go to a passage or command</span>
            <kbd className="font-mono text-[10px] opacity-70">{fmtShortcut(MOD_KEY, "Shift", "P")}</kbd>
          </button>
        }
        actions={<ModeToggle />}
      />
      <div className="nexis-shell-body flex min-h-0 flex-1">
        <SidebarNav sections={NAV} value={page} onChange={go} label="BibleLM" />
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <ViewEnter replayKey={page} className="flex min-h-0 flex-1 flex-col">
            {VIEWS[page]()}
          </ViewEnter>
        </main>
      </div>
      <Status />
      <CommandPalette open={palette} onOpenChange={setPalette} commands={commands} placeholder="Type a command, a book, or a page" />
    </div>
  );
}

function ModeToggle() {
  const theme = useTheme();
  const dark = theme.resolvedMode === "dark";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Toggle light and dark" onClick={() => theme.setMode(dark ? "light" : "dark")}>
          <Icon name={dark ? "theme-light" : "theme-dark"} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{dark ? "Vellum (light)" : "Nocturne (dark)"}</TooltipContent>
    </Tooltip>
  );
}

function Status() {
  const { translation, location, shelves, page } = useStudy();
  const [catalog] = useCatalog();
  const abbr = catalog?.find((t) => t.id === translation)?.abbr ?? translation.toUpperCase();
  const notebook = useNotebooks((s) => s.notebooks.find((b) => b.id === s.active));
  return (
    <StatusBar
      left={
        <>
          <StatusItem icon="document">{abbr}</StatusItem>
          {page === "read" && <StatusItem>{formatRef(location)}</StatusItem>}
          {notebook && <StatusItem icon="note">{notebook.title}</StatusItem>}
        </>
      }
      right={
        <StatusItem icon="layers" title={shelves.map((s) => SHELVES.find((x) => x.id === s)?.label).join(", ")}>
          {shelves.length === 1 ? "66 books" : `${shelves.length} shelves`}
        </StatusItem>
      }
    />
  );
}

function useCommands(openPalette: () => void): PaletteCommand[] {
  const study = useStudy();
  const theme = useTheme();
  const [catalog] = useCatalog();
  const { notebooks, setActive } = useNotebooks();
  return useMemo(() => {
    const nav = NAV.flatMap((s) => s.items).map<PaletteCommand>((i) => ({
      id: `go-${i.id}`,
      label: `Go to ${i.label}`,
      group: "Navigate",
      icon: i.icon,
      run: () => study.go(i.id),
    }));
    const reading: PaletteCommand[] = [
      { id: "next-ch", label: "Next chapter", group: "Read", icon: "chevron-right", shortcut: "]", run: () => chapterStep(1) },
      { id: "prev-ch", label: "Previous chapter", group: "Read", icon: "chevron-left", shortcut: "[", run: () => chapterStep(-1) },
      { id: "columns", label: study.columns ? "Read in one column" : "Read in two columns", group: "Read", icon: "split-vertical", run: () => study.set({ columns: !study.columns }) },
      { id: "bigger", label: "Larger text", group: "Read", icon: "zoom-in", run: () => study.set({ textSize: Math.min(28, study.textSize + 1) }) },
      { id: "smaller", label: "Smaller text", group: "Read", icon: "zoom-out", run: () => study.set({ textSize: Math.max(14, study.textSize - 1) }) },
      ...(["garamond", "fell", "gothic"] as const).map((f) => ({
        id: `face-${f}`,
        label: `Reading face: ${{ garamond: "Garamond", fell: "Fell English", gothic: "Gothic (blackletter)" }[f]}`,
        group: "Read",
        icon: "text" as const,
        run: () => study.set({ face: f }),
      })),
    ];
    const translations = (catalog ?? []).map<PaletteCommand>((t) => ({
      id: `tr-${t.id}`,
      label: `Translation: ${t.name}`,
      group: "Translation",
      icon: "globe",
      keywords: [t.abbr, t.language],
      run: () => study.set({ translation: t.id }),
    }));
    const shelves = SHELVES.filter((s) => s.id !== "protestant").map<PaletteCommand>((s) => {
      const on = study.shelves.includes(s.id);
      return {
        id: `shelf-${s.id}`,
        label: `${on ? "Hide" : "Show"} the ${s.label}`,
        group: "Canon",
        icon: "layers",
        run: () => study.set({ shelves: on ? study.shelves.filter((x) => x !== s.id) : [...study.shelves, s.id] }),
      };
    });
    const art: PaletteCommand[] = (["full", "margins", "off"] as const).map((m) => ({
      id: `art-${m}`,
      label: `Illustrations: ${{ full: "full", margins: "margins only", off: "off" }[m]}`,
      group: "Appearance",
      icon: "image",
      run: () => study.set({ illustrations: m }),
    }));
    const appearance: PaletteCommand[] = [
      ...art,
      { id: "mode", label: "Toggle light and dark", group: "Appearance", icon: "contrast", keywords: ["theme", "vellum", "nocturne"], run: () => theme.setMode(theme.resolvedMode === "dark" ? "light" : "dark") },
    ];
    const nbs: PaletteCommand[] = [
      { id: "nb-new", label: "New notebook", group: "Notebooks", icon: "add", run: () => { study.go("notebooks"); window.dispatchEvent(new CustomEvent("biblelm:new-notebook")); } },
      ...notebooks.map((b) => ({ id: `nb-${b.id}`, label: `Open notebook: ${b.title}`, group: "Notebooks", icon: "note" as const, run: () => { setActive(b.id); study.go("notebooks"); } })),
    ];
    const books: PaletteCommand[] = [
      { id: "goto", label: "Go to a passage…", group: "Read", icon: "search", keywords: ["reference", "verse"], run: () => { study.go("search"); window.dispatchEvent(new CustomEvent("biblelm:focus-search")); } },
    ];
    void openPalette;
    return [...books, ...nav, ...reading, ...translations, ...shelves, ...nbs, ...appearance];
  }, [study, theme, catalog, notebooks, setActive, openPalette]);
}
