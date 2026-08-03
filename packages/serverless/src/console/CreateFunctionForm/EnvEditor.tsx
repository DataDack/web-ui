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

const hint = css`
  font-size: 11px;
  color: ${mix("--muted-foreground", 80)};
`

export interface EnvEditorProps {
  rows: EnvRow[]
  onChange: (rows: EnvRow[]) => void
}

/**
 * Key/value pairs for the function's environment.
 *
 * Always keeps one empty row at the end so adding the first variable needs no
 * "add" click; the explicit button is for the second and later ones. Blank rows
 * are dropped on submit, so an untouched trailing row costs nothing.
 */
export function EnvEditor({ rows, onChange }: Readonly<EnvEditorProps>) {
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
            aria-label={`Remove ${entry.key || "variable"}`}
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
          Add variable
        </Button>
        <p className={hint}>Blank rows are ignored.</p>
      </div>
    </div>
  )
}
