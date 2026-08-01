import type { ReactNode } from "react"

import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

import { Badge } from "@datadack/serverless-ui"

import { FieldRow } from "./FieldRow"

interface OverrideFieldProps {
  /** Plain text, not a node — it also names the override switch for a
   *  screen reader, and a node has no sensible reading. */
  label: string
  /** What the server uses when this field is left empty. Never invented. */
  inheritedValue: string
  value: string
  onChange: (value: string) => void
  id: string
  description?: ReactNode
  placeholder?: string
  /**
   * False when overriding cannot do anything — an OpenNext build chooses its
   * own output directory, so the control is shown locked with the reason
   * rather than hidden, which would leave the user wondering where it went.
   */
  editable?: boolean
  lockedReason?: ReactNode
  className?: string
}

/**
 * A build setting that inherits a default until the user takes it over.
 *
 * The inherited value is shown as the real string, not a vague "(default)" —
 * the whole point is that a user can see exactly what will run before deciding
 * whether to change it. Turning the switch off restores inheritance and
 * discards the override, because a disabled field still holding stale text is
 * the fastest way to ship the wrong build command.
 */
export function OverrideField({
  label,
  inheritedValue,
  value,
  onChange,
  id,
  description,
  placeholder,
  editable = true,
  lockedReason,
  className,
}: Readonly<OverrideFieldProps>) {
  const overridden = value !== ""

  return (
    <FieldRow
      label={label}
      htmlFor={id}
      description={description}
      className={className}
      aside={
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              "font-mono text-[10px] tracking-wide uppercase",
              overridden ? "border-status-info/30 text-status-info" : "text-muted-foreground",
            )}
          >
            {overridden ? "Overridden" : "Default"}
          </Badge>
          <Switch
            checked={overridden}
            disabled={!editable}
            aria-label={`Override ${label}`}
            onCheckedChange={(checked) => {
              // Seeding the input with the inherited value makes the
              // override an edit rather than a blank box; clearing on
              // the way out is what actually restores the default.
              onChange(checked ? inheritedValue : "")
            }}
          />
        </div>
      }
    >
      {overridden ? (
        <Input
          id={id}
          value={value}
          placeholder={placeholder ?? inheritedValue}
          className="font-mono"
          onChange={(event) => {
            onChange(event.target.value)
          }}
        />
      ) : (
        <div className="flex h-9 items-center rounded-md border border-dashed border-border/60 px-3">
          <code className="truncate text-[13px] text-muted-foreground">{inheritedValue}</code>
        </div>
      )}
      {!editable && lockedReason && (
        <p className="text-[11px] text-muted-foreground">{lockedReason}</p>
      )}
    </FieldRow>
  )
}
