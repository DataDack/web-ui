import { ExternalLink, Loader2 } from "lucide-react"

import { cn } from "@datadack/common-ui"

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
  /** Separator side, so the block reads as attached to the output next to it. */
  edge: "top" | "bottom"
}

/**
 * Platform lifecycle events, rendered in the log's own typeface.
 *
 * Deliberately NOT merged into the runner's text: the line numbers in this
 * viewer are the runner's line numbers, and the log this console downloads and
 * copies is the one GitHub has. Inserting synthesised lines into that stream
 * would renumber every real line and put text in a copied log that no runner
 * ever printed.
 */
export function LifecycleLines({ events, originIso, edge }: Readonly<LifecycleLinesProps>) {
  if (events.length === 0) return null

  return (
    <div
      className={cn(
        "bg-muted/40 px-3 py-2 font-mono text-[12px] leading-relaxed",
        edge === "top" ? "border-b border-border/40" : "border-t border-border/40",
      )}
    >
      {events.map((event) => (
        <div key={event.key} className="flex min-w-0 items-baseline gap-2 py-px">
          <span className="shrink-0 tabular-nums text-muted-foreground/70">
            {eventClock(event.at)}
          </span>
          <span className="w-16 shrink-0 text-right tabular-nums text-muted-foreground/50">
            {eventOffset(event.at, originIso)}
          </span>

          {/* Fixed-width gutter so a spinner and a dot leave the labels on
					    the same column — the block is read as a list, not a sentence. */}
          <span className="flex w-3 shrink-0 justify-center self-center">
            {event.pending ? (
              <Loader2 className={cn("size-3 animate-spin", TONE_TEXT[event.tone])} />
            ) : (
              <span className={cn("size-1.5 rounded-full", TONE_DOT[event.tone])} aria-hidden />
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
        </div>
      ))}
    </div>
  )
}
