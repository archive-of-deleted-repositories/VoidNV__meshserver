import path from "node:path";
import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root,
  plugins: [react()],
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
