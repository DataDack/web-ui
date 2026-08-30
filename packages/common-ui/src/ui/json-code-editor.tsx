import { useCallback } from "react"

import Editor from "react-simple-code-editor"

import { css, cx } from "../lib/emotion"
import { fontMono } from "../lib/styles"

export interface JsonCodeEditorProps {
  value?: string
  onChange?: (value: string) => void
  className?: string
  minHeight?: string
  maxHeight?: string
  placeholder?: string
  readOnly?: boolean
}

/**
 * Colour JSON without pulling in a syntax-highlighting engine.
 *
 * The editor re-highlights on every keystroke, so this runs in the typing path
 * and stays a handful of regexes rather than a tokenizer. It returns an HTML
 * STRING that the editor injects, which is why the escape pass below comes
 * first and is not optional: the value is user input, and `<` reaching the DOM
 * unescaped is script injection, not a rendering glitch.
 */
function highlightJson(code: string) {
  return (
    code
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      // Strings first — a quoted body may contain digits or the word `null`,
      // and matching those before the quotes would colour them separately.
      .replace(
        /"(?:\\.|[^"\\])*"/g,
        (match) => `<span style="color:var(--json-string,#6ee7b7)">${match}</span>`,
      )
      .replace(
        /\b(-?\d+\.?\d*(?:e[+-]?\d+)?)\b/g,
        '<span style="color:var(--json-number,#60a5fa)">$1</span>',
      )
      .replace(/\b(true|false|null)\b/g, '<span style="color:var(--json-bool,#fbbf24)">$1</span>')
  )
}

const wrapper = css`
  overflow: auto;
  border-radius: 0.5rem;
  border: 1px solid var(--border);
  background: color-mix(in oklab, var(--muted) 30%, transparent);
  font-family: ${fontMono};
  font-size: 12px;
  line-height: 16px;

  &:focus-within {
    box-shadow: 0 0 0 1px var(--ring);
  }
`

const textarea = css`
  outline: none;
`

function JsonCodeEditor({
  value,
  onChange,
  className,
  minHeight = "120px",
  maxHeight = "400px",
  placeholder = "{ }",
  readOnly = false,
}: JsonCodeEditorProps) {
  const handleChange = useCallback(
    (code: string) => {
      // react-simple-code-editor has no readOnly of its own that blocks edits,
      // so the guard belongs here rather than on the textarea.
      if (!readOnly) onChange?.(code)
    },
    [onChange, readOnly],
  )

  return (
    <div data-slot="json-code-editor" className={cx(wrapper, className)} style={{ minHeight, maxHeight }}>
      <Editor
        value={value ?? ""}
        onValueChange={handleChange}
        highlight={highlightJson}
        placeholder={placeholder}
        readOnly={readOnly}
        padding={12}
        tabSize={2}
        insertSpaces
        style={{ fontFamily: fontMono, fontSize: 12, lineHeight: 1.6, minHeight }}
        textareaClassName={textarea}
      />
    </div>
  )
}

export { JsonCodeEditor }
