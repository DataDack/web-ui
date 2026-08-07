/**
 * How an app hands its bundled Monaco to this package, without either side
 * importing the other's build graph.
 *
 * The problem this solves is ordering. `@monaco-editor/react` fetches the whole
 * editor from a CDN unless `loader.config({ monaco })` has run first, and only
 * an app can call that — Vite `?worker` imports and the `monaco-editor` bundle
 * belong to the app's bundler, not to a tsup-built package. But the app cannot
 * simply `import "./monaco-setup"` at module scope either: in a console with no
 * route-level code splitting that drags several megabytes of editor into the
 * entry bundle for everyone who never opens the Code tab.
 *
 * So the app registers a THUNK. Registering costs nothing — no Monaco is
 * imported — and because the thunk is a dynamic import, the bundler splits the
 * editor into its own chunk in either app, split routes or not. The package
 * then awaits that thunk inside the same lazy boundary that loads the editor
 * pane, which is what makes "configured before mounted" a guarantee rather than
 * a race.
 */

type MonacoSetup = () => Promise<unknown>

let setup: MonacoSetup | null = null

/**
 * Registers the app's Monaco setup module. Call at module scope in whichever
 * module owns the route that can reach the Code tab:
 *
 *   registerMonacoSetup(() => import("@/lib/monaco-setup"))
 *
 * Without it the editor still renders, but `@monaco-editor/react` falls back to
 * loading Monaco from a CDN — which fails behind a strict CSP or offline.
 */
export function registerMonacoSetup(fn: MonacoSetup): void {
  setup = fn
}

/**
 * Runs the registered setup, once. The module cache makes repeat calls free, so
 * this can be awaited on every editor mount.
 */
export function loadMonacoSetup(): Promise<unknown> {
  return setup ? setup() : Promise.resolve(undefined)
}
