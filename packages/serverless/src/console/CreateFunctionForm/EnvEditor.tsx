import { Plus, X } from "lucide-react"

import { Button, Input, css, fontMono, mix } from "@datadack/common-ui"

export interface EnvRow {
  key: string
  value: string
}

const list = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const row = css`
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
`

const monoInput = css`
  font-family: ${fontMono};
  font-size: 12px;
`

const hintLine = css`
  font-size: 11px;
  color: ${mix("--muted-foreground", 80)};
`

export interface EnvEditorProps {
  rows: EnvRow[]
  onChange: (rows: EnvRow[]) => void
  /** "Add variable" button text; label-driven consumers pass a translation. */
  addLabel?: string
  /** Hint under the add button. */
  hint?: string
  /** aria-label for a row's remove button, given the row's current key. */
  removeLabel?: (key: string) => string
}

/**
 * Key/value pairs for the function's environment.
 *
 * Always keeps one empty row at the end so adding the first variable needs no
 * "add" click; the explicit button is for the second and later ones. Blank rows
 * are dropped on submit, so an untouched trailing row costs nothing.
 *
 * The strings default to English for the pre-existing create-form usage; the
 * detail page's sections thread its labels tree through so translations apply.
 */
export function EnvEditor({
  rows,
  onChange,
  addLabel = "Add variable",
  hint = "Blank rows are ignored.",
  removeLabel = (key) => (key ? `Remove ${key}` : "Remove variable"),
}: Readonly<EnvEditorProps>) {
  const update = (index: number, patch: Partial<EnvRow>) => {
    onChange(rows.map((row_, i) => (i === index ? { ...row_, ...patch } : row_)))
  }

  return (
    <div className={list}>
      {rows.map((entry, index) => (
        // Index is the identity here: rows have no id, and keying by content
        // would remount the input the user is typing into on every keystroke.
        // eslint-disable-next-line react/no-array-index-key
        <div key={index} className={row}>
          <Input
            value={entry.key}
            placeholder="KEY"
            className={monoInput}
            onChange={(event) => {
              update(index, { key: event.target.value })
            }}
          />
          <Input
            value={entry.value}
            placeholder="value"
            className={monoInput}
            onChange={(event) => {
              update(index, { value: event.target.value })
            }}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={removeLabel(entry.key)}
            disabled={rows.length === 1}
            onClick={() => {
              onChange(rows.filter((_, i) => i !== index))
            }}
          >
            <X size={14} />
          </Button>
        </div>
      ))}

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            onChange([...rows, { key: "", value: "" }])
          }}
        >
          <Plus size={14} />
          {addLabel}
        </Button>
        <p className={hintLine}>{hint}</p>
      </div>
    </div>
  )
}
