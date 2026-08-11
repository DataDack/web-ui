import { useEffect, useRef } from "react"

import Editor from "@monaco-editor/react"
import type { editor } from "monaco-editor"

import { Skeleton, css } from "@datadack/common-ui"

import {
  DARK_THEME,
  LIGHT_THEME,
  defineConsoleThemes,
  useIsDarkDocument,
  type MonacoInstance,
} from "../code/monacoTheme"

const host = css`
  height: 100%;
  min-width: 0;
  min-height: 0;
`

const loading = css`
  width: 100%;
  height: 100%;
  border-radius: 0;
`

export interface JsonMonacoProps {
  /**
   * Model identity. Monaco keys models globally by this string, so it carries
   * the function name — two functions open in two tabs would otherwise share
   * one event buffer and one undo stack.
   */
  modelPath: string
  value: string
  /** "json" for structured bodies, "plaintext" for anything that is not. */
  language: string
  readOnly: boolean
  onChange?: (value: string) => void
  /** Ctrl/Cmd+Enter inside the editor — the Test tab runs the event. */
  onSubmit?: () => void
}

/**
 * A small single-file Monaco, sized by its container.
 *
 * Deliberately not `MonacoPane` from the Code tab: that one is a full IDE pane —
 * minimap, Ctrl+S save, a cursor read-out wired to a status bar — and none of it
 * belongs around a twelve-line event. What the two do share is the theme, so a
 * console that rebrands one rebrands both.
 */
export function JsonMonaco({
  modelPath,
  value,
  language,
  readOnly,
  onChange,
  onSubmit,
}: Readonly<JsonMonacoProps>) {
  const dark = useIsDarkDocument()
  const monacoRef = useRef<MonacoInstance | null>(null)
  // Monaco captures a command's handler once, so the live one is read through a
  // ref — otherwise Ctrl+Enter would submit whatever payload was on screen at
  // mount.
  const submitRef = useRef(onSubmit)
  submitRef.current = onSubmit

  // The token VALUES change under the same names when the console theme flips,
  // so the themes are redefined rather than merely re-selected.
  useEffect(() => {
    if (monacoRef.current) defineConsoleThemes(monacoRef.current)
  }, [dark])

  const handleMount = (instance: editor.IStandaloneCodeEditor, monaco: MonacoInstance) => {
    monacoRef.current = monaco
    defineConsoleThemes(monaco)
    monaco.editor.setTheme(dark ? DARK_THEME : LIGHT_THEME)

    // Monaco's keybinding API composes modifiers with bitwise OR.
    instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      submitRef.current?.()
    })
  }

  const options: editor.IStandaloneEditorConstructionOptions = {
    readOnly,
    domReadOnly: readOnly,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 13,
    lineHeight: 20,
    // A payload is a dozen lines and the pane is a few hundred pixels wide: a
    // minimap of it is a scaled-down copy of something already fully visible.
    minimap: { enabled: false },
    // Long header values and base64 bodies are routine here, and a horizontal
    // scrollbar hides the very thing someone opened the pane to read.
    wordWrap: "on",
    wrappingIndent: "indent",
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    renderLineHighlight: readOnly ? "none" : "line",
    automaticLayout: true,
    tabSize: 2,
    insertSpaces: true,
    bracketPairColorization: { enabled: true },
    guides: { bracketPairs: true, indentation: true },
    stickyScroll: { enabled: false },
    // The pane is short enough that the ruler is a decorated sliver of nothing.
    overviewRulerLanes: 0,
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: true,
    padding: { top: 10, bottom: 10 },
    scrollbar: {
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
      // The pane is short and lives inside a scrolling tab: swallowing the wheel
      // at the editor's last line traps the page behind it.
      alwaysConsumeMouseWheel: false,
    },
    contextmenu: !readOnly,
    // Nothing to fold a diff against and no file to format on save; formatting
    // is an explicit button instead.
    formatOnPaste: false,
    fixedOverflowWidgets: true,
  }

  return (
    <div className={host}>
      <Editor
        // `path`, not a React `key`: the wrapper keeps one model per path and
        // restores its view state and undo stack, where remounting on a key
        // would throw both away and rebuild the editor on every re-render.
        path={modelPath}
        language={language}
        value={value}
        theme={dark ? DARK_THEME : LIGHT_THEME}
        options={options}
        loading={<Skeleton className={loading} />}
        onMount={handleMount}
        onChange={(next) => {
          onChange?.(next ?? "")
        }}
      />
    </div>
  )
}

export default JsonMonaco
