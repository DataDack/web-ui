import { GlobalRegistrator } from "@happy-dom/global-registrator"

GlobalRegistrator.register()

// Importing the package root self-registers every matcher on the active
// `expect` (bun's, here) — the matcher TYPES are merged into bun:test in
// ./testing-library.d.ts.
// @ts-expect-error -- the package root ships global-script declarations that TS refuses to treat as a module; the runtime side effect is exactly what we want
await import("@testing-library/jest-dom")
