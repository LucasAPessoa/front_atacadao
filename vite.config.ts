import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { type Connect, defineConfig, type Plugin } from "vite";

// Dev e preview: /admin e /admin/<rota> caem no admin/index.html (no deploy, o rewrite do vercel.json faz isso).
const adminRewrite = (url: string | undefined) => {
  const [path, query = ""] = (url ?? "").split("?");
  if (path === "/admin" || (path.startsWith("/admin/") && !/\.[a-z0-9]+$/i.test(path)))
    return `/admin/index.html${query ? `?${query}` : ""}`;
  return url;
};

const adminFallback = (): Plugin => {
  const middleware: Connect.NextHandleFunction = (req, _res, next) => {
    req.url = adminRewrite(req.url);
    next();
  };
  return {
    name: "admin-spa-fallback",
    configureServer: (server) => void server.middlewares.use(middleware),
    configurePreviewServer: (server) => void server.middlewares.use(middleware),
  };
};

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
