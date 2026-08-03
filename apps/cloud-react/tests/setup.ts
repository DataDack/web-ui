import { GlobalRegistrator } from "@happy-dom/global-registrator"

GlobalRegistrator.register()

// Importing the package root self-registers every matcher on the active
// `expect` (bun's, here) — the matcher TYPES are merged into bun:test in
// ./testing-library.d.ts.
// @ts-expect-error -- the package root ships global-script declarations that TS refuses to treat as a module; the runtime side effect is exactly what we want
await import("@testing-library/jest-dom")

// Testing Library's auto-cleanup hooks itself onto a global `afterEach`, which
// bun:test does not expose — so without this every render stays in document.body
// for the rest of the run and `screen` queries start matching a previous file's
// DOM. Registering it here is what keeps `screen` scoped to the current test.
const { afterEach } = await import("bun:test")
const { cleanup } = await import("@testing-library/react")
afterEach(cleanup)
