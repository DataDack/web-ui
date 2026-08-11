import { useEffect, useState } from "react"

import type * as MonacoApi from "monaco-editor"

/**
 * The Monaco namespace, typed off `monaco-editor` itself.
 *
 * NOT `@monaco-editor/react`'s exported `Monaco`: that alias is
 * `typeof import("monaco-editor/esm/vs/editor/editor.api")`, and monaco-editor
 * 0.56's `exports` map publishes no types for deep paths — so the alias
 * silently degrades to `any` and takes every `monaco.*` call with it.
 */
export type MonacoInstance = typeof MonacoApi

/**
 * Monaco, dressed in the console's own tokens.
 *
 * Monaco does not read CSS custom properties — a theme is a flat map of
 * concrete colours it applies through its own stylesheet. So the tokens are
 * read off the live document once per theme flip and handed over as hex. That
 * keeps the editor matching the glass panel around it in both themes, and
 * keeps a console that overrides the tokens from ending up with a VS Code blue
 * editor in a gold console.
 */

export const DARK_THEME = "datadack-dark"
export const LIGHT_THEME = "datadack-light"

/**
 * Whether the document is in dark mode, tracked live.
 *
 * Reads the `.dark` class on <html> rather than `useTheme()` from the design
 * system: that hook throws outside a ThemeProvider, and the class is the actual
 * contract every kit component's dark tokens key off — an app that flips it by
 * any other means still gets a matching editor.
 */
export function useIsDarkDocument(): boolean {
  const [dark, setDark] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  )

  useEffect(() => {
    const root = document.documentElement
    const sync = () => {
      setDark(root.classList.contains("dark"))
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => {
      observer.disconnect()
    }
  }, [])

  return dark
}

/**
 * A computed token as `#rrggbb`, or the fallback when it resolves to anything
 * else. The result is validated rather than trusted: a malformed colour reaching
 * Monaco's token rules throws and unmounts the editor, so an approximate colour
 * is strictly better than a crash.
 */
function token(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  const resolved = toHex(styles.getPropertyValue(name).trim())
  return /^#[0-9a-f]{6}$/.test(resolved) ? resolved : fallback
}

/**
 * Whatever the browser resolved a token to, as a `#rrggbb` string Monaco
 * accepts. Returns "" for anything it cannot express that way, so the caller
 * falls back.
 *
 * Two forms have to be handled. `getComputedStyle` normalises real CSS
 * properties to `rgb()`/`rgba()`, but a CUSTOM property is returned exactly as
 * authored — so a token written `#fff` arrives as `#fff`, not `rgb(...)`.
 * Monaco's token rules reject anything but six hex digits and throw
 * "Illegal value for token color", which takes the whole editor down.
 */
function toHex(value: string): string {
  if (value.startsWith("#")) return expandHex(value)

  const match = /^rgba?\(([^)]+)\)$/.exec(value)
  if (!match?.[1]) return ""
  const parts = match[1]
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map(Number)
  if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) return ""
  const hex = parts
    .slice(0, 3)
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0"))
    .join("")
  return `#${hex}`
}

/**
 * Normalises any authored hex form to `#rrggbb`.
 *
 * Shorthand doubles each digit (`#fff` -> `#ffffff`). Alpha is dropped rather
 * than encoded: Monaco's token rules take RGB only, and the editor's own
 * opacity comes from the panel it sits in.
 */
function expandHex(value: string): string {
  const digits = value.slice(1).trim()
  if (!/^[0-9a-fA-F]+$/.test(digits)) return ""

  switch (digits.length) {
    case 3:
    case 4: // #rgba - drop the alpha nibble
      return `#${digits
        .slice(0, 3)
        .split("")
        .map((d) => d + d)
        .join("")}`.toLowerCase()
    case 6:
      return `#${digits}`.toLowerCase()
    case 8: // #rrggbbaa - drop the alpha byte
      return `#${digits.slice(0, 6)}`.toLowerCase()
    default:
      return ""
  }
}

/**
 * Defines both themes from the tokens currently on the document. Call on mount
 * and again whenever the document theme flips — the token VALUES change under
 * the same names, so the definitions have to be rebuilt, not just re-selected.
 */
export function defineConsoleThemes(monaco: MonacoInstance): void {
  const styles = getComputedStyle(document.documentElement)

  const foreground = token(styles, "--foreground", "#f2f2f5")
  const muted = token(styles, "--muted-foreground", "#c6c6cc")
  const accent = token(styles, "--accent", "#353436")
  const card = token(styles, "--card", "#18181c")
  const gold = token(styles, "--brand-gold", "#e9b94f")
  const destructive = token(styles, "--destructive", "#dc2626")
  const chart1 = token(styles, "--chart-1", "#2a78d6")
  const chart2 = token(styles, "--chart-2", "#eb6834")
  const chart3 = token(styles, "--chart-3", "#1baf7a")

  // The editor sits inside a glass panel that already paints a background, so
  // its own is the card colour rather than a competing one.
  const shared = {
    "editor.background": card,
    "editor.foreground": foreground,
    "editorLineNumber.foreground": muted,
    "editorLineNumber.activeForeground": foreground,
    "editorCursor.foreground": gold,
    "editor.selectionBackground": accent,
    "editor.inactiveSelectionBackground": accent,
    "editor.lineHighlightBackground": accent,
    "editorIndentGuide.background1": accent,
    "editorWhitespace.foreground": accent,
    "editorGutter.background": card,
    "editorWidget.background": card,
    "editorWidget.border": accent,
    "editorSuggestWidget.background": card,
    "editorSuggestWidget.selectedBackground": accent,
    "editorHoverWidget.background": card,
    "editorError.foreground": destructive,
    "scrollbarSlider.background": accent,
    "minimap.background": card,
    // Bracket pair colouring ships with VS Code's own yellow/purple/blue, which
    // belongs to no console's palette. Pinned to the chart ramp for the same
    // reason the token rules are.
    "editorBracketHighlight.foreground1": gold,
    "editorBracketHighlight.foreground2": chart1,
    "editorBracketHighlight.foreground3": chart3,
    "editorBracketHighlight.unexpectedBracket.foreground": destructive,
  }

  // Token colours reuse the chart palette, exactly as the old mock editor did,
  // so a console that rebrands its charts rebrands its editor with them.
  //
  // Monaco matches a rule by longest token PREFIX, so the bare names below cover
  // every language; the `.json` ones are the exceptions that need to be told
  // apart. A JSON document is nothing but strings, and painting a key the same
  // colour as its value is what makes an unformatted event unreadable — so keys
  // take the brand accent and values the string colour.
  const rules = [
    { token: "comment", foreground: muted.slice(1), fontStyle: "italic" },
    { token: "keyword", foreground: chart2.slice(1) },
    { token: "string", foreground: chart3.slice(1) },
    { token: "number", foreground: chart1.slice(1) },
    { token: "type", foreground: chart1.slice(1) },
    { token: "delimiter", foreground: muted.slice(1) },
    { token: "string.key.json", foreground: gold.slice(1) },
    { token: "string.value.json", foreground: chart3.slice(1) },
    { token: "keyword.json", foreground: chart2.slice(1) },
  ]

  monaco.editor.defineTheme(DARK_THEME, { base: "vs-dark", inherit: true, rules, colors: shared })
  monaco.editor.defineTheme(LIGHT_THEME, { base: "vs", inherit: true, rules, colors: shared })
}
