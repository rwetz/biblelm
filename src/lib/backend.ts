// The one door to the Rust backend. Everything that needs the desktop app
// (the Lab's Python workers, durable notes on disk) goes through here, and
// each call has a browser fallback so `pnpm dev` runs the whole study app
// without Tauri: notes live in localStorage, Lab calls explain themselves.
//
// Changing a Rust command's argument or return shape means changing its type
// here and its mock in the same commit (AGENTS.md).

import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { listen as tauriListen, type EventCallback, type UnlistenFn } from "@tauri-apps/api/event";
import { IN_TAURI } from "@nexis/design";

export const LAB_NEEDS_DESKTOP = "The Lab trains and runs the model through Python, so it needs the desktop app.";

// ── notes ────────────────────────────────────────────────────────────────

/** The notebook file: opaque JSON to Rust, which only stores it safely. */
export type NotesFile = { version: number; [k: string]: unknown };

const NOTES_KEY = "biblelm:notes";

async function notesLoad(): Promise<NotesFile | null> {
  if (IN_TAURI) {
    const raw = await tauriInvoke<string | null>("notes_load");
    return raw ? (JSON.parse(raw) as NotesFile) : null;
  }
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? (JSON.parse(raw) as NotesFile) : null;
  } catch {
    return null;
  }
}

async function notesSave(file: NotesFile): Promise<void> {
  const json = JSON.stringify(file);
  if (IN_TAURI) return tauriInvoke("notes_save", { json });
  localStorage.setItem(NOTES_KEY, json);
}

/** Write a notebook export (a folder of Markdown files). Desktop only. */
async function exportMarkdown(files: { path: string; body: string }[]): Promise<string | null> {
  if (!IN_TAURI) return null;
  return tauriInvoke<string>("notes_export_markdown", { files });
}

async function dataDir(): Promise<string | null> {
  return IN_TAURI ? tauriInvoke<string>("app_data_dir") : null;
}

/** Jev (TypeSafe) bounded judgments: made by Rust with the user's own key. */
async function jev(req: { task: string; input: unknown }): Promise<unknown> {
  if (!IN_TAURI && LAB_DEMO) return demoJev(req);
  if (!IN_TAURI) throw new Error("Jev runs from the desktop app with TYPESAFE_API_KEY from your environment.");
  return tauriInvoke("jev", req);
}

async function jevAvailable(): Promise<boolean> {
  return IN_TAURI ? tauriInvoke<boolean>("jev_available") : LAB_DEMO;
}

export const backend = {
  notesLoad,
  notesSave,
  exportMarkdown,
  dataDir,
  jev,
  jevAvailable,
};

// ── the Lab (Python workers) ─────────────────────────────────────────────

/**
 * `invoke` for the Lab's commands. In a browser every Lab command rejects with
 * a clear reason, which the Lab views already surface as their error states.
 */
export function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (IN_TAURI) return tauriInvoke<T>(cmd, args);
  if (LAB_DEMO && cmd in labDemo) return labDemo[cmd](args) as Promise<T>;
  return Promise.reject(new Error(LAB_NEEDS_DESKTOP));
}

// `pnpm dev` with ?demo in the URL: canned Lab answers, so its screens can be
// designed and checked in a browser. Never in a build.
const LAB_DEMO = import.meta.env.DEV && typeof location !== "undefined" && new URLSearchParams(location.search).has("demo");
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const DEMO_KJV = { id: "kjv", name: "King James Version", language: "English", license: "Public domain", verified: true, hasUrl: true, downloaded: true, sizeBytes: 4_332_584, charCount: 4_332_584, wordCount: 821_496, tokenCount: 4_332_584, vocabSize: 74 };
/** Canned readings for ?demo, rough enough to watch the sigils move. */
async function demoJev(req: { task: string; input: unknown }): Promise<unknown> {
  await wait(110);
  const choice = (probabilities: Record<string, number>) => {
    const top = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0][0];
    return { choice: top, confidence: probabilities[top], probabilities };
  };
  if (req.task === "route") {
    const q = String((req.input as { query?: string }).query ?? "").toLowerCase();
    const p = { words: 0.4, theme: 0.25, story: 0.2, question: 0.15 };
    if (/^(who|what|why|how|is|does|can)\b|\?$/.test(q)) Object.assign(p, { words: 0.04, theme: 0.08, story: 0.04, question: 0.84 });
    else if (/\b(david|goliath|moses|prodigal|noah|jonah|ruth|esther|daniel)\b/.test(q)) Object.assign(p, { words: 0.05, theme: 0.04, story: 0.88, question: 0.03 });
    else if (/\b(about|feel|when|love|fear|anxious|grace|hope)\b/.test(q)) Object.assign(p, { words: 0.06, theme: 0.82, story: 0.02, question: 0.1 });
    return { answers: { intent: choice(p) } };
  }
  if (req.task === "verse") return { answers: { kind: choice({ teaching: 0.86, narrative: 0.06, prayer: 0.08 }) } };
  throw new Error("The demo only reads queries and verses.");
}

const labDemo: Record<string, (args?: Record<string, unknown>) => Promise<unknown>> = {
  corpus_list: async () => [DEMO_KJV, { id: "web", name: "World English Bible", language: "English", license: "Public domain", verified: true, hasUrl: true, downloaded: false }],
  corpus_status: async () => DEMO_KJV,
  lab_engines: async () => ({ axon: null, axonText: false }),
  corpus_alphabet: async () =>
    [..." etaohnsirdl\nufm,wycgb:pv1.k2AI3;L4ODTR56JG789S0B?HMEjWFz'NPCxqZYK!U()V-Q*"].map((c, i) => [c, Math.round(746_784 * 0.86 ** i)]),
  corpus_preview: async () => "The Old Testament of the King James Version of the Bible\nThe First Book of Moses: Called Genesis\n\n1:1 In the beginning God created the heaven and the earth.",
  lab_inspect: async (a) => {
    await wait(a?.mode === "surprise" ? 4000 : 600);
    if (a?.mode !== "surprise") throw new Error("The demo only scores verses.");
    const v = (ref: string, text: string, loss: number) => ({ ref, text, loss });
    const word = "And the word of the LORD came unto me, saying,";
    return {
      mean: 1.405,
      count: 31102,
      predictable: [...["Ezekiel 12:21", "Ezekiel 13:1", "Ezekiel 14:2", "Ezekiel 15:1"].map((r) => v(r, word, 0.33)), v("Exodus 13:1", "And the LORD spake unto Moses, saying,", 0.333), v("Exodus 14:1", "And the LORD spake unto Moses, saying,", 0.333)],
      surprising: [v("Revelation 21:20", "The fifth, sardonyx; the sixth, sardius; the seventh, chrysolyte; the eighth, beryl; the ninth, a topaz; the tenth, a chrysoprasus; the eleventh, a jacinth; the twelfth, an amethyst.", 3.168), v("Nehemiah 10:17", "Ater, Hizkijah, Azzur,", 2.809), v("1 Chronicles 1:25", "Eber, Peleg, Reu,", 2.742), v("Philemon 1:24", "Marcus, Aristarchus, Demas, Lucas, my fellowlabourers.", 2.732)],
    };
  },
};

export function listen<T>(event: string, cb: EventCallback<T>): Promise<UnlistenFn> {
  if (IN_TAURI) return tauriListen<T>(event, cb);
  return Promise.resolve(() => {});
}

export type DropEvent = { type: "over" | "drop" | "leave" | "enter"; paths?: string[] };

/** Files dragged onto the window (Model import). No-op in a browser. */
export async function onFileDrop(cb: (e: DropEvent) => void): Promise<UnlistenFn> {
  if (!IN_TAURI) return () => {};
  const { getCurrentWebview } = await import("@tauri-apps/api/webview");
  return getCurrentWebview().onDragDropEvent((event) => {
    const p = event.payload as { type: DropEvent["type"]; paths?: string[] };
    cb({ type: p.type, paths: p.paths });
  });
}
