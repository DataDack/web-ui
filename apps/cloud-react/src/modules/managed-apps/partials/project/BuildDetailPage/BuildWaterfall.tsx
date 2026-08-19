import { cn } from "@datadack/common-ui"

import type { Build } from "../../../managed-apps.types"
import { formatDuration, isTimeSet } from "../build-format"

interface WaterfallStage {
  label: string
  start: string | null
  end: string | null
}

function timestamp(value: string | null): number | undefined {
  return isTimeSet(value) ? new Date(value).getTime() : undefined
}

/** Compact Gantt-style view of the timestamps the control plane records. */
export function BuildWaterfall({
  build,
  className,
}: Readonly<{ build: Build; className?: string }>) {
  const terminalAt = isTimeSet(build.finished_at) ? build.finished_at : null
  const activeEnd = terminalAt ?? new Date().toISOString()
  const claimedOrLater = build.claimed_at ?? build.started_at ?? terminalAt
  const stages: WaterfallStage[] = [
    { label: "Queue", start: build.created_at, end: claimedOrLater ?? activeEnd },
    { label: "Setup", start: build.claimed_at, end: build.started_at ?? terminalAt },
    { label: "Build", start: build.started_at, end: build.artifact_at ?? terminalAt },
    {
      label: "Deploy",
      start: build.artifact_at,
      end: build.status === "ready" ? terminalAt : null,
    },
  ]

  const origin = timestamp(build.created_at) ?? Date.now()
  const finish = timestamp(activeEnd) ?? origin
  const range = Math.max(finish - origin, 1)

  return (
    <div className={className} aria-label="Build phase waterfall">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-[10px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          Pipeline
        </span>
        <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
          {formatDuration(build.created_at, activeEnd)} total
        </span>
      </div>

      <ol className="space-y-1.5">
        {stages.map((stage) => {
          const start = timestamp(stage.start)
          const end = timestamp(stage.end)
          const reached = start != null
          const left = reached ? Math.max(0, ((start - origin) / range) * 100) : 0
          const width = reached && end != null ? Math.max(2, ((end - start) / range) * 100) : 0

          return (
            <li
              key={stage.label}
              className="grid grid-cols-[46px_minmax(0,1fr)_48px] items-center gap-2"
            >
              <span
                className={cn(
                  "text-[10px]",
                  reached ? "text-foreground/80" : "text-muted-foreground/45",
                )}
              >
                {stage.label}
              </span>
              <span className="relative h-1.5 overflow-hidden rounded-full bg-muted/45">
                {reached && end != null && (
                  <span
                    className={cn(
                      "absolute inset-y-0 rounded-full",
                      stage.label === "Deploy" ? "bg-status-success" : "bg-brand-gold",
                    )}
                    style={{
                      left: `${String(left)}%`,
                      width: `${String(Math.min(width, 100 - left))}%`,
                    }}
                  />
                )}
              </span>
              <span className="text-right font-mono text-[10px] text-muted-foreground tabular-nums">
                {reached && stage.end ? formatDuration(stage.start, stage.end) : "—"}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
