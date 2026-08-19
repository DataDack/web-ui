import { useState } from "react"

import { Plus, Trash2, Undo2 } from "lucide-react"

import { Button, Input, css, fontMono, mix } from "@datadack/common-ui"

import { parseDotEnv, type ParsedEnvLine } from "./env-parse"

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

const importBar = css`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  border-radius: 0.375rem;
  border: 1px solid ${mix("--border", 60)};
  padding: 6px 10px;
`

const importNote = css`
  margin: 0;
  flex: 1;
  font-size: 11px;
  color: var(--muted-foreground);
`

const skippedNote = css`
  color: var(--destructive);
`

const undoButton = css`
  height: 24px;
  gap: 4px;
  padding: 0 8px;
  font-size: 11px;
`

/** `rows` with `entries` folded in: an existing key is updated, not duplicated. */
function mergeEntries(rows: readonly EnvRow[], entries: readonly ParsedEnvLine[]): EnvRow[] {
  const merged = rows.map((entry) => ({ ...entry }))
  for (const parsed of entries) {
    const existing = merged.find((candidate) => candidate.key.trim() === parsed.key)
    if (existing) existing.value = parsed.value
    else merged.push({ key: parsed.key, value: parsed.value })
  }
  return merged
}

/** What the last paste replaced, so the whole import can be taken back at once. */
interface LastImport {
  previous: EnvRow[]
  count: number
  skipped: number
}

export interface EnvEditorProps {
  rows: EnvRow[]
  onChange: (rows: EnvRow[]) => void
  /** "Add variable" button text; label-driven consumers pass a translation. */
  addLabel?: string
  /** Hint under the add button. */
  hint?: string
  /** aria-label for a row's remove button, given the row's current key. */
  removeLabel?: (key: string) => string
  /** Reports what a paste produced. */
  importedLabel?: (count: number) => string
  /** Appended when lines carried content but did not parse. */
  skippedLabel?: (count: number) => string
  undoLabel?: string
}

/**
 * Key/value pairs for the function's environment.
 *
 * Always keeps one empty row at the end so adding the first variable needs no
 * "add" click; the explicit button is for the second and later ones. Blank rows
 * are dropped on submit, so an untouched trailing row costs nothing.
 *
 * Pasting a whole `.env` into a KEY box splits it into rows there and then.
 * That is the paste people actually make — copy the file, click the first
 * field, paste — and the alternative is fifty hand-typed rows. The VALUE box
 * demands more evidence before it does the same: a single line containing `=`
 * is an ordinary connection string or JWT, and shredding one into variables is
 * far worse than leaving it alone, so only a multi-line paste counts there.
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
  importedLabel = (count) =>
    count === 1 ? "1 variable from your paste." : `${String(count)} variables from your paste.`,
  skippedLabel = (count) =>
    count === 1 ? "1 line could not be read." : `${String(count)} lines could not be read.`,
  undoLabel = "Undo",
}: Readonly<EnvEditorProps>) {
  const [lastImport, setLastImport] = useState<LastImport>()

  const update = (index: number, patch: Partial<EnvRow>) => {
    onChange(rows.map((row_, i) => (i === index ? { ...row_, ...patch } : row_)))
  }

  /**
   * A paste into one of a row's fields, before the input sees it. Returns
   * whether it was consumed as a `.env` document.
   */
  const pasteInto = (index: number, text: string, field: "key" | "value"): boolean => {
    if (field === "value" && !/\r?\n/.test(text.trim())) return false

    const parsed = parseDotEnv(text)
    if (parsed.entries.length === 0) return false

    // The row pasted into is consumed when it is still blank: the first entry
    // belongs in it, and leaving an empty row behind the new ones is litter.
    const target = rows[index]
    const targetIsBlank = target?.key.trim() === "" && target.value === ""
    const base = targetIsBlank ? rows.filter((_, i) => i !== index) : rows

    setLastImport({
      previous: rows.map((entry) => ({ ...entry })),
      count: parsed.entries.length,
      skipped: parsed.skipped.length,
    })
    onChange(mergeEntries(base, parsed.entries))
    return true
  }

  const onPaste =
    (index: number, field: "key" | "value") => (event: React.ClipboardEvent<HTMLInputElement>) => {
      const text = event.clipboardData.getData("text")
      if (text !== "" && pasteInto(index, text, field)) event.preventDefault()
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
            onPaste={onPaste(index, "key")}
            onChange={(event) => {
              update(index, { key: event.target.value })
            }}
          />
          <Input
            value={entry.value}
            placeholder="value"
            className={monoInput}
            onPaste={onPaste(index, "value")}
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
            <Trash2 size={14} aria-hidden />
          </Button>
        </div>
      ))}

      {lastImport && (
        <div className={importBar}>
          <p className={importNote}>
            {importedLabel(lastImport.count)}
            {lastImport.skipped > 0 && (
              <>
                {" "}
                <span className={skippedNote}>{skippedLabel(lastImport.skipped)}</span>
              </>
            )}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={undoButton}
            onClick={() => {
              onChange(lastImport.previous)
              setLastImport(undefined)
            }}
          >
            <Undo2 size={12} />
            {undoLabel}
          </Button>
        </div>
      )}

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
