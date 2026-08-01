import { createRequire } from 'node:module'
import { fileURLToPath, URL } from 'node:url'

import importMetaUrlPlugin from '@codingame/esbuild-import-meta-url-plugin'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

/** Control plane origin the dev server proxies API calls to. */
const CONTROL_PLANE = process.env.CONTROL_PLANE_URL ?? 'http://127.0.0.1:8080'

const proxied = ['/v1', '/function', '/async-function', '/system', '/metrics']

/**
 * Every @codingame/* dependency, read from this app's own manifest.
 *
 * These must all be pre-bundled TOGETHER. monaco-vscode-api is ~2,300 ES
 * modules; served unbundled the browser walks a request waterfall thousands
 * deep and the editor never finishes loading. They also import each other via
 * deep paths like `@codingame/monaco-vscode-api/vscode/vs/editor/...` — which
 * fail to resolve if only *some* are pre-bundled, because the bundled half
 * emits those specifiers at runtime from inside `.vite/deps`. Bundling the
 * whole set means esbuild resolves them at build time and they never appear as
 * runtime specifiers at all.
 *
 * Deriving the list from the manifest means adding a service override later
 * cannot silently drop it out of the set.
 */
const require = createRequire(import.meta.url)
const manifest = require('./package.json') as { dependencies?: Record<string, string> }
const vscodePackages = Object.keys(manifest.dependencies ?? {}).filter((name) =>
  name.startsWith('@codingame/'),
)

export default defineConfig({
  // The control plane serves this bundle from /admin, so every asset URL must
  // be prefixed to match. See apps/controlplane/roles/api/api.go.
  base: '/admin/',
  plugins: [
    react(),
    tailwindcss(),
    // `base: '/admin/'` means Vite serves nothing at `/admin` without the
    // trailing slash — a bare 404 that looks exactly like a broken app. Redirect
    // instead, so the slash stops being something anyone has to remember.
    {
      name: 'admin-trailing-slash',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/admin') {
            res.statusCode = 302
            res.setHeader('Location', '/admin/')
            res.end()
            return
          }
          next()
        })
      },
    },
  ],
  resolve: {
    alias: [{ find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) }],
    // Two copies of VS Code's services in one page fight over the same
    // globals, so keep resolution to a single instance.
    dedupe: vscodePackages,
  },
  optimizeDeps: {
    // VS Code's modules locate their own assets with `new URL(..., import.meta.url)`,
    // which esbuild's dependency pre-bundle rewrites incorrectly without this.
    esbuildOptions: { plugins: [importMetaUrlPlugin] },
    include: vscodePackages,
    // @vscode/diff does `new URL('worker.js?esm', import.meta.url)`, which the
    // plugin above tries to resolve as a bare package and fails on. It is a
    // single small module, so leaving it unbundled costs nothing.
    exclude: ['@vscode/diff'],
  },
  worker: { format: 'es' },
  server: {
    host: '0.0.0.0',
    port: 3000,
    // Fail loudly instead of drifting to the next free port: a dev server that
    // silently moves is worse than one that refuses to start.
    strictPort: true,
    proxy: Object.fromEntries(
      proxied.map((path) => [path, { target: CONTROL_PLANE, changeOrigin: true }]),
    ),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        // Stable, unhashed names: assets.go embeds dist/ and the committed
        // output should not churn on every rebuild.
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
})
