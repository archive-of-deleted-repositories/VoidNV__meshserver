import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));
const shim = (name: string) => path.resolve(root, "src/lib/shims", name);

export default defineConfig({
  root,
  plugins: [react()],
  resolve: {
    alias: {
      "@tauri-apps/api/window": shim("window.ts"),
      "@tauri-apps/plugin-dialog": shim("dialog.ts"),
      "@tauri-apps/plugin-opener": shim("opener.ts")
    }
  },
  server: {
    port: 5174,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        ws: true
      },
      "/ws": {
        target: "ws://127.0.0.1:8787",
        ws: true
      }
    }
  },
  build: {
    outDir: "../dist/client",
    emptyOutDir: true
  }
});
