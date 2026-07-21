import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

// GitHub Pages project sites are served from https://<user>.github.io/<repo>/ —
// a sub-path, not the domain root — so every asset URL and client-side route
// needs that prefix baked in at build time. The GitHub Actions workflow sets
// VITE_BASE_PATH to "/<repo-name>/" automatically; locally it just falls back
// to "/" so `npm run dev` / `npm run build` both work with no extra setup.
const BASE_PATH = process.env.VITE_BASE_PATH ?? "/";

export default defineConfig({
  base: BASE_PATH,
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      // nitro/vite builds from this.
      server: { entry: "server" },
      router: { basepath: BASE_PATH },
      // GitHub Pages only serves static files (no Node server), so the production
      // build is pre-rendered to a static shell that hydrates into a full SPA on
      // load, instead of relying on a live server to render each request.
      spa: { enabled: true },
    }),
    viteReact(),
    nitro(),
  ],
});
