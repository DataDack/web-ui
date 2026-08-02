import { describe, expect, test } from "bun:test"

// Regression guard for the cascade contract between the design system and this app.
//
// Components merge a caller's `className` with `cx()`. Unlike the `cn()` they
// used to use, `cx()` does not run tailwind-merge, so it cannot delete a
// conflicting base class — the caller's utility has to win on the cascade. That
// is why @datadack/common-ui's rules are layered, into `@layer datadack-ui`.
//
// Where that layer sits is the whole contract, because layers are compared
// BEFORE specificity:
//
//   - after `base`, or Tailwind's preflight `* { padding: 0; border: 0 }` beats
//     every component and strips its padding and borders — despite `*` being the
//     weakest selector there is;
//   - before `utilities`, or `className="gap-2"` on a component does nothing.
//
// Layer order follows first appearance and emotion injects at runtime, so this
// app declares the order in src/index.css. These tests fail if that goes away.

const LAYER = "datadack-ui"
const DECLARATION = `@layer theme, base, ${LAYER}, components, utilities;`

async function appStylesheet() {
  return await Bun.file(`${import.meta.dir}/../src/index.css`).text()
}

function emotionTags() {
  return Array.from(document.head.querySelectorAll("style[data-emotion]"))
}

describe("design system cascade order", () => {
  test("the app declares where the design system's layer sits", async () => {
    expect(await appStylesheet()).toContain(DECLARATION)
  })

  test("it is declared before Tailwind is imported", async () => {
    const css = await appStylesheet()
    // Tailwind's own `@layer theme, base, components, utilities` would otherwise
    // fix the order first, leaving datadack-ui to land wherever emotion's first
    // insertion happens to fall.
    expect(css.indexOf(DECLARATION)).toBeLessThan(css.indexOf('@import "tailwindcss"'))
  })

  test("the layer is positioned after base and before utilities", () => {
    const order = DECLARATION.replace("@layer ", "").replace(";", "").split(", ")
    expect(order.indexOf(LAYER)).toBeGreaterThan(order.indexOf("base"))
    expect(order.indexOf(LAYER)).toBeLessThan(order.indexOf("utilities"))
  })
})

describe("the kit's injected styles", () => {
  test("importing the kit inserts styles under a single cache key", async () => {
    await import("@datadack/common-ui")

    const tags = emotionTags()
    expect(tags.length).toBeGreaterThan(0)

    // One key, not the default "css" — a second instance would mean a second
    // insertion point and an unpredictable cascade again.
    const keys = new Set(tags.map((tag) => tag.getAttribute("data-emotion")))
    expect([...keys]).toEqual(["ddui"])
  })

  test("every class-bearing rule is emitted into the design-system layer", () => {
    const rules = emotionTags()
      .map((tag) => tag.textContent)
      .filter((text) => text.includes(".ddui-"))

    expect(rules.length).toBeGreaterThan(0)
    // An unlayered rule would outrank every Tailwind utility in the app and
    // could not be overridden at all.
    for (const rule of rules) expect(rule).toStartWith(`@layer ${LAYER}{`)
  })
})
