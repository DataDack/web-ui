// Merge @testing-library/jest-dom's matcher types into bun:test's expect —
// the runtime registration happens in ./setup.ts (bunfig [test].preload).
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers"

declare module "bun:test" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- declaration merging: the empty extends IS the mechanism
  interface Matchers<T> extends TestingLibraryMatchers<unknown, T> {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- declaration merging: the empty extends IS the mechanism
  interface AsymmetricMatchers extends TestingLibraryMatchers<unknown, void> {}
}
