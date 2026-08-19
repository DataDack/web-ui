import { useMemo } from "react"

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
  cn,
} from "@datadack/common-ui"

import { buildFallbackLabel, deriveBuildEvents, eventStamp, shortSha } from "./activity-events"
import { ActivityEventRow } from "./ActivityEventRow"
import type { Build } from "../../managed-apps.types"
import { BuildStatusPill } from "../BuildStatusPill"

interface ActivityTimelineProps {
  builds: readonly Build[]
  className?: string
}

/**
 * Deployment activity — lifecycle events grouped per build, one accordion
 * section each, chronological inside the section.
 *
 * Derived entirely from the build rows the caller already holds (see
 * activity-events.ts). This used to be one interleaved feed across every
 * build, newest event first — which read a lifecycle backwards and, past a
 * handful of builds, gave no way to tell which event belonged to which build.
 * A lifecycle is a story; each build gets to tell its own, oldest → newest,
 * and the newest build's story starts open because it is the one the reader
 * came for.
 *
 * Renders nothing when there are no builds rather than its own empty state:
 * every caller sits behind the builds tab's EmptyState already, and a second
 * "nothing yet" card on the same screen would just repeat it.
 */
export function ActivityTimeline({ builds, className }: Readonly<ActivityTimelineProps>) {
  // Newest build first, matching the history table above it — but the events
  // INSIDE each section stay oldest-first.
  const sorted = useMemo(
    () =>
      [...builds].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [builds],
  )

  if (sorted.length === 0) return null

  return (
    <Accordion
      type="multiple"
      defaultValue={sorted[0] ? [sorted[0].id] : []}
      className={cn("rounded-xl border border-border/60 glass-1-bg px-4", className)}
    >
      {sorted.map((build) => {
        const events = deriveBuildEvents(build)
        return (
          <AccordionItem key={build.id} value={build.id}>
            {/* no-underline: the trigger's default hover underline is for prose
                titles, and underlining a status pill next to a sha reads as a
                rendering bug rather than an affordance. */}
            <AccordionTrigger className="py-3 hover:no-underline">
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1">
                <BuildStatusPill status={build.status} />
                {build.commit_sha !== "" && (
                  <span className="font-mono text-[12px] text-muted-foreground">
                    {shortSha(build.commit_sha)}
                  </span>
                )}
                <span className="min-w-0 truncate text-[13px] font-medium text-foreground">
                  {build.commit_message || buildFallbackLabel(build.triggered_by)}
                </span>
                <span className="ml-auto pr-1 font-mono text-[11px] whitespace-nowrap text-muted-foreground">
                  {eventStamp(build.created_at)}
                </span>
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <ol className="pt-1">
                {events.map((event, index) => (
                  <ActivityEventRow
                    key={event.id}
                    event={event}
                    index={index}
                    isLast={index === events.length - 1}
                  />
                ))}
              </ol>
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
