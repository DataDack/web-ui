import { fileURLToPath, URL } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

/**
 * Control plane origin the dev server proxies API calls to. 8085 matches the
 * FaaS dev default (serverless_faas/.env HTTP_PORT); the api and router roles
 * share that one listener, so the native /v1 API and the Lambda-compatible
 * /2015-03-31 surface both land there.
 */
const CONTROL_PLANE = process.env.CONTROL_PLANE_URL ?? "http://127.0.0.1:8085"

// /2015-03-31 is where the Test tab's invoke goes. The old /function and
// /async-function shorthands are gone — no route serves them upstream any more,
// so proxying them only produced 404s.
const proxied = ["/v1", "/2015-03-31", "/system", "/metrics"]

export default defineConfig({
  // The control plane serves this bundle from /admin, so every asset URL must
  // be prefixed to match. See apps/controlplane/roles/api/api.go.
  base: "/admin/",
  plugins: [
    react(),
    tailwindcss(),
    // `base: '/admin/'` means Vite serves nothing at `/admin` without the
    // trailing slash — a bare 404 that looks exactly like a broken app. Redirect
    // instead, so the slash stops being something anyone has to remember.
    {
      name: "admin-trailing-slash",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/admin") {
            res.statusCode = 302
            res.setHeader("Location", "/admin/")
            res.end()
            return
          }
          next()
        })
      },
    },
  ],
  resolve: {
    alias: [{ find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) }],
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    // Fail loudly instead of drifting to the next free port: a dev server that
    // silently moves is worse than one that refuses to start.
    strictPort: true,
    proxy: Object.fromEntries(
      proxied.map((path) => [path, { target: CONTROL_PLANE, changeOrigin: true }]),
    ),
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        // Content-hashed names.
        //
        // The previous stable names (assets/index.js) meant a deploy replaced a
        // file at a URL browsers had already cached. Nothing then tied the
        // stylesheet and the script together, so a client could hold one and
        // refetch the other and render new markup against old CSS — which is
        // exactly what happened, twice.
        //
        // Hashing makes each build a new URL: a client either has the whole
        // matched set or fetches it. It also makes long immutable caching
        // truthful, since a hashed URL genuinely never changes content. The
        // cost is that two filenames in the committed dist/ change per build,
        // which is a far smaller problem than shipping a mismatched pair.
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
})
