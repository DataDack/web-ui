import { useEffect, useState } from "react"

import { cn } from "@datadack/common-ui"

import { TRANSITIONAL_BUILD_STATUSES, type Build } from "../managed-apps.types"

/**
 * The in-flight statuses, in the order a build moves through them.
 *
 * Derived from TRANSITIONAL_BUILD_STATUSES rather than restated, so the rail
 * can never disagree with the list that decides whether a build is still
 * running — the bar is only rendered for a transitional build, and a stage
 * missing from one list but present in the other would render an empty rail.
 *
 * BuildStatusPill gives all of these the same `info` tone and no ordering, so
 * without this a user watching a deploy cannot tell how far along it is.
 */
const STAGES = TRANSITIONAL_BUILD_STATUSES

const STAGE_LABELS: Record<string, string> = {
  queued: "Queued",
  cloning: "Cloning",
  building: "Building",
  uploading: "Uploading",
  deploying: "Deploying",
}

/**
 * Whether a nullable stamp is actually set. Kept local so components/ does not
 * reach into partials/ — nullable stamps serialize as null, Go zero times as
 * "0001-01-01T00:00:00Z" (negative epoch ms), and empty strings parse as NaN.
 */
function isTimeSet(iso: string | null | undefined): iso is string {
  if (!iso) return false
  const ms = new Date(iso).getTime()
  return !Number.isNaN(ms) && ms > 0
}

/** mm:ss, or h:mm:ss once a build has been running for over an hour. */
function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const seconds = String(total % 60).padStart(2, "0")
  const minutes = Math.floor(total / 60)
  if (minutes < 60) return `${String(minutes).padStart(2, "0")}:${seconds}`
  return `${String(Math.floor(minutes / 60))}:${String(minutes % 60).padStart(2, "0")}:${seconds}`
}

interface BuildProgressBarProps {
  build: Build
  className?: string
}

/**
 * Five-segment stage rail plus a live elapsed timer, shown while a build is in
 * flight. The timer counts from `started_at` (stamped when the build leaves the
 * queue) and falls back to `created_at` for a build still queued.
 */
export function BuildProgressBar({ build, className }: Readonly<BuildProgressBarProps>) {
  const startIso = isTimeSet(build.started_at) ? build.started_at : build.created_at
  const [elapsed, setElapsed] = useState(() => Date.now() - new Date(startIso).getTime())

  useEffect(() => {
    const tick = () => {
      setElapsed(Date.now() - new Date(startIso).getTime())
    }
    tick()
    const timer = setInterval(tick, 1000)
    return () => {
      clearInterval(timer)
    }
  }, [startIso])

  const current = STAGES.indexOf(build.status)
  // An unknown/settled status leaves the rail empty rather than guessing.
  if (current === -1) return null

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center gap-1" aria-hidden>
        {STAGES.map((stage, index) => (
          <span
            key={stage}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              index < current && "bg-status-info",
              index === current && "animate-pulse bg-status-info",
              index > current && "bg-border/60",
            )}
          />
        ))}
      </div>
      <p className="font-mono text-[11px] text-muted-foreground">
        {STAGE_LABELS[build.status] ?? build.status} · step {String(current + 1)} of{" "}
        {String(STAGES.length)} · {formatElapsed(elapsed)}
      </p>
    </div>
  )
}
