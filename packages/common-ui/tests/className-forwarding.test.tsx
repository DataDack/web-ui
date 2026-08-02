import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, test } from "bun:test"

import { SENTINEL, specimens } from "./specimens"

// The regression guard for the whole design system.
//
// Consuming apps override component styling by passing Tailwind classes —
// `<DialogContent className="sm:max-w-md" />` — at hundreds of call sites. For
// that to work, two things must hold, and this file checks both for every
// component:
//
//   1. the component MERGES the caller's class rather than dropping or
//      replacing it, and
//   2. it keeps its own generated class alongside, so the override refines the
//      base style instead of erasing it.
//
// The cascade half of the contract — that the caller's class actually wins once
// both are on the element — is pinned down separately in cascade.test.ts.

afterEach(cleanup)

describe("className forwarding", () => {
  test.each(specimens.map((s) => [s.name, s] as const))(
    "%s merges a caller's className onto the element",
    (_name, specimen) => {
      render(specimen.node)

      // Portalled content (dialog, dropdown, select, tooltip) lands outside the
      // testing-library container, so search the whole document.
      const el = document.querySelector(`.${SENTINEL}`)
      expect(el).not.toBeNull()

      const classes = el?.className ?? ""
      expect(classes).toContain(SENTINEL)

      if (!specimen.unstyled) {
        // The component's own emotion class must survive the merge. If this
        // fails the component is doing `className={className}` and has thrown
        // its own styling away.
        expect(classes).toMatch(/\bddui-\w+/)
      }
    },
  )
})

describe("coverage", () => {
  test("the specimen set covers every family the apps depend on", () => {
    const covered = new Set(specimens.map((s) => s.name))
    // Families that the consoles render on their busiest screens. Losing
    // coverage of any of these is how the auth-page regression slipped through.
    const critical = [
      "Button",
      "Input",
      "Label",
      "Checkbox",
      "DialogContent",
      "DropdownMenuContent",
      "DropdownMenuItem",
      "SelectTrigger",
      "SelectContent",
      "SelectItem",
      "InputOTPGroup",
      "InputOTPSlot",
      "PopoverContent",
      "TooltipContent",
      "Table",
      "TableRow",
      "TableCell",
      "Tabs",
    ]

    expect(critical.filter((name) => !covered.has(name))).toEqual([])
  })

  test("no specimen is silently a no-op", () => {
    // A specimen whose sentinel never reaches the DOM would pass rule 1 above
    // only if the query found some *other* element carrying the class.
    expect(specimens.length).toBeGreaterThan(40)
    expect(new Set(specimens.map((s) => s.name)).size).toBe(specimens.length)
  })
})
