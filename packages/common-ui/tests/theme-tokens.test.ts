import { describe, expect, test } from "bun:test"

import { glass1, glass2, glass3 } from "../src/lib/styles"

// lib/tokens.ts is the kit's promise that a consumer who defines NO theme still
// renders correctly: it ships a zero-specificity default for every token the
// components read. A component reading `var(--x)` for a token tokens.ts forgot
// resolves to nothing, and the declaration is simply dropped — silently, and
// only for the consumers who define the least. `--card-foreground` was such a
// hole (read by card, day-grid-picker and month-year-picker, defined nowhere),
// so these tests pin the invariant rather than just the one token.

const tokensSource = await Bun.file(`${import.meta.dir}/../src/lib/tokens.ts`).text()

/** The declarations inside one of tokens.ts's two theme blocks, as name → value. */
function themeBlock(selector: string): Record<string, string> {
  // Sliced by index rather than matched with a `.*?` regex: the blocks are the
  // only two `\n  }`-terminated bodies in the file, and a lazy dot-all pattern
  // over the whole source backtracks badly.
  const start = tokensSource.indexOf(`${selector} {`)
  if (start === -1) throw new Error(`tokens.ts has no ${selector} block`)

  // One declaration per line, split on the first colon — no token value in the
  // file contains one, and this stays obviously linear where a `--[a-z0-9-]+`
  // pattern would backtrack on the repeated dashes.
  const declarations: Record<string, string> = {}
  for (const line of tokensSource.slice(start, tokensSource.indexOf("\n  }", start)).split("\n")) {
    const colon = line.indexOf(":")
    const name = colon === -1 ? "" : line.slice(0, colon).trim()
    if (!name.startsWith("--")) continue

    declarations[name] = line.slice(colon + 1).trim().replace(";", "")
  }

  return declarations
}

/**
 * The theme tokens `source` reads with no inline fallback — i.e. the ones that
 * render as nothing unless tokens.ts defines them.
 */
function bareTokenReads(source: string): string[] {
  const names: string[] = []

  for (const [, name, fallback] of source.matchAll(/var\((--[a-z0-9-]+)\s*(,)?/g)) {
    if (name === undefined) continue
    // A `var(--x, y)` read carries its own default and is the documented way to
    // reach a token the CONSUMER owns (--radius-xl, --font-mono).
    if (fallback) continue
    // Radix writes --radix-*; lib/styles.ts's animation helpers write their own
    // --enter-*/--exit-* channels. Neither is a theme token.
    if (/^--(?:radix|enter|exit)-/.test(name)) continue
    // status-config.ts builds `var(--status-${name})` from a template, so the
    // literal chunk is a truncated prefix, not a token name.
    if (name.endsWith("-")) continue

    names.push(name)
  }

  return names
}

const light = themeBlock(":where(:root)")
const dark = themeBlock(":where(.dark)")

describe("token defaults", () => {
  test("--card-foreground is defined in both themes", () => {
    // The regression: card.tsx, day-grid-picker.tsx and month-year-picker.tsx
    // all set `color: var(--card-foreground)` with no fallback.
    expect(light["--card-foreground"]).toBeDefined()
    expect(dark["--card-foreground"]).toBeDefined()
  })

  test("every token the kit reads without an inline fallback ships a default", async () => {
    const { Glob } = await import("bun")
    const glob = new Glob("**/*.{ts,tsx}")
    const holes: Record<string, string[]> = {}

    for await (const file of glob.scan({ cwd: `${import.meta.dir}/../src`, absolute: true })) {
      if (file.endsWith("lib/tokens.ts")) continue

      for (const name of bareTokenReads(await Bun.file(file).text())) {
        if (name in light) continue
        holes[name] = [...(holes[name] ?? []), file]
      }
    }

    expect(holes).toEqual({})
  })

  test("every colour token in the light theme has a dark counterpart", () => {
    // A token defined in only one block flips to the other theme's value — or to
    // nothing — the moment `.dark` is toggled. Only the two motion tokens are
    // legitimately theme-independent.
    const colours = Object.entries(light)
      .filter(([, value]) => value.startsWith("#") || value.startsWith("rgb"))
      .map(([name]) => name)

    expect(colours.filter((name) => !(name in dark))).toEqual([])
    expect(Object.keys(light).filter((name) => !(name in dark))).toEqual([
      "--dur-base",
      "--ease-out-expo",
    ])
  })

  test("the dark theme introduces no token the light theme lacks", () => {
    // Light is the block a consumer inherits by default, so a dark-only token is
    // a hole for everyone not in dark mode.
    expect(Object.keys(dark).filter((name) => !(name in light))).toEqual([])
  })
})

describe("glass radius", () => {
  // The glass tiers used to hardcode 0.75rem while both consoles derive
  // --radius-xl from --radius (0.625rem), leaving every glass surface 2px off
  // the app's own scale. Reading the token with the old literal as the fallback
  // defers to the app and leaves a token-less consumer unchanged.
  const emitted = () =>
    Array.from(document.head.querySelectorAll("style[data-emotion]"))
      .map((el) => el.textContent ?? "")
      .join("")

  test.each([
    ["glass1", glass1],
    ["glass2", glass2],
    ["glass3", glass3],
  ])("%s defers its radius to the app's scale", (_name, cls) => {
    const rule = emitted()
      .split("}")
      .find((chunk) => chunk.includes(cls))

    expect(rule).toContain("border-radius:var(--radius-xl, 0.75rem)")
  })

  test("no glass tier hardcodes a radius any more", async () => {
    const styles = await Bun.file(`${import.meta.dir}/../src/lib/styles.ts`).text()
    expect(styles).not.toContain("border-radius: 0.75rem")
    expect(styles.match(/border-radius: var\(--radius-xl, 0\.75rem\);/g)).toHaveLength(3)
  })
})
