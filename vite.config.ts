import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

// Dev: /admin e /admin/<rota> caem no admin/index.html (no deploy, o rewrite do vercel.json faz isso).
const adminFallback = (): Plugin => ({
  name: "admin-spa-fallback",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const [path, query = ""] = (req.url ?? "").split("?");
      if (path === "/admin" || (path.startsWith("/admin/") && !/\.[a-z0-9]+$/i.test(path))) {
        req.url = `/admin/index.html${query ? `?${query}` : ""}`;
      }
      next();
    });
  },
});

export default defineConfig({
  plugins: [react(), adminFallback()],
  server: { port: 5173 },
  build: {
    manifest: true,
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        admin: resolve(import.meta.dirname, "admin/index.html"),
      },
    },
  },
});
