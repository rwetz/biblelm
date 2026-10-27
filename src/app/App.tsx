import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  fmtShortcut,
  Icon,
  MOD_KEY,
  MOD_PROP,
  SHIFT_KEY,
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
import { Palette } from "./Palette";
import { Welcome } from "./Welcome";
import { SidebarArt, SidebarOrnament } from "@/art/SidebarArt";
import { formatRef, SHELVES, type Shelf } from "@/lib/canon";
import { useCatalog } from "@/lib/hooks";
import { refreshGpuInfo } from "@/lib/gpu";
import { listen } from "@/lib/backend";
import { setSaverMode, watchPower } from "@/lib/power";
import { HomeView } from "@/features/home/HomeView";
import { ReadView, chapterStep, toggleVersePanel } from "@/features/read/ReadView";
import { SearchView } from "@/features/search/SearchView";
import { TopicsView } from "@/features/topics/TopicsView";
import { STRUGGLES } from "@/lib/studies";
import { CURIOS } from "@/lib/dossiers";
import { AtlasView } from "@/features/atlas/AtlasView";
import { GalleryView } from "@/features/gallery/GalleryView";
import { DailyView } from "@/features/daily/DailyView";
import { Look } from "@/features/look/Look";
import { ViewBoundary } from "./ViewBoundary";
import { NotebooksView } from "@/features/notebooks/NotebooksView";
import { LabView } from "@/features/lab/LabView";
import { SettingsView } from "@/features/settings/SettingsView";
import { CabinetView } from "@/features/cabinet/CabinetView";
import { useNotebooks } from "@/store/notebooks";
import { loadPaintings, loadRosePaintings, paintingForDay, type Painting } from "@/lib/art";
import { nextScheme, useScheme } from "@/app/scheme";
import { useSubRosa, useSubRosaAsk, useSubRosaSync } from "@/app/subrosa";
import { SubRosaAsk } from "@/features/settings/SubRosaPanel";
import { SCHEMES } from "@/app/theme";
import { useStudy, type Page } from "@/store/study";

const SHELF_WORDS: Record<Shelf, string[]> = {
  protestant: ["protestant", "66 books"],
  deuterocanon: ["deuterocanon", "catholic", "tobit", "judith", "wisdom", "sirach", "baruch", "maccabees"],
  apocrypha: ["apocrypha", "esdras", "manasseh", "psalm 151", "1611"],
  pseudepigrapha: ["pseudepigrapha", "enoch", "watchers", "charles", "jubilees", "solomon", "nicodemus", "harrowing", "apocalypse of paul", "james"],
};

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
      { id: "cabinet", label: "Sub Rosa", icon: "incognito" },
    ],
  },
  { title: "Machine", items: [{ id: "lab", label: "Lab", icon: "brain" }] },
  { items: [{ id: "settings", label: "Settings", icon: "settings" }] },
];
/** Pages that are there only while a setting is on: the Lab (Settings, Lab in the sidebar) and the cabinet, under the rose. */
const shown = (page: Page, showLab: boolean, subRosa: boolean) => (page !== "lab" || showLab) && (page !== "cabinet" || subRosa);
/** The sidebar as set. */
const navFor = (showLab: boolean, subRosa: boolean) =>
  NAV.map((s) => ({ ...s, items: s.items.filter((i) => shown(i.id, showLab, subRosa)) })).filter((s) => s.items.length);

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
  cabinet: () => <CabinetView />,
};

/**
 * Narrower than a small laptop's window (a 1366 or 1280 wide screen with the
 * verse panel open leaves the text little room beside a full sidebar): the
 * sidebar folds to its icons and drops its art, so the page keeps room.
 */
function useNarrow(): boolean {
  const query = "(max-width: 1023px)";
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia?.(query).matches === true);
  useEffect(() => {
    const m = window.matchMedia?.(query);
    if (!m) return;
    const on = () => setNarrow(m.matches);
    on();
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);
  return narrow;
}

/**
 * Back and forward through the pages visited (the menu, the keyboard and a
 * two-finger swipe), like a browser's, without a router.
 */
function usePageHistory(page: Page, go: (p: Page) => void) {
  const back = useRef<Page[]>([]);
  const ahead = useRef<Page[]>([]);
  const last = useRef(page);
  const stepping = useRef(false);
  useEffect(() => {
    if (page === last.current) return;
    if (!stepping.current) {
      back.current = [...back.current, last.current].slice(-30);
      ahead.current = [];
    }
    stepping.current = false;
    last.current = page;
  }, [page]);
  return useMemo(() => {
    const step = (from: { current: Page[] }, to: { current: Page[] }) => {
      const p = from.current.pop();
      if (!p) return;
      to.current.push(last.current);
      stepping.current = true;
      go(p);
    };
    return { back: () => step(back, ahead), forward: () => step(ahead, back) };
  }, [go]);
}

/**
 * A two-finger swipe across a trackpad turns back or forward, unless the
 * pointer is over something that scrolls sideways or pans (maps, wide
 * tables). One turn per swipe: the gesture must pause before the next.
 */
function useSwipeHistory(history: { back: () => void; forward: () => void }) {
  useEffect(() => {
    let dx = 0;
    let spent = false;
    let quiet: ReturnType<typeof setTimeout> | undefined;
    const sideways = (el: Element | null): boolean => {
      for (; el && el !== document.body; el = el.parentElement) {
        if (el instanceof HTMLCanvasElement || el instanceof SVGSVGElement) return true;
        const ox = getComputedStyle(el).overflowX;
        if ((ox === "auto" || ox === "scroll") && el.scrollWidth > el.clientWidth) return true;
      }
      return false;
    };
    const onWheel = (e: WheelEvent) => {
      clearTimeout(quiet);
      quiet = setTimeout(() => ((dx = 0), (spent = false)), 220);
      if (spent || e.ctrlKey || Math.abs(e.deltaX) < 2 * Math.abs(e.deltaY)) return;
      if (sideways(e.target as Element)) return;
      dx += e.deltaX;
      if (Math.abs(dx) < 140) return;
      spent = true;
      if (dx < 0) history.back();
      else history.forward();
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [history]);
}

export default function App() {
  const page = useStudy((s) => s.page);
  const showLab = useStudy((s) => s.showLab);
  const compact = useStudy((s) => s.compact);
  const saver = useStudy((s) => s.saver);
  const folded = useStudy((s) => s.sidebarFolded);
  const setStudy = useStudy((s) => s.set);
  const redLetter = useStudy((s) => s.redLetter);
  const go = useStudy((s) => s.go);
  const subRosa = useStudy((s) => s.subRosa);
  const [palette, setPalette] = useState(false);
  const narrow = useNarrow();
  const nav = useMemo(() => navFor(showLab, subRosa), [showLab, subRosa]);
  const history = usePageHistory(page, go);
  useSwipeHistory(history);
  const commands = useCommands(() => setPalette(true), history);
  useSubRosaSync();

  useEffect(() => {
    document.documentElement.toggleAttribute("data-compact", compact);
  }, [compact]);
  useEffect(() => {
    watchPower();
    setSaverMode(saver);
  }, [saver]);

  // The shortcuts a Mac app is expected to have (Ctrl elsewhere); also the menu bar's.
  useEffect(() => {
    const find = () => {
      go("search");
      setTimeout(() => window.dispatchEvent(new CustomEvent("biblelm:focus-search")), 60);
    };
    const run: Record<string, () => void> = {
      settings: () => go("settings"),
      find,
      palette: () => setPalette(true),
      sidebar: () => setStudy({ sidebarFolded: !useStudy.getState().sidebarFolded }),
      back: history.back,
      forward: history.forward,
    };
    const keys: Record<string, string> = { ",": "settings", f: "find", "\\": "sidebar", "[": "back", "]": "forward" };
    const onKey = (e: KeyboardEvent) => {
      if (!e[`${MOD_PROP}Key`] || e.altKey || e.shiftKey) return;
      const name = keys[e.key.toLowerCase()];
      if (!name) return;
      e.preventDefault();
      run[name]();
    };
    window.addEventListener("keydown", onKey);
    const off = listen<string>("menu", (e) => {
      if (e.payload.startsWith("go-")) go(e.payload.slice(3) as Page);
      else run[e.payload]?.();
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      off.then((f) => f());
    };
  }, [go, history, setStudy]);
  useCommandPaletteShortcut(() => setPalette((o) => !o));
  const loadNotes = useNotebooks((s) => s.load);

  // Hiding the Lab, or coming out from under the rose, while on its page leaves for Home rather than a page with no nav item.
  useEffect(() => {
    if (!shown(page, showLab, subRosa)) go("home");
  }, [showLab, subRosa, page, go]);

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
            className="group flex h-7 w-80 max-w-[40vw] items-center gap-2 rounded-md bg-muted/60 px-2.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
          >
            <Icon name="search" size="xs" />
            <span className="flex-1 truncate text-left transition-colors group-hover:text-foreground">Find a page, setting or command</span>
            <kbd className="hidden font-mono text-[10px] opacity-70 md:inline">{fmtShortcut(MOD_KEY, SHIFT_KEY, "P")}</kbd>
          </button>
        }
        actions={subRosa ? undefined : <ModeToggle />}
      />
      <div className="nexis-shell-body flex min-h-0 flex-1">
        <div className="relative flex shrink-0">
          <SidebarNav sections={nav} value={page} onChange={go} label="BibleLM" collapsed={narrow || folded} />
          {!(narrow || folded) && <SidebarOrnament />}
          {!(narrow || folded) && <SidebarArt />}
        </div>
        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <ViewEnter replayKey={page} className="flex min-h-0 flex-1 flex-col">
            <ViewBoundary resetKey={page}>{VIEWS[page]()}</ViewBoundary>
          </ViewEnter>
        </main>
      </div>
      <Status />
      <Look />
      <Palette open={palette} onOpenChange={setPalette} commands={commands} />
      <Welcome />
      <SubRosaAsk />
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

function useCommands(openPalette: () => void, history: { back: () => void; forward: () => void }): PaletteCommand[] {
  const study = useStudy();
  const [, setScheme] = useScheme();
  const [subRosa, setSubRosa] = useSubRosa();
  const askSubRosa = useSubRosaAsk((s) => s.ask);
  const [catalog] = useCatalog();
  const { notebooks, setActive } = useNotebooks();
  return useMemo(() => {
    const nav = NAV.flatMap((s) => s.items).filter((i) => shown(i.id, study.showLab, subRosa)).map<PaletteCommand>((i) => ({
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
      { id: "look-today", label: "Look: today's painting", group: "Art", icon: "image", keywords: ["caravaggio", "rembrandt", "visio divina", "gallery"], run: async () => { const p = paintingForDay(study.subRosa ? [...paintingsCache, ...(await loadRosePaintings())] : paintingsCache); if (p) study.openLook({ kind: "painting", id: p.id }); } },
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
        keywords: SHELF_WORDS[s.id],
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
      ...(subRosa ? [] : SCHEMES).map((sc) => ({ id: `scheme-${sc.id}`, label: `Scheme: ${sc.label}`, group: "Appearance", icon: "contrast" as const, keywords: ["theme", sc.id === "vellum" ? "light mode" : "dark mode", sc.blurb], run: () => setScheme(sc.id) })),
    ];
    const nbs: PaletteCommand[] = [
      { id: "nb-new", label: "New notebook", group: "Notebooks", icon: "add", run: () => { study.go("notebooks"); window.dispatchEvent(new CustomEvent("biblelm:new-notebook")); } },
      ...notebooks.map((b) => ({ id: `nb-${b.id}`, label: `Open notebook: ${b.title}`, group: "Notebooks", icon: "note" as const, run: () => { setActive(b.id); study.go("notebooks"); } })),
    ];
    // Every setting, by its label on the Settings page: the palette opens the
    // page there and the row flashes (SettingsView listens for biblelm:setting).
    const setting = (label: string, keywords: string[] = []): PaletteCommand => ({
      id: `set-${label}`,
      label: `Settings: ${label}`,
      group: "Settings",
      icon: "settings",
      keywords,
      run: () => {
        study.go("settings");
        setTimeout(() => window.dispatchEvent(new CustomEvent("biblelm:setting", { detail: label })), 120);
      },
    });
    const settings: PaletteCommand[] = [
      setting("Scheme", ["theme", "dark mode", "light mode", "vellum", "nocturne", "tenebrae", "colours"]),
      setting("Follow the system's light and dark", ["dark mode", "auto", "system theme"]),
      setting("Illustrations", ["art", "pictures", "engravings", "paintings", "off"]),
      setting("Reading face", ["font", "typeface", "garamond", "fell", "gothic", "blackletter"]),
      setting("Text size", ["font size", "bigger", "smaller", "zoom"]),
      setting("Red letter", ["words of christ", "jesus", "red"]),
      setting("Two columns", ["columns", "layout", "printed bible"]),
      setting("Ornaments", ["decorations", "flair", "dither", "emblems", "turn off"]),
      setting("Compact spacing", ["density", "small screen", "laptop", "margins", "tight"]),
      setting("Fold the sidebar to icons", ["collapse", "nav", "room"]),
      setting("Save battery", ["power", "low power", "laptop", "animation", "blur", "motion"]),
      setting("Your name", ["name", "print", "title page", "profile"]),
      // Each shelf by its own books, so "enoch" finds the Pseudepigrapha alone.
      ...SHELVES.map((s) => setting(s.label, ["canon", "shelf", "books", ...SHELF_WORDS[s.id]])),
      setting("Translations", ["kjv", "web", "asv", "version", "bible"]),
      setting("Lab in the sidebar", ["machine", "gpt", "train", "hide", "simpler", "study only"]),
      setting("Semantic search", ["meaning", "embedding", "machine"]),
      setting("Jev", ["typesafe", "rerank", "api key", "machine help", "bypass"]),
      setting("Developer mode", ["debug", "hero", "plates", "art", "ornaments sheet"]),
      setting("Sub Rosa", ["curiosities", "dark", "occult", "angels", "demons", "hell", "goetia", "solomon", "masons", "symbols", "under the rose"]),
      setting("About", ["credits", "licence", "version", "sources"]),
    ];
    const lab: PaletteCommand[] = ([["corpus", "Corpus"], ["train", "Training"], ["generate", "Generate"], ["model", "Model"], ["inside", "Inside the model"], ["lessons", "Lessons"]] as const).map(([t, name]) => ({
      id: `lab-${t}`,
      label: `Lab: ${name}`,
      group: "Lab",
      icon: "brain" as const,
      keywords: ["gpt", "model", "machine", "train"],
      run: () => { study.go("lab"); setTimeout(() => window.dispatchEvent(new CustomEvent("biblelm:lab-tab", { detail: t })), 60); },
    }));
    const layout: PaletteCommand[] = [
      { id: "back", label: "Back", group: "Navigate", icon: "chevron-left", shortcut: fmtShortcut(MOD_KEY, "["), run: history.back },
      { id: "forward", label: "Forward", group: "Navigate", icon: "chevron-right", shortcut: fmtShortcut(MOD_KEY, "]"), run: history.forward },
      { id: "sidebar", label: study.sidebarFolded ? "Unfold the sidebar" : "Fold the sidebar to icons", group: "Appearance", icon: "sidebar-left", shortcut: fmtShortcut(MOD_KEY, "\\"), keywords: ["collapse", "hide", "nav", "room"], run: () => study.set({ sidebarFolded: !study.sidebarFolded }) },
      { id: "compact", label: study.compact ? "Roomier spacing" : "Compact spacing", group: "Appearance", icon: "zoom-out", keywords: ["density", "small screen", "laptop", "margins", "tight"], run: () => study.set({ compact: !study.compact }) },
    ];
    const labToggle: PaletteCommand = { id: "lab-toggle", label: study.showLab ? "Hide the Lab from the sidebar" : "Show the Lab in the sidebar", group: "Lab", icon: "brain", keywords: ["machine", "gpt", "simpler", "study only"], run: () => study.set({ showLab: !study.showLab }) };
    const welcome: PaletteCommand = { id: "welcome", label: "Show the welcome again", group: "Settings", icon: "info", keywords: ["name", "first start", "intro"], run: () => study.set({ welcomed: false }) };
    // Going under asks for the acknowledgement first; coming out is one step.
    const rose: PaletteCommand = subRosa
      ? { id: "subrosa-off", label: "Come out from under the rose", group: "Appearance", icon: "contrast", keywords: ["sub rosa", "leave", "normal", "light"], run: () => setSubRosa(false) }
      : { id: "subrosa-on", label: "Go under the rose", group: "Appearance", icon: "incognito", keywords: ["sub rosa", "curiosities", "cabinet", "dark"], run: () => askSubRosa(true) };
    // Each dossier and symbol, under the rose only.
    const curios: PaletteCommand[] = CURIOS.map((c) => ({
      id: `curio-${c.id}`,
      label: `${c.kind === "symbol" ? "Symbol" : "Dossier"}: ${c.title}`,
      group: "Sub Rosa",
      icon: "incognito",
      keywords: ["sub rosa", c.lede],
      run: () => study.openCabinet({ text: null, section: 0, shelf: c.kind === "symbol" ? "symbols" : "dossiers", curio: c.id }),
    }));
    curios.push({ id: "curio-hell", label: "The map of hell (Botticelli)", group: "Sub Rosa", icon: "incognito", keywords: ["sub rosa", "dante", "inferno", "circles", "atlas"], run: () => study.openAtlas("hell", "") });
    curios.push({ id: "curio-quiz", label: "Scripture or myth? A quiz", group: "Sub Rosa", icon: "incognito", keywords: ["sub rosa", "quiz", "myths", "apple", "lucifer", "flashcards"], run: () => study.openCabinet({ text: null, section: 0, shelf: "quiz" }) });
    curios.push({ id: "curio-numbers", label: "Gematria: the number of a name", group: "Sub Rosa", icon: "incognito", keywords: ["sub rosa", "isopsephy", "666", "616", "bible codes", "els"], run: () => study.openCabinet({ text: null, section: 0, shelf: "numbers" }) });
    curios.push({ id: "curio-bestiary", label: "The bestiary: the Goetia's 72 spirits", group: "Sub Rosa", icon: "incognito", keywords: ["sub rosa", "goetia", "seals", "demons", "testament of solomon"], run: () => study.openCabinet({ text: null, section: 0, shelf: "bestiary" }) });
    void openPalette;
    return [...nav, ...reading, ...settings, welcome, ...(study.showLab ? lab : []), labToggle, ...layout, ...translations, ...shelves, ...nbs, ...appearance, rose, ...(subRosa ? curios : [])];
  }, [study, setScheme, subRosa, setSubRosa, askSubRosa, catalog, notebooks, setActive, openPalette, history]);
}
