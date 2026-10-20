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
import { CornerPlate, usePagePlate } from "@/art/Art";
import { PAGE_PLATES } from "@/lib/art";
import { backend } from "@/lib/backend";
import { SHELVES } from "@/lib/canon";
import { useCatalog } from "@/lib/hooks";
import { jevAvailable, setJevBypass } from "@/lib/jev";
import { useStudy } from "@/store/study";

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
    <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
      <CornerPlate plate={plate} corner="tr" />
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
              <Badge variant="success">On, offline</Badge>
            </Field>
            <Field
              label="Jev (TypeSafe)"
              hint="Bounded judgments only: how to read a query, how to rank candidate verses. Reads TYPESAFE_API_KEY from your environment; the key never enters the app."
              inline
            >
              <div className="flex items-center gap-2">
                <Badge variant={jev ? "success" : "outline"}>{jev === null ? "…" : jev ? "Available" : IN_TAURI ? "No key in environment" : "Desktop only"}</Badge>
                {jev && (
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Switch size="sm" checked={bypass} onCheckedChange={(b) => { setBypass(b); setJevBypass(b); }} /> Bypass
                  </label>
                )}
              </div>
            </Field>
          </div>
        </Panel>

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
    </div>
  );
}
