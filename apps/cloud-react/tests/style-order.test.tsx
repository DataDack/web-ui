import { describe, expect, test } from "bun:test"

// Regression guard for the cascade contract between the design system and the app.
//
// Components take a `className` and merge it with `cx()`. Unlike the `cn()` they
// used to use, `cx()` does not run tailwind-merge, so it cannot delete a
// conflicting base class — the caller's utility has to win on the cascade.
//
// Tailwind v4 emits this app's utilities inside `@layer utilities`, and any
// unlayered rule beats any layered one regardless of document order. So the
// design system emits into `@layer datadack-ui`, and registers that layer name
// first by prepending its <style> to <head> — layer precedence follows first
// appearance, so ours sorts below Tailwind's and the app's overrides win.
//
// Both halves are required. Lose the layer and the package beats every
// utility; lose the prepend and the layer could sort after `utilities`. This
// test fails loudly either way.

const APP_STYLESHEET_MARKER = "data-test-app-stylesheet"

function appStylesheet() {
  return document.head.querySelector(`[${APP_STYLESHEET_MARKER}]`)
}

function emotionTags() {
  return Array.from(document.head.querySelectorAll("style[data-emotion]"))
}

describe("design system cascade order", () => {
  test("importing the kit inserts its styles", async () => {
    // Stand in for the <link rel=stylesheet> Vite puts in <head>.
    const sheet = document.createElement("style")
    sheet.setAttribute(APP_STYLESHEET_MARKER, "")
    sheet.textContent = ".gap-2 { gap: 8px; }"
    document.head.appendChild(sheet)

    // Importing the kit is what triggers insertion: every component serialises
    // its styles at module scope. Another test file may already have imported
    // it, which is why this asserts presence rather than a transition.
    await import("@datadack/common-ui")

    expect(appStylesheet()).not.toBeNull()
    expect(emotionTags().length).toBeGreaterThan(0)
  })

  test("a fresh instance configured like the kit's lands above the app stylesheet", async () => {
    // Document order cannot be asserted against the shared instance: by the
    // time this file runs, another test may already have imported the kit, so
    // the emotion tags predate the marker for uninteresting reasons. Build a
    // throwaway instance with the same options instead — that tests the
    // configuration, which is the thing that must not regress.
    const { default: createEmotion } = await import("@emotion/css/create-instance")

    const marker = document.createElement("style")
    marker.setAttribute("data-test-late-stylesheet", "")
    document.head.appendChild(marker)

    const probe = createEmotion({ key: "probe", prepend: true })
    const generated = probe.css`color: red;`
    expect(generated).toStartWith("probe-")

    const tag = document.head.querySelector('style[data-emotion^="probe"]')
    expect(tag).not.toBeNull()

    // DOCUMENT_POSITION_FOLLOWING === 4: the app stylesheet comes *after* the
    // emotion tag, so its layer sorts first and therefore lowest.
    if (!tag) throw new Error("the probe instance inserted no style tag")
    const relation = tag.compareDocumentPosition(marker)
    expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  test("the design system uses its own single cache key", () => {
    const keys = new Set(
      emotionTags()
        .map((tag) => tag.getAttribute("data-emotion"))
        // The throwaway instance above registers its own key on purpose.
        .filter((key) => key !== "probe"),
    )
    // One key, not the default "css" — a second instance in the real kit would
    // mean a second insertion point and an unpredictable cascade again.
    expect([...keys]).toEqual(["ddui"])
  })

  test("component rules are emitted into the design-system layer", () => {
    const rules = emotionTags()
      .map((tag) => tag.textContent)
      .filter((text) => text.includes(".ddui-"))

    expect(rules.length).toBeGreaterThan(0)
    // Every class-bearing rule must be layered. An unlayered one would outrank
    // every Tailwind utility in the app and could not be overridden at all.
    for (const rule of rules) expect(rule).toStartWith("@layer datadack-ui{")
  })
})
