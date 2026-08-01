import { ExternalLink } from "lucide-react"

import { staggerDelay } from "@/components/console"
import { TONE_DOT_CLASSES } from "@/components/console/status-config"
import { cn } from "@/lib/utils"

import { timeSince, type ActivityEvent } from "./activity-events"

interface ActivityEventRowProps {
    event: ActivityEvent
    /** Position in the rendered list — drives the entrance stagger only. */
    index: number
    /** Last row ends the spine — a connector below it would point at nothing. */
    isLast: boolean
}

/** One event on the timeline: dot on the spine, title, stamp, detail line. */
export function ActivityEventRow({ event, index, isLast }: Readonly<ActivityEventRowProps>) {
    const stampMs = new Date(event.at).getTime()

    return (
        <li className="animate-content-enter relative flex gap-3" style={staggerDelay(index)}>
            <span className="flex flex-col items-center" aria-hidden>
                {/* mt-1.5 centres the dot on the title's cap height, not the row box. */}
                <span
                    className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        TONE_DOT_CLASSES[event.tone]
                    )}
                />
                {!isLast && <span className="mt-1 w-px flex-1 bg-border/60" />}
            </span>

            <div className={cn("min-w-0 flex-1", !isLast && "pb-4")}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                    <span className="text-[13px] font-medium text-foreground">{event.title}</span>
                    <span
                        className="font-mono text-[11px] whitespace-nowrap text-muted-foreground"
                        title={
                            Number.isNaN(stampMs) ? undefined : new Date(event.at).toLocaleString()
                        }
                    >
                        {Number.isNaN(stampMs) ? "—" : timeSince(event.at)}
                    </span>
                </div>

                {(event.detail !== "" || event.href != null) && (
                    <p
                        className={cn(
                            "mt-0.5 text-[12px]",
                            // A failure's detail is the server's verbatim error —
                            // the one line on this feed that must not read as muted.
                            event.tone === "danger"
                                ? "font-mono text-destructive"
                                : "text-muted-foreground"
                        )}
                    >
                        {event.href != null ? (
                            <a
                                href={event.href}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-status-info hover:underline"
                            >
                                {event.detail !== "" ? event.detail : "View the run on GitHub"}
                                <ExternalLink className="size-3" />
                            </a>
                        ) : (
                            event.detail
                        )}
                    </p>
                )}
            </div>
        </li>
    )
}
