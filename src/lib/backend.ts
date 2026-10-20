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

// ── secrets (opt-in model keys) ──────────────────────────────────────────

async function secretGet(name: string): Promise<string | null> {
  if (!IN_TAURI) return sessionStorage.getItem(`biblelm:secret:${name}`);
  return tauriInvoke<string | null>("secret_get", { name });
}

async function secretSet(name: string, value: string | null): Promise<void> {
  if (!IN_TAURI) {
    if (value) sessionStorage.setItem(`biblelm:secret:${name}`, value);
    else sessionStorage.removeItem(`biblelm:secret:${name}`);
    return;
  }
  return tauriInvoke("secret_set", { name, value });
}

/** Opt-in grounded commentary: the request is made by Rust, never from the page. */
async function commentary(req: { system: string; prompt: string; model: string }): Promise<string> {
  if (!IN_TAURI) throw new Error("Commentary calls the model from the desktop app, which keeps your key in the OS keychain.");
  return tauriInvoke<string>("commentary", req);
}

/** Jev (TypeSafe) bounded judgments: made by Rust with the user's own key. */
async function jev(req: { task: string; input: unknown }): Promise<unknown> {
  if (!IN_TAURI) throw new Error("Jev runs from the desktop app with TYPESAFE_API_KEY from your environment.");
  return tauriInvoke("jev", req);
}

async function jevAvailable(): Promise<boolean> {
  return IN_TAURI ? tauriInvoke<boolean>("jev_available") : false;
}

export const backend = {
  notesLoad,
  notesSave,
  exportMarkdown,
  dataDir,
  secretGet,
  secretSet,
  commentary,
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
  return Promise.reject(new Error(LAB_NEEDS_DESKTOP));
}

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
