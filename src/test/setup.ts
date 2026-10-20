// jsdom has no Tauri runtime: stub every @tauri-apps module the app imports so
// views can mount. M0's typed backend wrapper (src/lib/backend.ts) will replace
// these per-command stubs with a shared mock that `pnpm dev` uses too.
import { vi } from "vitest";

// Default: behave like a backend that is not there, so views take their real
// error paths instead of choking on a shape they never receive in production.
const { invokeMock } = vi.hoisted(() => ({
  invokeMock: vi.fn(async (cmd: string, _args?: unknown): Promise<unknown> => {
    throw new Error(`no backend in tests: ${cmd}`);
  }),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke: invokeMock }));
vi.mock("@tauri-apps/api/event", () => ({ listen: vi.fn(async () => () => {}) }));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => ({
    show: async () => {},
    isMaximized: async () => false,
    onResized: async () => () => {},
    minimize: async () => {},
    toggleMaximize: async () => {},
    close: async () => {},
  }),
}));
vi.mock("@tauri-apps/api/webview", () => ({
  getCurrentWebview: () => ({ onDragDropEvent: async () => () => {} }),
}));
vi.mock("@tauri-apps/plugin-os", () => ({ platform: () => "windows" }));

// jsdom gaps that Radix and the theme provider rely on.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as typeof window.matchMedia;
