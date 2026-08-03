import { useMemo } from "react"

import { cn } from "@datadack/common-ui"

import { deriveActivityEvents } from "./activity-events"
import { ActivityEventRow } from "./ActivityEventRow"
import type { Build } from "../../managed-apps.types"

interface ActivityTimelineProps {
  builds: readonly Build[]
  className?: string
}

/**
 * Deployment activity — every lifecycle event across the build list, newest
 * first on one spine.
 *
 * Derived entirely from the build rows the caller already holds (see
 * activity-events.ts): the history table answers "what happened to each
 * build", this answers "what happened to the project, in order" — a push
 * superseding a running build reads as interleaved events here, where the
 * table shows two unrelated rows.
 *
 * Renders nothing when there are no builds rather than its own empty state:
 * every caller sits behind the builds tab's EmptyState already, and a second
 * "nothing yet" card on the same screen would just repeat it.
 */
export function ActivityTimeline({ builds, className }: Readonly<ActivityTimelineProps>) {
  const events = useMemo(() => deriveActivityEvents(builds), [builds])

  if (events.length === 0) return null

  return (
    <ol className={cn("glass-1 rounded-xl border border-border/60 p-4", className)}>
      {events.map((event, index) => (
        <ActivityEventRow
          key={event.id}
          event={event}
          index={index}
          isLast={index === events.length - 1}
        />
      ))}
    </ol>
  )
}
