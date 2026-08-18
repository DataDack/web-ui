import { useState, type ClipboardEvent } from "react"

import { Badge, Button, cn, Input } from "@datadack/common-ui"
import { Eye, EyeOff, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { allEnvTargets, type EnvRow } from "./env-types"
import { ENV_TARGET_LABELS, ENV_TARGETS } from "../../../managed-apps.constants"
import type { EnvTarget } from "../../../managed-apps.types"

/** The chips are narrow; the full name is on the title and the aria label. */
const SHORT_LABEL: Record<EnvTarget, string> = {
  production: "Prod",
  preview: "Preview",
}

/** What the chip says on hover: what a click would do, or why it cannot. */
function targetHint(label: string, enabled: boolean, last: boolean): string {
  if (last) return `${label} — a variable has to apply somewhere`
  return enabled ? `Remove from ${label}` : `Add to ${label}`
}

/** Toggle one target, keeping ENV_TARGETS order so two equal scopes render
 *  identically however they were clicked together. */
function toggleTarget(targets: readonly EnvTarget[], target: EnvTarget): EnvTarget[] {
  const next = targets.includes(target)
    ? targets.filter((item) => item !== target)
    : [...targets, target]
  const ordered = allEnvTargets().filter((item) => next.includes(item))
  return ordered.length > 0 ? ordered : allEnvTargets()
}

interface EnvVarRowProps {
  row: EnvRow
  duplicate: boolean
  onChange: (row: EnvRow) => void
  onRemove: () => void
  /**
   * Offered the raw clipboard text before it lands in an input. Returning true
   * means the editor turned it into rows and this input must not also receive
   * it — a `.env` pasted into a box would otherwise sit there as one long
   * string that saves as a single nonsense variable.
   */
  onPasteText?: (text: string, field: "key" | "value") => boolean
  /**
   * Whether the project has a preview environment. The target chips are hidden
   * when it does not: with one deployment there is nothing to choose between,
   * and a pair of chips that cannot mean anything is worse than no chips.
   * Stored targets are left untouched, so turning preview back on restores
   * every scope as it was.
   */
  previewEnabled?: boolean
}

/**
 * One key/value pair.
 *
 * A `stored` row shows a placeholder that says the value is set but hidden,
 * never an empty input — the backend returns names only, so an empty box here
 * would read as "this variable has no value" and invite a save that wipes it.
 * Typing into it flips the row to `edited`, which is the only signal that a
 * real replacement was supplied.
 *
 * Key and value share the row equally. The key used to be a fixed 224px column
 * against a value that took the rest, which made the two fields look like
 * different KINDS of input; they are two halves of one pair, and a pasted URL
 * or JWT needs the room as much as a long name does.
 *
 * The target toggles scope the variable. The last enabled one cannot be turned
 * off: an empty scope is read as "everywhere" by the API, so a row showing two
 * dark chips would mean the exact opposite of what it looks like. Removing the
 * variable is the way to make it apply nowhere.
 */
export function EnvVarRow({
  row,
  duplicate,
  onChange,
  onRemove,
  onPasteText,
  previewEnabled = false,
}: Readonly<EnvVarRowProps>) {
  const { t } = useTranslation()
  const [revealed, setRevealed] = useState(false)
  const isStored = row.state === "stored"
  const canReveal = row.value !== "" && !isStored

  const handlePaste = (field: "key" | "value") => (event: ClipboardEvent<HTMLInputElement>) => {
    if (!onPasteText) return
    const text = event.clipboardData.getData("text")
    if (onPasteText(text, field)) event.preventDefault()
  }

  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <Input
          value={row.key}
          placeholder="KEY"
          aria-label={t("managedApps.envVarRow.variableName")}
          data-invalid={duplicate ? "true" : undefined}
          className={cn(
            "font-mono",
            duplicate && "border-destructive focus-visible:ring-destructive/20",
          )}
          onPaste={handlePaste("key")}
          onChange={(event) => {
            onChange({ ...row, key: event.target.value })
          }}
        />
        {duplicate && (
          <p className="mt-1 text-[11px] text-destructive">
            {t("managedApps.envVarRow.alreadyUsedTheLastRowWins")}
          </p>
        )}
      </div>

      <div className="relative min-w-0 flex-1">
        <Input
          value={row.value}
          type={revealed || row.value === "" ? "text" : "password"}
          placeholder={isStored ? "Set — type to replace" : "value"}
          aria-label={t("managedApps.envVarRow.variableValue")}
          className={cn("font-mono", canReveal && "pr-9")}
          onPaste={handlePaste("value")}
          onChange={(event) => {
            onChange({
              ...row,
              value: event.target.value,
              // A stored row only becomes a real write once touched.
              state: isStored ? "edited" : row.state,
            })
          }}
        />
        {canReveal && (
          <button
            type="button"
            aria-label={revealed ? "Hide value" : "Reveal value"}
            className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => {
              setRevealed((current) => !current)
            }}
          >
            {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
        )}
      </div>

      {previewEnabled && (
        <div className="flex shrink-0 items-center gap-1 pt-1">
          {ENV_TARGETS.map((target) => {
            const enabled = row.targets.includes(target)
            const last = enabled && row.targets.length === 1

            return (
              <button
                key={target}
                type="button"
                aria-pressed={enabled}
                disabled={last}
                title={targetHint(ENV_TARGET_LABELS[target], enabled, last)}
                className={cn(
                  "rounded-md border px-1.5 py-1 font-mono text-[10px] tracking-wide uppercase transition-colors",
                  enabled
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : "border-border/60 text-muted-foreground hover:text-foreground",
                  last && "cursor-default",
                )}
                onClick={() => {
                  if (last) return
                  onChange({ ...row, targets: toggleTarget(row.targets, target) })
                }}
              >
                {SHORT_LABEL[target]}
              </button>
            )
          })}
        </div>
      )}

      {isStored && (
        <Badge
          variant="outline"
          className="mt-2 hidden shrink-0 text-[10px] text-muted-foreground sm:inline-flex"
        >
          Saved
        </Badge>
      )}

      <Button
        type="button"
        size="icon"
        variant="ghost"
        aria-label={`Remove ${row.key || "variable"}`}
        className="shrink-0"
        onClick={onRemove}
      >
        <Trash2 className="size-3.5 text-destructive" />
      </Button>
    </div>
  )
}
