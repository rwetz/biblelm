// Settings: a tree of chapters (src/features/settings/sections.ts) beside
// one chapter at a time, on Nexis's settings template (R4.2: SettingsPage,
// SettingsGroup, SettingRow). The tree replaces R4.2's flat SidebarNav,
// since BibleLM has too many settings for one list (SettingsTree.tsx).

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Badge,
  Button,
  Icon,
  IN_TAURI,
  Input,
  INTERFACE_SCALES,
  interfaceScaleLabel,
  MOD_KEY,
  parseInterfaceSize,
  Segmented,
  SettingRow,
  SettingsGroup,
  SettingsPage,
  Slider,
  Switch,
  toast,
  useTheme,
} from "@nexis/design";
import { PlatePage, usePagePlate } from "@/art/Art";
import { RoseMark } from "@/art/RoseMark";
import { PAGE_PLATES } from "@/lib/art";
import { backend, type JevKeySource } from "@/lib/backend";
import { SHELVES } from "@/lib/canon";
import { useCatalog } from "@/lib/hooks";
import { copyText } from "@/lib/clipboard";
import { jevAvailable, recheckJev, setJevBypass } from "@/lib/jev";
import { useStudy } from "@/store/study";
import { DeveloperSettings } from "./DeveloperPanel";
import { useScheme } from "@/app/scheme";
import { SCHEMES } from "@/app/theme";
import { PageMark } from "@/art/SidebarArt";
import { SubRosaSettings } from "./SubRosaPanel";
import { findSettings, locateSetting, SETTINGS, type ChapterId } from "./sections";
import { SettingsTree, type SettingsTreeNode } from "./SettingsTree";

/** The chapter last open, so Settings comes back where you left it. */
let lastChapter: ChapterId = "reading";

/** A setting row the tree, the search and the palette can find by its label. */
export function Row({ id, label, description, align, children }: { id: string; label?: React.ReactNode; description?: React.ReactNode; align?: "end" | "stretch"; children: React.ReactNode }) {
  return (
    <div data-setting={id}>
      <SettingRow label={label ?? id} description={description} align={align}>
        {children}
      </SettingRow>
    </div>
  );
}

/** A group with an id the tree scrolls to and watches. */
export function Group({ id, title, children }: { id: string; title: React.ReactNode; children: React.ReactNode }) {
  return (
    <div id={`settings-${id}`} data-settings-group={id} className="scroll-mt-6">
      <SettingsGroup title={title}>{children}</SettingsGroup>
    </div>
  );
}

const flash = (el: HTMLElement | null | undefined) => {
  if (!el) return;
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  el.classList.remove("setting-flash");
  void el.offsetWidth;
  el.classList.add("setting-flash");
};

export function SettingsView() {
  const plate = usePagePlate(PAGE_PLATES.settings);
  const [chapter, setChapter] = useState<ChapterId>(lastChapter);
  const [section, setSection] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // A setting to scroll to and flash once its chapter has drawn.
  const [target, setTarget] = useState<{ group?: string; setting?: string } | null>(null);
  // While a click scrolls the page, the scroll spy keeps quiet.
  const steering = useRef(0);
  const page = useRef<HTMLDivElement>(null);

  const open = (c: ChapterId, then?: { group?: string; setting?: string }) => {
    lastChapter = c;
    setChapter(c);
    setSection(then?.group ?? null);
    steering.current = Date.now();
    setTarget(then ?? { group: undefined });
  };

  useEffect(() => {
    if (!target) return;
    const raf = requestAnimationFrame(() => {
      const root = page.current;
      if (!root) return;
      if (target.setting) flash(root.querySelector<HTMLElement>(`[data-setting="${CSS.escape(target.setting)}"]`) ?? root.querySelector<HTMLElement>(`#settings-${target.group}`));
      else if (target.group) root.querySelector(`#settings-${target.group}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
      else root.scrollIntoView({ block: "start" });
      setTarget(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [target, chapter]);

  // The section in view lights its place on the spine.
  useEffect(() => {
    const root = page.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const groups =[...root.querySelectorAll<HTMLElement>("[data-settings-group]")];
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) seen.set((e.target as HTMLElement).dataset.settingsGroup!, e.isIntersecting);
        if (Date.now() - steering.current < 900) return;
        const first = groups.find((g) => seen.get(g.dataset.settingsGroup!));
        if (first) setSection(first.dataset.settingsGroup!);
      },
      { rootMargin: "-15% 0px -55% 0px" },
    );
    groups.forEach((g) => io.observe(g));
    return () => io.disconnect();
  }, [chapter]);

  // The command palette opens a setting by its label (App's "Settings:" commands).
  useEffect(() => {
    const jump = (e: Event) => {
      const at = locateSetting((e as CustomEvent<string>).detail);
      if (at) open(at.chapter.id, { group: at.group?.id, setting: at.setting?.label });
    };
    window.addEventListener("biblelm:setting", jump);
    return () => window.removeEventListener("biblelm:setting", jump);
  }, []);

  const hits = useMemo(() => findSettings(query), [query]);
  const nodes: SettingsTreeNode[] = useMemo(() => {
    if (!query.trim()) return SETTINGS.map((c) => ({ id: c.id, label: c.label, mark: c.numeral, children: c.groups.map((g) => ({ id: g.id, label: g.label })) }));
    return SETTINGS.filter((c) => hits.some((h) => h.chapter.id === c.id)).map((c) => ({
      id: c.id,
      label: c.label,
      mark: c.numeral,
      children: hits.filter((h) => h.chapter.id === c.id).map((h) => ({ id: `${h.group.id}:${h.setting.label}`, label: h.setting.label, meta: h.setting.label === h.group.label ? undefined : h.group.label })),
    }));
  }, [query, hits]);

  const pick = (c: string, s: string | null) => {
    if (query.trim() && s) {
      const [group, setting] = [s.slice(0, s.indexOf(":")), s.slice(s.indexOf(":") + 1)];
      setQuery("");
      open(c as ChapterId, { group, setting });
      return;
    }
    if (s) open(c as ChapterId, { group: s });
    else if (c !== chapter) open(c as ChapterId);
  };

  const ch = SETTINGS.find((c) => c.id === chapter)!;

  return (
    // PlatePage pads for a centred column; this one is left-aligned (R4.2),
    // tree, page and gutters about 70rem together, so it needs one plate's width, not two.
    <PlatePage plate={plate} corner="tr" column="calc(70rem - min(28%, 20rem))">
      <div className="relative flex w-full gap-x-12 gap-y-8 px-(--gutter) pb-24 pt-(--page-top) max-md:flex-col">
        <aside className="md:sticky md:top-0 md:w-60 md:shrink-0 md:self-start md:pt-1">
          <h1 className="flex items-center gap-3 font-blackletter text-4xl">
            <PageMark page="settings" />
            Settings
          </h1>
          <div className="relative mt-5 mb-3">
            <Icon name="search" size="sm" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && hits[0]) pick(hits[0].chapter.id, `${hits[0].group.id}:${hits[0].setting.label}`);
                if (e.key === "Escape") setQuery("");
              }}
              placeholder="Find a setting"
              aria-label="Find a setting"
              className="h-8 pl-8"
            />
          </div>
          {query.trim() && hits.length === 0 ? (
            <p className="px-2 py-3 font-garamond text-sm italic text-muted-foreground">Nothing by that name.</p>
          ) : (
            <SettingsTree nodes={nodes} chapter={chapter} section={query.trim() ? null : section} onSelect={pick} openAll={!!query.trim()} />
          )}
        </aside>

        <div ref={page} className="min-w-0 flex-1 scroll-mt-6">
          <SettingsPage
            key={chapter}
            className="max-w-190 p-0"
            title={
              <span className="flex items-baseline gap-3 font-garamond text-4xl font-normal">
                <span className="text-2xl text-muted-foreground">{ch.numeral}</span>
                {ch.label}
              </span>
            }
            description={ch.description}
          >
            <Chapter id={chapter} />
          </SettingsPage>
        </div>
      </div>
    </PlatePage>
  );
}

function Chapter({ id }: { id: ChapterId }) {
  switch (id) {
    case "reading":
      return <Reading />;
    case "appearance":
      return <Appearance />;
    case "machine":
      return <Machine />;
    case "you":
      return <You />;
    case "subrosa":
      return <SubRosaSettings />;
    case "developer":
      return <DeveloperSettings />;
    case "about":
      return <About />;
  }
}

// ── I. Reading ─────────────────────────────────────────────────────────────

function Reading() {
  const study = useStudy();
  const [catalog] = useCatalog();
  return (
    <>
      <Group id="text" title="The text">
        <Row id="Reading face">
          <Segmented
            label="Face"
            size="sm"
            value={study.face}
            onChange={(face) => study.set({ face })}
            segments={[
              { id: "garamond", label: "Garamond" },
              { id: "fell", label: "Fell English" },
              { id: "gothic", label: "Gothic" },
            ]}
          />
        </Row>
        <Row id="Text size" description="The size of Scripture in the reader and the verse panel.">
          <div className="flex w-full items-center gap-3">
            <Slider aria-label="Text size" className="flex-1" min={14} max={28} step={1} value={[study.textSize]} onValueChange={([v]) => study.set({ textSize: v })} />
            <span className="w-11 text-right text-sm tabular-nums text-muted-foreground">{study.textSize} px</span>
          </div>
        </Row>
        <Row id="Red letter" description="The words of Christ in red, in the KJV and WEB.">
          <Switch aria-label="Red letter" checked={study.redLetter} onCheckedChange={(redLetter) => study.set({ redLetter })} />
        </Row>
        <Row id="Two columns" label="Two columns, like a printed Bible">
          <Switch aria-label="Two columns" checked={study.columns} onCheckedChange={(columns) => study.set({ columns })} />
        </Row>
      </Group>

      <Group id="canon" title="Canon">
        {SHELVES.map((s) => (
          <Row key={s.id} id={s.label} description={s.blurb}>
            <Switch
              aria-label={s.label}
              checked={study.shelves.includes(s.id)}
              disabled={s.id === "protestant"}
              onCheckedChange={(on) => study.set({ shelves: on ? [...study.shelves, s.id] : study.shelves.filter((x) => x !== s.id) })}
            />
          </Row>
        ))}
        <p className="py-3 text-xs text-muted-foreground">
          Which books appear in reading, search and topics. Books on a hidden shelf never mix into results; search lists them apart, under “Also found in”. A
          notebook can keep its own canon.
        </p>
      </Group>

      <Group id="translations" title={`Translations · ${catalog?.length ?? 0} on this computer`}>
        {catalog?.map((t) => (
          <SettingRow
            key={t.id}
            label={
              <>
                {t.name} <span className="font-normal text-muted-foreground">· {t.abbr} · {t.language} · {t.year}</span>
              </>
            }
            description={
              <>
                {t.note && <span className="block">{t.note}</span>}
                <span className="block text-[11px] text-muted-foreground/80">
                  {t.books.length} books, {t.verses.toLocaleString()} verses · {t.licence} ·{" "}
                  <a href={t.source} target="_blank" rel="noreferrer" className="underline">eBible.org</a>
                  {t.hash && (
                    <span title="The first digits of the SHA-256 of the text: notes about a translation's wording record it, so they know which edition they were written against.">
                      {" "}· Edition <code className="font-mono">{t.hash}</code>
                    </span>
                  )}
                </span>
              </>
            }
          >
            {study.translation === t.id ? (
              <Badge variant="brand">Reading</Badge>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => study.set({ translation: t.id })}>Read in this</Button>
            )}
          </SettingRow>
        ))}
      </Group>
    </>
  );
}

// ── II. Appearance ─────────────────────────────────────────────────────────

function Appearance() {
  const study = useStudy();
  const theme = useTheme();
  const [scheme, setScheme] = useScheme();
  return (
    <>
      <Group id="scheme" title="Scheme">
        {study.subRosa ? (
          <Row id="Scheme" description="Sub Rosa keeps its own colours until you come out from under the rose.">
            <span className="text-xs text-muted-foreground">Sub Rosa</span>
          </Row>
        ) : (
          <Row id="Scheme" description={SCHEMES.find((x) => x.id === scheme)?.blurb}>
            <Segmented label="Scheme" size="sm" value={scheme} onChange={setScheme} segments={SCHEMES.map((x) => ({ id: x.id, label: x.label }))} />
          </Row>
        )}
        {!study.subRosa && scheme !== "tenebrae" && (
          <Row id="Follow the system's light and dark">
            <Switch aria-label="Follow the system's light and dark" checked={theme.mode === "system"} onCheckedChange={(on) => theme.setMode(on ? "system" : theme.resolvedMode)} />
          </Row>
        )}
      </Group>

      <Group id="pictures" title="Pictures">
        <Row id="Illustrations" description="Engravings and woodcuts beside the passages, the paintings that open their chapters, and the scenes on each page.">
          <Segmented
            label="Illustrations"
            size="sm"
            value={study.illustrations}
            onChange={(illustrations) => study.set({ illustrations })}
            segments={[
              { id: "full", label: "Full" },
              { id: "margins", label: "Margins only" },
              { id: "off", label: "Off" },
            ]}
          />
        </Row>
        <Row id="Ornaments" description="The small dithered devices: headpieces, the evangelists' emblems, the mark beside each page in the sidebar.">
          <Switch aria-label="Ornaments" checked={study.ornaments} onCheckedChange={(ornaments) => study.set({ ornaments })} />
        </Row>
      </Group>

      <Group id="layout" title="Layout">
        <Row
          id="Interface size"
          description={`Menus, panels and pages together. Auto follows the window's width (now ${interfaceScaleLabel(theme.interfaceScale)}); ${MOD_KEY}+= and ${MOD_KEY}+- step it, ${MOD_KEY}+0 returns to Auto.`}
        >
          <Segmented
            label="Interface size"
            size="sm"
            value={String(theme.interfaceSize)}
            onChange={(v) => theme.setInterfaceSize(parseInterfaceSize(v))}
            segments={[{ id: "auto", label: "Auto" }, ...INTERFACE_SCALES.map((s) => ({ id: String(s), label: interfaceScaleLabel(s) }))]}
          />
        </Row>
        <Row id="Compact spacing" description="Tighter margins and lines, for a small screen.">
          <Switch aria-label="Compact spacing" checked={study.compact} onCheckedChange={(compact) => study.set({ compact })} />
        </Row>
        <Row id="Fold the sidebar to icons" description="It folds by itself on a narrow window.">
          <Switch aria-label="Fold the sidebar to icons" checked={study.sidebarFolded} onCheckedChange={(sidebarFolded) => study.set({ sidebarFolded })} />
        </Row>
      </Group>

      <Group id="power" title="Power">
        <Row id="Save battery" description="The pictures hold still and glass loses its blur. Auto does this on battery power.">
          <Segmented
            label="Save battery"
            size="sm"
            value={study.saver}
            onChange={(saver) => study.set({ saver })}
            segments={[
              { id: "auto", label: "Auto" },
              { id: "on", label: "Always" },
              { id: "off", label: "Never" },
            ]}
          />
        </Row>
      </Group>
    </>
  );
}

// ── III. Machine help ──────────────────────────────────────────────────────

function Machine() {
  const study = useStudy();
  const [jev, setJev] = useState<boolean | null>(null);
  const [bypass, setBypass] = useState(false);
  useEffect(() => {
    jevAvailable().then(setJev);
  }, []);
  return (
    <>
      <Group id="lab" title="The Lab">
        <Row id="Lab in the sidebar" description="Where you train and look inside a small model of your own. Off keeps the sidebar to study.">
          <Switch aria-label="Lab in the sidebar" checked={study.showLab} onCheckedChange={(showLab) => study.set({ showLab })} />
        </Row>
      </Group>

      <Group id="meaning" title="Search by meaning">
        <Row id="Semantic search" description="A small embedding model (bge-small, MIT) that runs on this computer. Finds verses by meaning.">
          <span className="text-xs text-success">On, offline</span>
        </Row>
      </Group>

      <Group id="jev" title="Jev">
        <Row id="Jev" label="Jev (TypeSafe)" description="Bounded judgments only: how to read a query, how to rank candidate verses. Uses your TypeSafe key, set under Keys.">
          <div className="flex items-center gap-3">
            <span className={jev ? "text-xs text-success" : "text-xs text-muted-foreground"}>
              {jev === null ? "Checking…" : jev ? "Key found" : IN_TAURI ? "No key found" : "Desktop only"}
            </span>
            {jev && (
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Switch size="sm" checked={bypass} onCheckedChange={(b) => { setBypass(b); setJevBypass(b); }} /> Bypass
              </label>
            )}
          </div>
        </Row>
        {jev && (
          <div className="py-4">
            <JevUses />
          </div>
        )}
      </Group>

      <Group id="keys" title="Keys">
        <JevKey onChange={setJev} />
      </Group>
    </>
  );
}

// ── IV. You ────────────────────────────────────────────────────────────────

function You() {
  const study = useStudy();
  const [dataDir, setDataDir] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    backend.dataDir().then(setDataDir).catch(() => {});
  }, []);
  return (
    <>
      <Group id="name" title="Name">
        <Row id="Your name" description="Printed on the title page of a notebook. Stays on this computer." align="stretch">
          <Input aria-label="Your name" value={study.name} onChange={(e) => study.set({ name: e.target.value })} placeholder="Optional" className="h-8" />
        </Row>
      </Group>
      <Group id="notes" title="Your notes">
        <Row
          id="Notes folder"
          description={
            dataDir ? (
              <>
                Your notebooks, with fourteen daily backups: <code className="break-all font-mono text-xs">{dataDir}</code>
              </>
            ) : (
              "Your notebooks and their fourteen daily backups live in the desktop app's data folder. In a browser they stay in this browser."
            )
          }
        >
          {dataDir && (
            <Button variant="ghost" size="sm" onClick={async () => setCopied(await copyText(dataDir))}>
              <Icon name={copied ? "success" : "copy"} size="sm" /> {copied ? "Copied" : "Copy the path"}
            </Button>
          )}
        </Row>
      </Group>
    </>
  );
}

// ── VII. About ─────────────────────────────────────────────────────────────

function About() {
  const study = useStudy();
  return (
    <Group id="credits" title="Credits">
      <div data-setting="About" className="space-y-2 py-4 text-sm">
        <RoseMark label="BibleLM" className="float-right mb-2 ml-6 size-44" />
        <p>
          <span className="font-blackletter text-lg">BibleLM</span> is a study tool and a programming project: a small language model trained from scratch on
          Scripture, inside an illustrated Bible. The machine finds; Scripture speaks.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          <li>Texts: public domain, from eBible.org. 1 Enoch: R. H. Charles's translation (SPCK, 1917), public domain, via Project Gutenberg.</li>
          <li>Cross references and topics: OpenBible.info, CC-BY.</li>
          <li>Illustrations: Gustave Doré, La Grande Bible de Tours (1866), public domain, via Wikimedia Commons.</li>
          <li>Woodcuts and engravings: Albrecht Dürer (the Met, CC0), Julius Schnorr von Carolsfeld, William Blake (Yale Center for British Art, CC0), the Nuremberg Chronicle, the 1534 Luther Bible, Matthäus Merian's Vision of Ezekiel (1630) and the four evangelists (Rijksmuseum, CC0); public domain, via Wikimedia Commons.</li>
          <li>Paintings: Caravaggio, Rembrandt, Honthorst, Georges de La Tour and John Martin, public domain (Wikimedia Commons; the Met, the Rijksmuseum and the National Gallery of Art, CC0).</li>
          {study.subRosa && (
            <li>
              Under the rose: Doré's Inferno, Louis Le Breton's demons for the Dictionnaire infernal (1863), Dürer, Schongauer, Bruegel, Callot, Goya, Blake and
              Éliphas Lévi in engraving; Bosch, Bruegel, Memling, Michelangelo, Signorelli, Giotto, Fra Angelico, Lochner, van Eyck, Botticelli, Raphael, Blake and
              John Martin in paint. Public domain, via Wikimedia Commons (the Met and the National Gallery of Art, CC0).
            </li>
          )}
          <li>Places: OpenBible.info Bible Geocoding Data, CC BY 4.0. Coastlines and rivers: Natural Earth, public domain.</li>
          <li>People and the Hebrew and Greek interlinear: STEPBible (Tyndale House), TIPNR, TAHOT and TAGNT, CC BY 4.0.</li>
          <li>Daily Office: the Book of Common Prayer (1979), public domain; JSON by Reuben Lillie, MIT.</li>
          <li>Moby-Dick (the Bible-codes control text): Project Gutenberg, public domain.</li>
          <li>Faces: UnifrakturMaguntia, Grenze Gotisch, IM Fell English, EB Garamond (SIL Open Font License).</li>
          <li>Strong's dictionaries: Open Scriptures JSON edition, CC-BY-SA.</li>
          <li>Embeddings: BAAI bge-small-en-v1.5 (MIT).</li>
        </ul>
      </div>
    </Group>
  );
}

const SET_KEY = '[Environment]::SetEnvironmentVariable("TYPESAFE_API_KEY", "paste-your-key-here", "User")';

const SOURCE_LABEL: Record<NonNullable<JevKeySource>, string> = {
  keychain: "Saved in your system keychain",
  environment: "Read from TYPESAFE_API_KEY in your environment",
};

/**
 * The TypeSafe key for Jev. Typed here once and handed to Rust, which keeps it
 * in the system keychain (Windows Credential Manager, the macOS Keychain); the
 * page can save or remove a key but never reads one back.
 */
function JevKey({ onChange }: { onChange: (on: boolean) => void }) {
  const [source, setSource] = useState<JevKeySource | undefined>(undefined);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [showEnv, setShowEnv] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    backend.jevKeySource().then(setSource).catch(() => setSource(null));
  }, []);
  const refresh = async () => {
    setSource(await backend.jevKeySource().catch(() => null));
    onChange(await recheckJev());
  };
  const save = async () => {
    setBusy(true);
    try {
      await backend.jevKeySave(draft);
      setDraft("");
      await refresh();
      toast.success("Key saved", { description: "Kept in your system keychain." });
    } catch (e) {
      toast.error("Could not save the key", { description: String(e) });
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    try {
      await backend.jevKeyClear();
      await refresh();
      toast.success("Key removed from the keychain");
    } catch (e) {
      toast.error("Could not remove the key", { description: String(e) });
    } finally {
      setBusy(false);
    }
  };

  if (!IN_TAURI) {
    return (
      <Row id="TypeSafe key for Jev" description="Kept in your system keychain, and saved from the desktop app.">
        <span className="text-xs text-muted-foreground">Desktop only</span>
      </Row>
    );
  }
  return (
    <>
      <Row
        id="TypeSafe key for Jev"
        align="stretch"
        description={source ? SOURCE_LABEL[source] : source === null ? "No key yet. Get one from typesafe.ai and paste it here." : "Checking…"}
      >
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (draft.trim()) save();
          }}
        >
          <Input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={source === "keychain" ? "Paste a new key to replace it" : "Paste your key"}
            aria-label="TypeSafe key"
            className="h-8 min-w-0 flex-1 font-mono"
          />
          <Button type="submit" size="sm" disabled={busy || !draft.trim()}>
            <Icon name="key" size="sm" /> Save
          </Button>
          {source === "keychain" && (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={remove}>
              Remove
            </Button>
          )}
        </form>
      </Row>
      <div className="space-y-3 py-4 text-xs text-muted-foreground">
        <p>
          The key goes straight to your system keychain and is never shown again or stored by the page. Only the request (your query, or verse references with
          their text) leaves this computer.
        </p>
        {source !== "keychain" && (
          <div>
            <button type="button" className="underline-offset-2 hover:underline" onClick={() => setShowEnv((v) => !v)}>
              {showEnv ? "Hide" : "Or set it as an environment variable"}
            </button>
            {showEnv && (
              <div className="mt-2 flex items-start gap-2">
                <code className="min-w-0 flex-1 break-all rounded-md bg-muted/40 px-2 py-1.5 font-mono text-xs text-foreground">{SET_KEY}</code>
                <Button variant="ghost" size="sm" onClick={async () => setCopied(await copyText(SET_KEY))}>
                  <Icon name={copied ? "success" : "copy"} size="sm" /> {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

/** Where Jev is called, so nothing it does is a surprise. */
function JevUses() {
  return (
    <div className="rounded-xl bg-muted/40 p-4 text-sm">
      <p className="font-medium text-foreground">Where Jev is used</p>
      <ul className="mt-2 space-y-2 text-muted-foreground">
        <li>
          <span className="text-foreground">Reading your query, as you type.</span> On Search and the Home search box, a moment after you stop typing Jev is
          asked one question: are you after exact words, a theme, a story or person, or an answer? The reading appears as an emblem whose clarity reflects
          its certainty. Each query is asked once.
        </li>
        <li>
          <span className="text-foreground">The verse panel.</span> Opening a verse asks what kind of passage it is (narrative, law, praise, lament,
          prophecy, teaching, prayer or a list), sending its reference and text. Shown as Jev's reading, never as part of the verse. The same moment,
          its top twelve cross references are scored for how closely each speaks to it and reordered (reader votes are one click away).
        </li>
        <li>
          <span className="text-foreground">Search lanes.</span> The reading of your query also orders the live result lanes and sets how clearly the
          plate beside them resolves.
        </li>
        <li>
          <span className="text-foreground">The Lab's Generate tab.</span> When the model finishes writing, Jev scores the generated text for sounding like
          the King James Version and for making sense: the machine judging the machine.
        </li>
        <li>
          <span className="text-foreground">Search, Rank with Jev.</span> Only when you press it: the top 20 meaning results are sent with your query, and Jev
          rates how directly each verse speaks to it. The list is reordered; every result is still a real verse.
        </li>
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        Nothing else calls it: not the reader's text, notes, topics, training or the Lab's other tabs. Bypass turns it off for this session.
      </p>
    </div>
  );
}
