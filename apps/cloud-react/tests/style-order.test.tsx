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
  test("the app stylesheet is inserted before the design system loads", async () => {
    // Stand in for the <link rel=stylesheet> Vite puts in <head>. It goes in
    // first, exactly as it does in the real document, so the only thing that can
    // put emotion ahead of it is the prepend option.
    const sheet = document.createElement("style")
    sheet.setAttribute(APP_STYLESHEET_MARKER, "")
    sheet.textContent = ".gap-2 { gap: 8px; }"
    document.head.appendChild(sheet)

    expect(appStylesheet()).not.toBeNull()
    expect(emotionTags()).toHaveLength(0)

    // Importing the kit is what triggers insertion: every component serialises
    // its styles at module scope.
    await import("@datadack/common-ui")

    const tags = emotionTags()
    expect(tags.length).toBeGreaterThan(0)
  })

  test("every design-system style tag precedes the app stylesheet", () => {
    const sheet = appStylesheet()
    expect(sheet).not.toBeNull()

    for (const tag of emotionTags()) {
      // DOCUMENT_POSITION_FOLLOWING === 4: the app stylesheet comes *after* the
      // emotion tag, so the app's utilities win any specificity tie.
      const relation = tag.compareDocumentPosition(sheet as Node)
      expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
        Node.DOCUMENT_POSITION_FOLLOWING,
      )
    }
  })

  test("the design system uses its own single cache key", () => {
    const keys = new Set(emotionTags().map((tag) => tag.getAttribute("data-emotion")))
    // One key, not the default "css" — a second instance would mean a second
    // insertion point and an unpredictable cascade again.
    expect([...keys]).toEqual(["ddui"])
  })

  test("component rules are emitted into the design-system layer", () => {
    const rules = emotionTags()
      .map((tag) => tag.textContent ?? "")
      .filter((text) => text.includes(".ddui-"))

    expect(rules.length).toBeGreaterThan(0)
    // Every class-bearing rule must be layered. An unlayered one would outrank
    // every Tailwind utility in the app and could not be overridden at all.
    for (const rule of rules) expect(rule).toStartWith("@layer datadack-ui{")
  })
})
