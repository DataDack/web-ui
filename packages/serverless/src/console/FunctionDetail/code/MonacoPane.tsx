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
} from "./monacoTheme"

const host = css`
  flex: 1;
  min-width: 0;
  min-height: 0;
`

const loading = css`
  width: 100%;
  height: 100%;
  border-radius: 0;
`

export interface MonacoPaneProps {
  /**
   * Model identity — `<function>/<archive path>`, not the archive path alone.
   * Monaco keys its models by this string globally, so two functions holding a
   * `handler.js` would otherwise share one model and one undo history.
   */
  modelPath: string
  language: string
  value: string
  readOnly: boolean
  onChange: (value: string) => void
  /** Ctrl/Cmd+S inside the editor. */
  onSave: () => void
  onCursorChange: (line: number, column: number) => void
}

/**
 * Monaco itself, isolated behind its own module so the whole engine stays
 * behind a `React.lazy` boundary — it is the single largest thing either
 * console can load, and nobody who never opens the Code tab should pay for it.
 *
 * The apps are what actually supply the engine: each one bundles
 * `monaco-editor`, wires its web workers through its own bundler and hands the
 * result to `loader.config({ monaco })`. Without that the wrapper's default
 * loader would fetch Monaco from a CDN, which no air-gapped install and no
 * strict CSP would allow.
 */
export function MonacoPane({
  modelPath,
  language,
  value,
  readOnly,
  onChange,
  onSave,
  onCursorChange,
}: Readonly<MonacoPaneProps>) {
  const dark = useIsDarkDocument()
  const monacoRef = useRef<MonacoInstance | null>(null)
  // Monaco commands capture their handler once, so the live one is read
  // through a ref — otherwise Ctrl+S would save whatever was open on mount.
  const saveRef = useRef(onSave)
  saveRef.current = onSave

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
    instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveRef.current()
    })
    instance.onDidChangeCursorPosition((event) => {
      onCursorChange(event.position.lineNumber, event.position.column)
    })
  }

  const options: editor.IStandaloneEditorConstructionOptions = {
    readOnly,
    domReadOnly: readOnly,
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    fontSize: 13,
    lineHeight: 21,
    minimap: { enabled: true, renderCharacters: false },
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    renderLineHighlight: "line",
    automaticLayout: true,
    tabSize: 2,
    padding: { top: 12, bottom: 12 },
    scrollbar: { verticalScrollbarSize: 10, horizontalScrollbarSize: 10 },
    // The archive is the unit of truth, not a repo: there is nothing to fold
    // a diff against and no file to format on save.
    formatOnPaste: false,
    fixedOverflowWidgets: true,
  }

  return (
    <div className={host}>
      <Editor
        // `path` (rather than a React `key`) is what switches files: the
        // wrapper keeps one model per path and restores its view state and
        // undo stack, where remounting on a key would throw both away and
        // rebuild the whole editor on every tab click.
        path={modelPath}
        language={language}
        value={value}
        theme={dark ? DARK_THEME : LIGHT_THEME}
        options={options}
        loading={<Skeleton className={loading} />}
        onMount={handleMount}
        onChange={(next) => {
          onChange(next ?? "")
        }}
      />
    </div>
  )
}

export default MonacoPane
