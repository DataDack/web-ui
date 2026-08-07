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

/** A computed token as `#rrggbb`, or the fallback when it resolves to nothing. */
function token(styles: CSSStyleDeclaration, name: string, fallback: string): string {
  return toHex(styles.getPropertyValue(name).trim()) || fallback
}

/**
 * Whatever the browser resolved a token to, as a hex string Monaco accepts.
 * getComputedStyle normalises hex to `rgb()`/`rgba()`, so those two forms plus
 * a literal hex cover every token in the kit. Anything else (a token left as a
 * `color-mix()` the browser could not resolve) returns "" and takes the caller's
 * fallback.
 */
function toHex(value: string): string {
  if (value.startsWith("#")) return value
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
  }

  // Token colours reuse the chart palette, exactly as the old mock editor did,
  // so a console that rebrands its charts rebrands its editor with them.
  const rules = [
    { token: "comment", foreground: muted.slice(1), fontStyle: "italic" },
    { token: "keyword", foreground: chart2.slice(1) },
    { token: "string", foreground: chart3.slice(1) },
    { token: "number", foreground: chart1.slice(1) },
    { token: "type", foreground: chart1.slice(1) },
    { token: "delimiter", foreground: muted.slice(1) },
  ]

  monaco.editor.defineTheme(DARK_THEME, { base: "vs-dark", inherit: true, rules, colors: shared })
  monaco.editor.defineTheme(LIGHT_THEME, { base: "vs", inherit: true, rules, colors: shared })
}
