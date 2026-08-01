import { GlobalRegistrator } from "@happy-dom/global-registrator"

GlobalRegistrator.register()

// Register jest-dom's matchers on bun:test's expect. The named-module import
// (rather than the package root) is what makes this typecheck: the root ships
// global-style declarations that TS refuses to treat as a module. The matcher
// TYPES are merged into bun:test in ./testing-library.d.ts.
const { expect } = await import("bun:test")
const matchers = await import("@testing-library/jest-dom/matchers")
expect.extend(matchers)
