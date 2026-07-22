/**
 * Vite config for the static GitHub Pages demo build.
 *
 *   pnpm build:pages   →  dist-pages/
 *
 * Differences from the full-stack build (vite.config.ts):
 *  - VITE_STATIC_MODE=1: the client uses bundled lesson JSON + localStorage
 *    instead of the tRPC backend (see client/src/lib/api.ts)
 *  - base is set for project-page hosting at https://<user>.github.io/PySignal/
 *  - no Manus runtime / debug plugins
 */
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Project pages are served from /<repo>/ — override with VITE_PAGES_BASE if
  // you rename the repo or use a custom domain (then set it to "/").
  base: process.env.VITE_PAGES_BASE ?? "/PySignal/",
  define: {
    "import.meta.env.VITE_STATIC_MODE": JSON.stringify("1"),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  publicDir: path.resolve(import.meta.dirname, "client", "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist-pages"),
    emptyOutDir: true,
  },
});
