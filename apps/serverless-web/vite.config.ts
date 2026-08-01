import { fileURLToPath, URL } from "node:url"

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

/** Control plane origin the dev server proxies API calls to. */
const CONTROL_PLANE = process.env.CONTROL_PLANE_URL ?? "http://127.0.0.1:8080"

const proxied = ["/v1", "/function", "/async-function", "/system", "/metrics"]

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
        // Stable, unhashed names: assets.go embeds dist/ and the committed
        // output should not churn on every rebuild.
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
})
