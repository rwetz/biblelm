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
  ViewEnter,
  WindowResizeEdges,
  type PaletteCommand,
  type SidebarNavSection,
} from "@nexis/design";
import { Heptagram } from "@/art/Art";
import { SidebarArt } from "@/art/SidebarArt";
import { formatRef, SHELVES } from "@/lib/canon";
import { useCatalog } from "@/lib/hooks";
import { refreshGpuInfo } from "@/lib/gpu";
import { HomeView } from "@/features/home/HomeView";
import { ReadView, chapterStep, toggleVersePanel } from "@/features/read/ReadView";
import { SearchView } from "@/features/search/SearchView";
import { TopicsView } from "@/features/topics/TopicsView";
import { STRUGGLES } from "@/lib/studies";
import { AtlasView } from "@/features/atlas/AtlasView";
import { GalleryView } from "@/features/gallery/GalleryView";
import { DailyView } from "@/features/daily/DailyView";
import { Look } from "@/features/look/Look";
import { ViewBoundary } from "./ViewBoundary";
import { NotebooksView } from "@/features/notebooks/NotebooksView";
import { LabView } from "@/features/lab/LabView";
import { SettingsView } from "@/features/settings/SettingsView";
import { useNotebooks } from "@/store/notebooks";
import { loadPaintings, paintingForDay, type Painting } from "@/lib/art";
import { nextScheme, useScheme } from "@/app/scheme";
import { SCHEMES } from "@/app/theme";
import { useStudy, type Page } from "@/store/study";

const NAV: SidebarNavSection<Page>[] = [
  {
    title: "Study",
    items: [
      { id: "home", label: "Home", icon: "home" },
      { id: "read", label: "Read", icon: "document" },
      { id: "search", label: "Search", icon: "search" },
      { id: "topics", label: "Topics", icon: "nodes" },
      { id: "atlas", label: "Atlas", icon: "map" },
      { id: "gallery", label: "Gallery", icon: "image" },
      { id: "daily", label: "Daily", icon: "calendar" },
      { id: "notebooks", label: "Notebooks", icon: "note" },
    ],
  },
  { title: "Machine", items: [{ id: "lab", label: "Lab", icon: "brain" }] },
  { items: [{ id: "settings", label: "Settings", icon: "settings" }] },
];

// The paintings, for commands that open one (loaded once at start).
let paintingsCache: Painting[] = [];
loadPaintings().then((p) => (paintingsCache = p));

const VIEWS: Record<Page, () => React.ReactNode> = {
  home: () => <HomeView />,
  read: () => <ReadView />,
  search: () => <SearchView />,
  topics: () => <TopicsView />,
  atlas: () => <AtlasView />,
  gallery: () => <GalleryView />,
  daily: () => <DailyView />,
  notebooks: () => <NotebooksView />,
  lab: () => <LabView />,
  settings: () => <SettingsView />,
};

export default function App() {
  const page = useStudy((s) => s.page);
  const redLetter = useStudy((s) => s.redLetter);
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
    <div className={`flex h-full flex-col bg-background text-foreground ${redLetter ? "red-letter" : ""}`}>
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
        <div className="relative flex shrink-0">
          <SidebarNav sections={NAV} value={page} onChange={go} label="BibleLM" />
          <SidebarArt />
        </div>
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <ViewEnter replayKey={page} className="flex min-h-0 flex-1 flex-col">
            <ViewBoundary resetKey={page}>{VIEWS[page]()}</ViewBoundary>
          </ViewEnter>
        </main>
      </div>
      <Status />
      <Look />
      <CommandPalette open={palette} onOpenChange={setPalette} commands={commands} placeholder="Type a command, a book, or a page" />
    </div>
  );
}

/** Vellum, Nocturne, Tenebrae: one click steps to the next scheme. */
function ModeToggle() {
  const [scheme, setScheme] = useScheme();
  const next = nextScheme(scheme);
  const label = SCHEMES.find((s) => s.id === next)!.label;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Switch to ${label}`} onClick={() => setScheme(next)}>
          <Icon name={scheme === "vellum" ? "theme-dark" : scheme === "nocturne" ? "contrast" : "theme-light"} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
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
  const [, setScheme] = useScheme();
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
      { id: "studies", label: "Studies for young men", group: "Study", icon: "document", keywords: ["temptation", "struggle", "men's group", "bible study"], run: () => study.openStudies() },
      ...STRUGGLES.map((s) => ({ id: `study-${s.id}`, label: `Study: ${s.title}`, group: "Study", icon: "document" as const, keywords: ["temptation", "young men", ...s.topics], run: () => study.openStudies(s.id) })),
      { id: "next-ch", label: "Next chapter", group: "Read", icon: "chevron-right", shortcut: "]", run: () => chapterStep(1) },
      { id: "prev-ch", label: "Previous chapter", group: "Read", icon: "chevron-left", shortcut: "[", run: () => chapterStep(-1) },
      { id: "verse-panel", label: study.selected ? "Hide the verse panel" : "Show the verse panel", group: "Read", icon: "info", shortcut: "P", keywords: ["notes", "cross references", "sidebar"], run: () => { if (study.page !== "read") study.go("read"); toggleVersePanel(); } },
      { id: "interlinear", label: study.interlinear ? "Read without the Hebrew and Greek" : "Read interlinear (Hebrew and Greek)", group: "Read", icon: "text", keywords: ["greek", "hebrew", "original", "strongs"], run: () => { study.set({ interlinear: !study.interlinear }); if (study.page !== "read") study.go("read"); } },
      { id: "look-today", label: "Look: today's painting", group: "Art", icon: "image", keywords: ["caravaggio", "rembrandt", "visio divina", "gallery"], run: () => { const p = paintingForDay(paintingsCache); if (p) study.openLook({ kind: "painting", id: p.id }); } },
      { id: "columns", label: study.columns ? "Read in one column" : "Read in two columns", group: "Read", icon: "split-vertical", run: () => study.set({ columns: !study.columns }) },
      { id: "red-letter", label: study.redLetter ? "Words of Christ in black" : "Words of Christ in red", group: "Read", icon: "quote", keywords: ["red letter", "jesus"], run: () => study.set({ redLetter: !study.redLetter }) },
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
      { id: "dev", label: study.devMode ? "Turn developer mode off" : "Turn developer mode on", group: "Appearance", icon: "code", keywords: ["debug", "art", "hero", "plates"], run: () => { study.set({ devMode: !study.devMode }); if (!study.devMode) study.go("settings"); } },
      ...SCHEMES.map((sc) => ({ id: `scheme-${sc.id}`, label: `Scheme: ${sc.label}`, group: "Appearance", icon: "contrast" as const, keywords: ["theme", "light", "dark", sc.blurb], run: () => setScheme(sc.id) })),
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
  }, [study, setScheme, catalog, notebooks, setActive, openPalette]);
}
