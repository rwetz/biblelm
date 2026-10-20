import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: [
        "**/src-tauri/**",
        "**/.venv/**",
        // The Lab's data/ and runs/ at the repo root. Not "**/data/**": that
        // also hid public/data, so Vite never saw newly built data files.
        resolve(__dirname, "data") + "/**",
        resolve(__dirname, "runs") + "/**",
        "**/data-src/**",
        "**/art-src/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
