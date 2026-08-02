import { describe, expect, test } from "bun:test"

import { LAYER, css, cx, injectGlobal, keyframes } from "../src/lib/emotion"

// The cascade contract between this package and the apps that consume it.
//
// Components merge a caller's `className` with `cx()`, which — unlike the `cn()`
// this package used before — does not run tailwind-merge and so cannot delete a
// conflicting base class. An override like `<DialogContent className="sm:max-w-md" />`
// only lands if it beats our own rule on the cascade, and two single-class
// selectors tie on specificity. What breaks the tie is layering, and these tests
// pin down every part of that.

/**
 * Every top-level rule the instance has written into <head>, split on brace
 * depth. Asserting on the real emitted CSS beats trying to make happy-dom
 * resolve a cascade, and it is byte-for-byte what a browser would receive.
 */
function emotionRules(): string[] {
  const text = Array.from(document.head.querySelectorAll("style[data-emotion]"))
    .map((el) => el.textContent ?? "")
    .join("")

  const rules: string[] = []
  let depth = 0
  let start = 0

  for (let i = 0; i < text.length; i++) {
    if (text[i] === "{") depth++
    else if (text[i] === "}") {
      depth--
      if (depth === 0) {
        rules.push(text.slice(start, i + 1))
        start = i + 1
      }
    }
  }

  return rules
}

describe("layering", () => {
  test("a simple rule is emitted inside the design-system layer", () => {
    const cls = css`
      color: red;
    `
    const rule = emotionRules().find((r) => r.includes(cls))
    expect(rule).toBeDefined()
    expect(rule).toStartWith(`@layer ${LAYER}{`)
    expect(rule).toEndWith("}")
    expect(rule).toContain("color:red")
  })

  test("interpolated values survive the wrapping untouched", () => {
    const gap = "12px"
    const cls = css`
      gap: ${gap};
      color: ${"blue"};
    `
    const rule = emotionRules().find((r) => r.includes(cls))
    expect(rule).toContain("gap:12px")
    expect(rule).toContain("color:blue")
    expect(rule).toStartWith(`@layer ${LAYER}{`)
  })

  test("nested selectors, media queries and pseudo-classes stay inside the layer", () => {
    const cls = css`
      color: red;

      &:hover {
        color: green;
      }

      @media (min-width: 640px) {
        color: blue;
      }

      & > svg {
        width: 16px;
      }
    `
    const rule = emotionRules().find((r) => r.includes(cls))
    expect(rule).toStartWith(`@layer ${LAYER}{`)
    // One layer wrapper, not one per nested block.
    expect(rule?.match(/@layer/g)).toHaveLength(1)
    expect(rule).toContain(":hover")
    expect(rule).toContain("@media")
  })

  test("the object form is layered too", () => {
    const cls = css({ color: "rebeccapurple" })
    const rule = emotionRules().find((r) => r.includes(cls))
    expect(rule).toStartWith(`@layer ${LAYER}{`)
    expect(rule).toContain("rebeccapurple")
  })

  test("keyframes are NOT layered — they carry no selector and take no part in the cascade", () => {
    const name = keyframes`
      from { opacity: 0; }
      to { opacity: 1; }
    `
    // Emotion emits a prefixed pair, @-webkit-keyframes and @keyframes.
    const matching = emotionRules().filter((r) => r.includes(name))
    expect(matching.length).toBeGreaterThanOrEqual(1)
    expect(matching.some((r) => r.startsWith("@keyframes"))).toBe(true)
    for (const rule of matching) expect(rule).not.toContain(`@layer ${LAYER}`)
  })

  test("injectGlobal is not layered — tokens rely on :where() for zero specificity", () => {
    // injectGlobal returns void, so it reads as a bare expression statement.
    injectGlobal(":where(.cascade-test-probe) { color: teal; }")

    const rule = emotionRules().find((r) => r.includes("cascade-test-probe"))
    expect(rule).toBeDefined()
    expect(rule).not.toContain(`@layer ${LAYER}`)
    expect(rule).toContain(":where(")
  })
})

describe("layer ordering", () => {
  test("the layer name sorts before Tailwind's, so app utilities win", () => {
    // Browsers order layers by first appearance. `prepend` puts our <style> at
    // the top of <head>, ahead of the app's stylesheet, so `datadack-ui` is
    // registered before Tailwind declares `theme, base, components, utilities`.
    // That makes it the LOWEST-priority layer — exactly what a base layer wants.
    const styles = Array.from(document.head.querySelectorAll("style[data-emotion]"))
    expect(styles.length).toBeGreaterThan(0)

    const ours = styles[0]
    if (!ours) throw new Error("no emotion style tag was inserted")
    expect(ours.getAttribute("data-emotion")).toStartWith("ddui")

    // Nothing may sit above us in <head> except other emotion tags.
    const firstNonEmotion = Array.from(document.head.children).find(
      (el) => !el.hasAttribute("data-emotion"),
    )
    if (firstNonEmotion) {
      const relation = ours.compareDocumentPosition(firstNonEmotion)
      expect(relation & Node.DOCUMENT_POSITION_FOLLOWING).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
    }
  })

  test("the package uses exactly one emotion cache key", () => {
    // A second instance would mean a second insertion point and an
    // unpredictable cascade all over again.
    const keys = new Set(
      Array.from(document.head.querySelectorAll("style[data-emotion]")).map((el) =>
        el.getAttribute("data-emotion")?.split(" ")[0],
      ),
    )
    expect([...keys]).toEqual(["ddui"])
  })
})

describe("cx", () => {
  test("keeps a caller's class alongside the generated one", () => {
    const base = css`
      gap: 16px;
    `
    const merged = cx(base, "gap-2")
    expect(merged).toContain(base)
    expect(merged).toContain("gap-2")
  })

  test("drops falsy values", () => {
    const base = css`
      gap: 16px;
    `
    // Components pass conditional classes through cx all the time; a false
    // branch must not leak "false" into the class list.
    const disabled: string | false = false
    const missing: string | undefined = undefined
    expect(cx(base, disabled, missing, null, "")).toBe(base)
  })

  test("still merges two emotion classes last-wins", () => {
    const a = css`
      color: red;
    `
    const b = css`
      color: blue;
    `
    const merged = cx(a, b)
    // cx composes registered emotion classes into a single new class whose later
    // declaration wins, rather than emitting both and leaving it to the cascade.
    expect(merged.split(" ")).toHaveLength(1)

    // Both source rules are re-emitted under the one merged class, in order, so
    // the last declaration wins — the same result tailwind-merge used to give by
    // deleting the loser outright.
    const matching = emotionRules().filter((r) => r.includes(merged))
    expect(matching).toHaveLength(2)
    for (const rule of matching) expect(rule).toStartWith(`@layer ${LAYER}{`)
    expect(matching[0]).toContain("color:red")
    expect(matching[1]).toContain("color:blue")
  })
})

describe("regression guards", () => {
  test("css is the layered wrapper, not the raw emotion export", () => {
    const cls = css`
      color: red;
    `
    const rule = emotionRules().find((r) => r.includes(cls))
    // If someone re-exports @emotion/css's css directly, this rule loses its
    // wrapper and every app-side Tailwind override silently stops applying.
    expect(rule).toStartWith("@layer")
  })

  test("no source file imports @emotion/css directly", async () => {
    const { Glob } = await import("bun")
    const glob = new Glob("**/*.{ts,tsx}")
    const offenders: string[] = []

    for await (const file of glob.scan({ cwd: `${import.meta.dir}/../src`, absolute: true })) {
      if (file.endsWith("lib/emotion.ts")) continue
      const text = await Bun.file(file).text()
      if (text.includes('from "@emotion/css"')) offenders.push(file)
    }

    // Importing @emotion/css directly creates a SECOND, unlayered, appended
    // instance — the exact bug this module exists to prevent.
    expect(offenders).toEqual([])
  })
})
