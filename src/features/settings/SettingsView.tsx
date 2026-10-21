import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Field,
  Icon,
  IN_TAURI,
  Panel,
  Segmented,
  Slider,
  Switch,
  useTheme,
} from "@nexis/design";
import { PlatePage, usePagePlate } from "@/art/Art";
import { PAGE_PLATES } from "@/lib/art";
import { backend } from "@/lib/backend";
import { SHELVES } from "@/lib/canon";
import { useCatalog } from "@/lib/hooks";
import { jevAvailable, setJevBypass } from "@/lib/jev";
import { useStudy } from "@/store/study";
import { DeveloperPanel } from "./DeveloperPanel";

export function SettingsView() {
  const study = useStudy();
  const theme = useTheme();
  const [catalog] = useCatalog();
  const plate = usePagePlate(PAGE_PLATES.settings);
  const [jev, setJev] = useState<boolean | null>(null);
  const [bypass, setBypass] = useState(false);
  const [dataDir, setDataDir] = useState<string | null>(null);
  useEffect(() => {
    jevAvailable().then(setJev);
    backend.dataDir().then(setDataDir).catch(() => {});
  }, []);

  return (
    <PlatePage plate={plate} corner="tr">
      <div className="relative mx-auto w-full max-w-3xl space-y-6 px-8 pb-24 pt-10">
        <h1 className="font-blackletter text-4xl">Settings</h1>

        <Panel title="Appearance">
          <div className="space-y-5">
            <Field label="Light and dark" inline>
              <Segmented
                label="Mode"
                size="sm"
                value={theme.mode}
                onChange={theme.setMode}
                segments={[
                  { id: "light", label: "Vellum" },
                  { id: "dark", label: "Nocturne" },
                  { id: "system", label: "System" },
                ]}
              />
            </Field>
            <Field label="Illustrations" hint="Doré's engravings beside the passages, and the dithered scenes on Home and the Lab." inline>
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
            </Field>
            <Field label="Reading face" inline>
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
            </Field>
            <Field label={`Text size · ${study.textSize}px`} inline>
              <Slider className="w-56" min={14} max={28} step={1} value={[study.textSize]} onValueChange={([v]) => study.set({ textSize: v })} />
            </Field>
            <Field label="Red letter" hint="The words of Christ in red, in the KJV and WEB." inline>
              <Switch checked={study.redLetter} onCheckedChange={(redLetter) => study.set({ redLetter })} />
            </Field>
            <Field label="Two columns, like a printed Bible" inline>
              <Switch checked={study.columns} onCheckedChange={(columns) => study.set({ columns })} />
            </Field>
          </div>
        </Panel>

        <Panel title="Canon" meta="which books appear in reading, search and topics">
          <div className="space-y-3">
            {SHELVES.map((s) => (
              <Field key={s.id} label={s.label} hint={s.blurb} inline>
                <Switch
                  checked={study.shelves.includes(s.id)}
                  disabled={s.id === "protestant"}
                  onCheckedChange={(on) => study.set({ shelves: on ? [...study.shelves, s.id] : study.shelves.filter((x) => x !== s.id) })}
                />
              </Field>
            ))}
            <p className="text-xs text-muted-foreground">
              Books on a hidden shelf never mix into results; search lists them apart, under “Also found in”. A notebook can keep its own canon.
            </p>
          </div>
        </Panel>

        <Panel title="Translations" meta={`${catalog?.length ?? 0} on this computer`} flush>
          <div className="divide-y divide-border/60">
            {catalog?.map((t) => (
              <div key={t.id} className="flex items-start gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">
                    {t.name} <span className="text-muted-foreground">· {t.abbr} · {t.language} · {t.year}</span>
                  </p>
                  {t.note && <p className="mt-0.5 text-xs text-muted-foreground">{t.note}</p>}
                  <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                    {t.books.length} books, {t.verses.toLocaleString()} verses · {t.licence} ·{" "}
                    <a href={t.source} target="_blank" rel="noreferrer" className="underline">eBible.org</a>
                  </p>
                </div>
                {study.translation === t.id ? (
                  <Badge variant="brand">Reading</Badge>
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => study.set({ translation: t.id })}>Read in this</Button>
                )}
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Machine help" meta="small models only, always citing real verses">
          <div className="space-y-5">
            <Field label="Semantic search" hint="A small embedding model (bge-small, MIT) that runs on this computer. Finds verses by meaning." inline>
              <span className="text-xs text-success">On, offline</span>
            </Field>
            <Field
              label="Jev (TypeSafe)"
              hint="Bounded judgments only: how to read a query, how to rank candidate verses. Reads TYPESAFE_API_KEY from your environment; the key never enters the app."
              inline
            >
              <div className="flex items-center gap-2">
                <span className={jev ? "text-xs text-success" : "text-xs text-muted-foreground"}>
                  {jev === null ? "Checking…" : jev ? "Key found" : IN_TAURI ? "No key found" : "Desktop only"}
                </span>
                {jev && (
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Switch size="sm" checked={bypass} onCheckedChange={(b) => { setBypass(b); setJevBypass(b); }} /> Bypass
                  </label>
                )}
              </div>
            </Field>
            {jev === false && <JevSetup />}
            {jev && <JevUses />}
          </div>
        </Panel>

        <DeveloperPanel />

        <Panel title="About">
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-blackletter text-lg">BibleLM</span> is a study tool and a programming project: a small language model trained from
              scratch on Scripture, inside an illustrated Bible. The machine finds; Scripture speaks.
            </p>
            <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
              <li>Texts: public domain, from eBible.org.</li>
              <li>Cross references and topics: OpenBible.info, CC-BY.</li>
              <li>Illustrations: Gustave Doré, La Grande Bible de Tours (1866), public domain, via Wikimedia Commons.</li>
              <li>Faces: UnifrakturMaguntia, Grenze Gotisch, IM Fell English, EB Garamond (SIL Open Font License).</li>
              <li>Strong's dictionaries: Open Scriptures JSON edition, CC-BY-SA.</li>
              <li>Embeddings: BAAI bge-small-en-v1.5 (MIT).</li>
            </ul>
            {dataDir && (
              <p className="flex items-center gap-1.5 pt-2 text-xs text-muted-foreground">
                <Icon name="folder" size="xs" /> Your notes and backups: <code className="font-mono">{dataDir}</code>
              </p>
            )}
          </div>
        </Panel>
      </div>
    </PlatePage>
  );
}

const SET_KEY = '[Environment]::SetEnvironmentVariable("TYPESAFE_API_KEY", "paste-your-key-here", "User")';

/**
 * There is deliberately no field for the key: it stays in your environment,
 * Rust reads it, and the page never holds it (AGENTS.md). This says how.
 */
function JevSetup() {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-xl bg-muted/40 p-4 text-sm">
      <p className="font-medium text-foreground">Turning Jev on</p>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-muted-foreground">
        <li>
          Get a key from TypeSafe (<span className="font-mono text-xs">typesafe.ai</span>).
        </li>
        <li>
          In PowerShell, run this with your key in place of the placeholder. It saves the key for your Windows user only:
          <div className="mt-1.5 flex items-start gap-2">
            <code className="min-w-0 flex-1 break-all rounded-md bg-background px-2 py-1.5 font-mono text-xs text-foreground">{SET_KEY}</code>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigator.clipboard.writeText(SET_KEY).then(() => setCopied(true))}
            >
              <Icon name={copied ? "success" : "copy"} size="sm" /> {copied ? "Copied" : "Copy"}
            </Button>
          </div>
        </li>
        <li>Quit and reopen BibleLM (and any terminal that started it), so it reads the new variable.</li>
      </ol>
      <p className="mt-3 text-xs text-muted-foreground">
        The key is never shown, stored or sent by the page. Only the request (your query, or verse references with their text) leaves this computer.
      </p>
    </div>
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
          asked one question: are you after exact words, a theme, a story or person, or an answer? The odds and the round trip in milliseconds show under the
          box. Each query is asked once; it changes no results.
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
