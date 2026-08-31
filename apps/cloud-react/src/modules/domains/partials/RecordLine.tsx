import { useEffect, useRef, useState } from "react"

import { Check, Copy } from "lucide-react"
import { toast } from "sonner"

/**
 * One DNS record field on one line: fixed label, the value in its own mono well
 * (single line, horizontal scroll rather than wrap — DNS values are pasted, not
 * read), and a dedicated copy button that grabs the VALUE alone.
 *
 * Shared by both domain flows. The per-hostname dialog and the account registrar
 * show the same kind of thing — a record to paste into a DNS panel — and the one
 * detail that matters is that the button copies the value WITHOUT the label:
 * a challenge token with "Value: " glued to the front looks right in the panel
 * and fails every check.
 */
export function RecordLine({
  label,
  value,
  copied,
}: Readonly<{ label: string; value: string; copied: string }>) {
  const [done, setDone] = useState(false)
  // Cleared on unmount: the dialog can close inside the 1.5s window, and a
  // setState on an unmounted component is a warning in the console for a purely
  // decorative checkmark.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )

  const copy = async () => {
    await navigator.clipboard.writeText(value)
    toast.success(copied)
    setDone(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      setDone(false)
    }, 1500)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="w-14 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5 font-mono text-[12px] text-foreground [scrollbar-width:none]">
        {value}
      </code>
      <button
        type="button"
        onClick={() => void copy()}
        aria-label={`${label}: copy`}
        className="grid size-7 shrink-0 place-items-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
      >
        {done ? <Check className="size-3.5 text-status-success" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  )
}
