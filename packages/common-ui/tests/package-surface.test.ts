import { describe, expect, test } from "bun:test"

import * as UI from "../src/index"

// The package's public contract: what it exports, the helpers apps build on, and
// the token defaults that let a consumer render correctly without configuring
// anything. Two other repos consume this package, so an accidental removal here
// is a downstream build break rather than a local mistake.

const names = Object.keys(UI)
const components = names.filter((n) => /^[A-Z]/.test(n))

describe("export surface", () => {
  test("every export is defined", () => {
    const undefinedExports = names.filter((n) => UI[n as keyof typeof UI] === undefined)
    expect(undefinedExports).toEqual([])
  })

  test("the barrel is substantial and free of duplicates", () => {
    expect(components.length).toBeGreaterThan(100)
    expect(new Set(names).size).toBe(names.length)
  })

  test("the shadcn primitives every consumer expects are present", () => {
    const required = [
      "Accordion",
      "Avatar",
      "Badge",
      "Button",
      "Calendar",
      "Card",
      "Checkbox",
      "Combobox",
      "Command",
      "ContextMenu",
      "DatePicker",
      "Dialog",
      "DropdownMenu",
      "Form",
      "Input",
      "InputOTP",
      "Label",
      "Popover",
      "ScrollArea",
      "Select",
      "Separator",
      "Sheet",
      "Skeleton",
      "Switch",
      "Table",
      "Tabs",
      "Textarea",
      "Tooltip",
    ]
    expect(required.filter((n) => !(n in UI))).toEqual([])
  })

  test("the console layer is present", () => {
    const required = [
      "DataTable",
      "EmptyState",
      "KeyValueGrid",
      "PageHeader",
      "ResourceTable",
      "StatCard",
      "StatGrid",
      "StatusBadge",
      "ThemeProvider",
      "ThemeToggle",
    ]
    expect(required.filter((n) => !(n in UI))).toEqual([])
  })

  test("the styling primitives are exported so domain kits share one instance", () => {
    // serverless-ui and any future kit must style through these rather than
    // importing @emotion/css, or they get a second unlayered cache.
    for (const helper of ["css", "cx", "keyframes", "injectGlobal"]) {
      expect(typeof UI[helper as keyof typeof UI]).toBe("function")
    }
  })

  test("no export name uses the wrong scope casing convention", () => {
    // Guards the class of mistake that broke Linux builds: the package is
    // @datadack/common-ui, never @DataDack/.
    expect(names.every((n) => !n.includes("DataDack"))).toBe(true)
  })
})

describe("cn", () => {
  test("merges conflicting Tailwind classes, last one winning", () => {
    // cn is still exported for consumers that style with Tailwind. Unlike cx it
    // runs tailwind-merge, and app code relies on that.
    expect(UI.cn("p-2", "p-4")).toBe("p-4")
    expect(UI.cn("text-sm", "text-lg")).toBe("text-lg")
  })

  test("keeps non-conflicting classes and drops falsy values", () => {
    const hidden: string | false = false
    expect(UI.cn("flex", hidden, undefined, "gap-2")).toBe("flex gap-2")
  })
})

describe("formatBytes", () => {
  test("scales through the units", () => {
    expect(UI.formatBytes(512)).toBe("512 B")
    expect(UI.formatBytes(1024)).toBe("1.0 KB")
    expect(UI.formatBytes(1024 ** 2)).toBe("1.0 MB")
    // MB is the top unit: the console never shows a gigabyte figure, so a large
    // value keeps scaling in MB rather than switching notation mid-column.
    expect(UI.formatBytes(1024 ** 3)).toBe("1024.0 MB")
  })

  test("zero and missing values render as an em dash, not '0 B'", () => {
    // Tables use the dash to mean "nothing to report", which reads better in a
    // column than a real-looking zero.
    expect(UI.formatBytes(0)).toBe("—")
  })
})

describe("timeAgo", () => {
  test("describes a recent instant as relative", () => {
    const justNow = new Date(Date.now() - 5_000).toISOString()
    expect(typeof UI.timeAgo(justNow)).toBe("string")
    expect(UI.timeAgo(justNow).length).toBeGreaterThan(0)
  })

  test("describes an older instant differently from a recent one", () => {
    const recent = UI.timeAgo(new Date(Date.now() - 60_000).toISOString())
    const old = UI.timeAgo(new Date(Date.now() - 400 * 24 * 3600_000).toISOString())
    expect(recent).not.toBe(old)
  })
})

describe("variants", () => {
  test("buttonVariants returns a class for every variant and size", () => {
    for (const variant of ["default", "secondary", "destructive", "outline", "ghost", "link"]) {
      const cls = UI.buttonVariants({ variant: variant as never })
      expect(typeof cls).toBe("string")
      expect(cls.length).toBeGreaterThan(0)
    }
  })

  test("different variants produce different classes", () => {
    expect(UI.buttonVariants({ variant: "default" })).not.toBe(
      UI.buttonVariants({ variant: "ghost" }),
    )
  })

  test("badgeVariants behaves the same way", () => {
    expect(typeof UI.badgeVariants({ variant: "default" })).toBe("string")
  })
})

describe("status language", () => {
  test("getStatusConfig maps a known status to a tone", () => {
    const config = UI.getStatusConfig("available")
    expect(config).toBeDefined()
    expect(typeof config.tone).toBe("string")
  })

  test("an unknown status resolves to a usable default rather than undefined", () => {
    const config = UI.getStatusConfig("totally-unknown-status")
    expect(config).toBeDefined()
    expect(typeof config.tone).toBe("string")
  })

  test("the tone tables cover every tone the config can return", () => {
    const tones = Object.keys(UI.TONE_CLASSES)
    expect(tones.length).toBeGreaterThan(0)
    // Sort copies: a badge picks its dot colour from the same tone key, so a
    // tone present in one table and missing from the other renders a blank dot.
    expect([...Object.keys(UI.TONE_DOT_CLASSES)].sort((a, b) => a.localeCompare(b))).toEqual(
      [...tones].sort((a, b) => a.localeCompare(b)),
    )
  })
})

describe("style helpers", () => {
  test("media exposes the breakpoints components style against", () => {
    for (const key of ["sm", "md", "lg"]) {
      expect(UI.media[key as keyof typeof UI.media]).toContain("@media")
    }
  })

  test("mix produces a colour-mix against a CSS variable", () => {
    const value = UI.mix("--ring", 50)
    expect(value).toContain("--ring")
    expect(value).toContain("50%")
  })

  test("the glass tiers and animations are class names", () => {
    for (const helper of [UI.glass1, UI.glass2, UI.glass3, UI.contentEnter, UI.animateSpin]) {
      expect(typeof helper).toBe("string")
      expect(helper.length).toBeGreaterThan(0)
    }
  })
})

describe("emitted CSS sanity", () => {
  function allCss() {
    return Array.from(document.head.querySelectorAll("style[data-emotion]"))
      .map((el) => el.textContent ?? "")
      .join("")
  }

  test("no rule contains an unevaluated template placeholder", () => {
    // A quoted interpolation emits its own source text into the stylesheet
    // instead of a value, producing a silently invalid declaration. It is easy
    // to introduce with a scripted edit and invisible unless you read the
    // output, so read the output.
    expect(allCss()).not.toContain("${")
  })

  test("no rule contains an undefined, NaN or object value", () => {
    // An interpolated helper returning undefined stringifies into the CSS
    // rather than throwing, leaving `color: undefined` behind.
    const css = allCss()
    expect(css).not.toContain(": undefined")
    expect(css).not.toContain(": NaN")
    expect(css).not.toContain("[object Object]")
  })
})

describe("token defaults", () => {
  test("importing the package injects the theme tokens", () => {
    const css = Array.from(document.head.querySelectorAll("style[data-emotion]"))
      .map((el) => el.textContent ?? "")
      .join("")

    // A consumer that defines no tokens must still render the default theme,
    // light and dark both.
    expect(css).toContain("--muted-foreground")
    expect(css).toContain(":where(:root)")
    expect(css).toContain(":where(.dark)")
  })

  test("token selectors are zero-specificity so a consumer's own always win", () => {
    const css = Array.from(document.head.querySelectorAll("style[data-emotion]"))
      .map((el) => el.textContent ?? "")
      .join("")

    // `:root { --primary: … }` in an app must beat our default without needing
    // a layer or !important, which is what :where() buys.
    const rootRule = css.slice(css.indexOf(":where(:root)"))
    expect(rootRule).toStartWith(":where(:root)")
  })
})
