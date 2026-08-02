import { useState } from "react"

import { Badge, Button, Input } from "@datadack/common-ui"
import { Eye, EyeOff, Trash2 } from "lucide-react"

import { cn } from "@/lib/utils"

import type { EnvRow } from "./env-types"

interface EnvVarRowProps {
  row: EnvRow
  duplicate: boolean
  onChange: (row: EnvRow) => void
  onRemove: () => void
}

/**
 * One key/value pair.
 *
 * A `stored` row shows a placeholder that says the value is set but hidden,
 * never an empty input — the backend returns names only, so an empty box here
 * would read as "this variable has no value" and invite a save that wipes it.
 * Typing into it flips the row to `edited`, which is the only signal that a
 * real replacement was supplied.
 */
export function EnvVarRow({ row, duplicate, onChange, onRemove }: Readonly<EnvVarRowProps>) {
  const [revealed, setRevealed] = useState(false)
  const isStored = row.state === "stored"
  const canReveal = row.value !== "" && !isStored

  return (
    <div className="flex items-start gap-2">
      <div className="w-full sm:w-56">
        <Input
          value={row.key}
          placeholder="KEY"
          aria-label="Variable name"
          data-invalid={duplicate ? "true" : undefined}
          className={cn(
            "font-mono",
            duplicate && "border-destructive focus-visible:ring-destructive/20",
          )}
          onChange={(event) => {
            onChange({ ...row, key: event.target.value })
          }}
        />
        {duplicate && (
          <p className="mt-1 text-[11px] text-destructive">Already used — the last row wins.</p>
        )}
      </div>

      <div className="relative flex-1">
        <Input
          value={row.value}
          type={revealed || row.value === "" ? "text" : "password"}
          placeholder={isStored ? "Set — type to replace" : "value"}
          aria-label="Variable value"
          className={cn("font-mono", canReveal && "pr-9")}
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
