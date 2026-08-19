import { useMemo, useState } from "react"

import { Button, Label } from "@datadack/common-ui"
import { FileUp, Plus, Undo2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { parseDotEnv } from "./env-parse"
import { duplicateKeys, newEnvRow, type EnvRow } from "./env-types"
import { EnvImportSheet } from "./EnvImportSheet"
import { EnvVarRow } from "./EnvVarRow"

interface EnvVarEditorProps {
  rows: EnvRow[]
  onChange: (rows: EnvRow[]) => void
  /** Shown under the control — differs between create and settings. */
  description?: string
  label?: string
  /** Whether the project has a preview environment; gates the target chips. */
  previewEnabled?: boolean
}

/** What the last bulk add did, so it can be taken back in one click. */
interface LastImport {
  /** The rows as they were before it. */
  previous: EnvRow[]
  count: number
  /** Whether it came from a paste into a field or from the import sheet. */
  pasted: boolean
}

/**
 * The environment-variable editor: rows, `.env` import, live duplicate
 * detection.
 *
 * Importing merges by key rather than appending, so pasting a `.env` twice does
 * not produce two of everything — the second paste updates what the first one
 * created, which is what a user re-pasting a corrected file expects.
 *
 * A `.env` pasted straight into a row's field is split there and then, without
 * the sheet. That is the paste people actually make — copy the file, click the
 * first box — and the old behaviour dropped the whole document into one input,
 * where it looked accepted and would have saved as a single variable whose name
 * was the entire file. Splitting silently would be its own trap, so the row
 * count and an Undo are stated underneath.
 */
export function EnvVarEditor({
  rows,
  onChange,
  description,
  label = "Environment variables",
  previewEnabled = false,
}: Readonly<EnvVarEditorProps>) {
  const { t } = useTranslation()
  const [importOpen, setImportOpen] = useState(false)
  const [lastImport, setLastImport] = useState<LastImport | null>(null)
  const duplicates = useMemo(() => duplicateKeys(rows), [rows])

  /** Any edit of a single row makes the bulk Undo stale — it would take back
   *  the hand edit too, which is not what "undo the paste" means. */
  const commit = (next: EnvRow[]) => {
    setLastImport(null)
    onChange(next)
  }

  const replaceRow = (next: EnvRow) => {
    commit(rows.map((row) => (row.id === next.id ? next : row)))
  }

  const removeRow = (id: string) => {
    commit(rows.filter((row) => row.id !== id))
  }

  /** Merge by key: an entry that names an existing row replaces its value. */
  const mergeEntries = (base: EnvRow[], entries: { key: string; value: string }[]): EnvRow[] => {
    const merged = [...base]
    for (const entry of entries) {
      const existing = merged.findIndex((row) => row.key.trim() === entry.key)
      if (existing === -1) {
        merged.push(newEnvRow(entry.key, entry.value))
        continue
      }
      const current = merged.at(existing)
      if (!current) continue
      merged[existing] = {
        ...current,
        value: entry.value,
        // Overwriting a saved variable is a real write.
        state: current.state === "stored" ? "edited" : current.state,
      }
    }
    return merged
  }

  const importEntries = (entries: { key: string; value: string }[]) => {
    setLastImport({ previous: rows, count: entries.length, pasted: false })
    onChange(mergeEntries(rows, entries))
  }

  /**
   * A paste into one of a row's fields, before the input sees it. Returns
   * whether it was consumed as a `.env` document.
   *
   * The key field takes anything that parses, because `KEY=value` typed into a
   * name box is never a name. The value field asks for more evidence — a single
   * line containing `=` is a perfectly ordinary connection string or JWT, and
   * shredding one into variables would be far worse than leaving it alone — so
   * only a multi-line paste is treated as a file there.
   */
  const pasteIntoRow = (id: string, text: string, field: "key" | "value"): boolean => {
    if (field === "value" && !/\r?\n/.test(text.trim())) return false

    const parsed = parseDotEnv(text)
    if (parsed.entries.length === 0) return false

    // The row pasted into is consumed when it is still blank: the first entry
    // belongs in it, and leaving an empty row behind the new ones is litter.
    const target = rows.find((row) => row.id === id)
    const targetIsBlank = target?.key.trim() === "" && target.value === ""
    const base = targetIsBlank ? rows.filter((row) => row.id !== id) : rows

    setLastImport({ previous: rows, count: parsed.entries.length, pasted: true })
    onChange(mergeEntries(base, parsed.entries))
    return true
  }

  const undo = () => {
    if (!lastImport) return
    onChange(lastImport.previous)
    setLastImport(null)
  }

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {label}
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-[12px]"
          onClick={() => {
            setImportOpen(true)
          }}
        >
          <FileUp className="size-3.5" />
          {t("managedApps.index.importEnv")}
        </Button>
      </div>

      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((row) => (
            <EnvVarRow
              key={row.id}
              row={row}
              duplicate={duplicates.has(row.key.trim())}
              onChange={replaceRow}
              onRemove={() => {
                removeRow(row.id)
              }}
              onPasteText={(text, field) => pasteIntoRow(row.id, text, field)}
              previewEnabled={previewEnabled}
            />
          ))}
        </div>
      )}

      {lastImport && (
        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 glass-1-bg px-2.5 py-1.5">
          <p className="text-[11px] text-muted-foreground">
            {lastImport.count === 1 ? "1 variable" : `${String(lastImport.count)} variables`}{" "}
            {lastImport.pasted ? "split from your paste" : "added from the .env"}. Remove them one
            by one, or take the whole lot back.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 gap-1 px-1.5 text-[11px]"
            onClick={undo}
          >
            <Undo2 className="size-3" />
            Undo
          </Button>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        onClick={() => {
          commit([...rows, newEnvRow()])
        }}
      >
        <Plus className="size-3.5" />
        {t("managedApps.index.addVariable")}
      </Button>

      {description && <p className="text-[11px] text-muted-foreground">{description}</p>}

      <EnvImportSheet open={importOpen} onOpenChange={setImportOpen} onImport={importEntries} />
    </div>
  )
}
