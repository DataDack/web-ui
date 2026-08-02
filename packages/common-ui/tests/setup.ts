import { GlobalRegistrator } from "@happy-dom/global-registrator"

GlobalRegistrator.register()

// The package root self-registers every matcher on the active `expect`.
// @ts-expect-error -- ships global-script declarations TS refuses to treat as a module; the runtime side effect is the point
await import("@testing-library/jest-dom")

// Radix measures and scrolls; happy-dom implements neither. Stubbing them keeps
// portal-based components (select, dropdown, dialog) mountable in tests.
if (!globalThis.ResizeObserver) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
Element.prototype.scrollIntoView ??= () => {}
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.setPointerCapture ??= () => {}
Element.prototype.releasePointerCapture ??= () => {}
