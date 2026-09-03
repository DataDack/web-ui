import { cn } from "@datadack/common-ui"
import { ExternalLink, Loader2 } from "lucide-react"

import { eventClock, eventOffset, type LifecycleEvent, type LifecycleTone } from "./lifecycle"

const TONE_TEXT: Record<LifecycleTone, string> = {
  muted: "text-muted-foreground",
  info: "text-status-info",
  success: "text-status-success",
  danger: "text-status-danger",
}

const TONE_DOT: Record<LifecycleTone, string> = {
  muted: "bg-muted-foreground/40",
  info: "bg-status-info",
  success: "bg-status-success",
  danger: "bg-status-danger",
}

interface LifecycleLinesProps {
  events: LifecycleEvent[]
  /** Time zero for the +offset column — the moment the build was queued. */
  originIso: string
  /** The number of the first row here, so the gutter runs unbroken. */
  startNumber: number
  /** Separator side, so the block reads as attached to the output next to it. */
  edge: "top" | "bottom"
}

/**
 * Platform lifecycle events, rendered as log lines.
 *
 * Same table geometry as the runner's output — a numbered gutter of the same
 * width, then the line — because these are lines of the same log, read in one
 * pass. What they are NOT is part of the runner's text: Copy and Download emit
 * the bytes GitHub has, so nothing synthesised here ends up in a log somebody
 * pastes into an issue.
 */
export function LifecycleLines({
  events,
  originIso,
  startNumber,
  edge,
}: Readonly<LifecycleLinesProps>) {
  if (events.length === 0) return null

  return (
    <table
      className={cn(
        "w-full border-collapse glass-1-bg font-mono text-[12px] leading-relaxed",
        edge === "top" ? "border-b border-border/40" : "border-t border-border/40",
      )}
    >
      <tbody>
        {events.map((event, index) => (
          <tr key={event.key} className="align-baseline">
            <td className="w-12 shrink-0 select-none border-r border-border/40 px-2 text-right text-muted-foreground/50 tabular-nums">
              {index + startNumber}
            </td>
            <td className="px-3 py-px">
              <span className="flex min-w-0 items-baseline gap-2">
                <span className="shrink-0 tabular-nums text-muted-foreground/70">
                  {eventClock(event.at)}
                </span>
                <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground/50">
                  {eventOffset(event.at, originIso)}
                </span>

                {/* Fixed-width marker column so a spinner and a dot leave the
								    labels on the same column. */}
                <span className="flex w-3 shrink-0 justify-center self-center">
                  {event.pending ? (
                    <Loader2 className={cn("size-3 animate-spin", TONE_TEXT[event.tone])} />
                  ) : (
                    <span
                      className={cn("size-1.5 rounded-full", TONE_DOT[event.tone])}
                      aria-hidden
                    />
                  )}
                </span>

                <span className="min-w-0">
                  <span className={cn("font-medium", TONE_TEXT[event.tone])}>{event.label}</span>
                  {event.detail && <span className="text-muted-foreground"> — {event.detail}</span>}
                  {event.href && (
                    <a
                      href={event.href}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-1.5 inline-flex items-baseline gap-1 text-status-info hover:underline"
                    >
                      view run
                      <ExternalLink className="size-3 translate-y-px" />
                    </a>
                  )}
                </span>
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
