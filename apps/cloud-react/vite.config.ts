import path from "path"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 3000,
    // Dev server accepts any Host header, so it can be reached through
    // hostnames/reverse proxies other than localhost.
    allowedHosts: true,
    proxy: {
      // Must match the backend's PORT (cloud-be-go/.env). Override
      // with VITE_API_PROXY if you run the API elsewhere.
      "/api": {
        target: process.env.VITE_API_PROXY ?? "http://localhost:8080",
        changeOrigin: false,
        // ws:true forwards the WebSocket upgrade for the VM console
        // (/api/v1/console/terminal/ws). Prod reverse proxies must
        // likewise pass Upgrade/Connection headers on this path.
        ws: true,
      },
      // The aggregate health endpoint is mounted at the API root, not
      // under /api/v1, so it needs its own proxy entry.
      "/actuator": {
        target: process.env.VITE_API_PROXY ?? "http://localhost:8080",
        changeOrigin: false,
      },
      // FaaS control plane, reached directly (not via cloud-be-go). Port
      // matches serverless_faas/.env HTTP_PORT (8085); the api and router
      // roles share that one listener in dev, so /v1 (control API) and
      // /function + /async-function (invoke paths) all proxy to it.
      "/v1": {
        target: process.env.VITE_FAAS_PROXY ?? "http://localhost:8085",
        changeOrigin: true,
      },
      "/function": {
        target: process.env.VITE_FAAS_PROXY ?? "http://localhost:8085",
        changeOrigin: true,
      },
      "/async-function": {
        target: process.env.VITE_FAAS_PROXY ?? "http://localhost:8085",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    {
      name: "global-shim",
      transformIndexHtml() {
        return [
          {
            tag: "script",
            children: "window.global = window;",
            injectTo: "head-prepend",
          },
        ]
      },
    },
    tailwindcss(),
    react(),
  ],
  build: {
    // JS code-splitting left on (rolldown default) so the route-level lazy
    // imports in the routers actually produce separate chunks instead of one
    // monolithic bundle — the superadmin console loads only when entered.
    // cssCodeSplit stays off: a single stylesheet avoids per-chunk CSS
    // flashes and keeps Tailwind's layer ordering intact.
    cssCodeSplit: false,
  },
  // @datadack/common-ui and @datadack/serverless are linked workspace packages,
  // so Vite treats them as source and does NOT pre-bundle them at cold start —
  // it crawls them lazily. Their bare imports (radix-ui, react, cmdk, …) are
  // therefore discovered only when a route that pulls one in is first opened,
  // which triggers a mid-session re-optimization and bumps the dep browserHash.
  //
  // That bump is what produced "Invalid hook call / Cannot read properties of
  // null (reading 'useRef')": modules already in the page keep importing
  // `chunk-<hash>.js?v=<old>` while newly fetched ones ask for `?v=<new>`. The
  // browser keys ES modules by full URL *including the query*, so those are two
  // separate module instances of React with two separate dispatchers — and Vite
  // ignores `?v=` when resolving from disk, so it serves both with a 200 and the
  // page never self-heals.
  //
  // Listing the transitive deps here gets them all optimized in the first pass,
  // so the hash never changes mid-session. Keep in sync with the peer/regular
  // deps of the two packages.
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "@emotion/css/create-instance",
      // Reached transitively through @emotion/css's emotion-element; the dev
      // variant is what the dev server actually resolves, and leaving it out
      // costs a re-optimize + full reload on the first render.
      "@emotion/react/jsx-runtime",
      "@emotion/react/jsx-dev-runtime",
      "@tanstack/react-table",
      "clsx",
      "cmdk",
      "lucide-react",
      "radix-ui",
      "react-day-picker",
      "react-hook-form",
      "react-icons/si",
      "sonner",
      "tailwind-merge",
    ],
  },
  resolve: {
    // Symlinked workspace packages can otherwise resolve their own React
    // through packages/*/node_modules; one copy per app, always.
    dedupe: ["react", "react-dom"],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
