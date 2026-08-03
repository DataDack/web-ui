// The two chips every monitoring page renders. They live apart from
// monitoring.meta so that module can stay a plain non-component file — a file
// that exports both components and helpers breaks fast refresh for everything
// importing it.

import { Badge, cn } from "@datadack/common-ui"

import { SEVERITY_BADGE_CLASS } from "../channels/channels.meta"
import { ALARM_STATE_META } from "../monitoring.meta"
import type { AlarmState, AlertSeverity } from "../monitoring.types"

export function AlarmStateChip({
  state,
  withDot = true,
  className,
}: Readonly<{ state: AlarmState; withDot?: boolean; className?: string }>) {
  const meta = ALARM_STATE_META[state]
  return (
    <Badge
      variant="outline"
      className={cn("shrink-0 gap-1.5 font-mono text-[11px]", meta.badgeClass, className)}
      title={meta.hint}
    >
      {withDot && <span className={cn("size-1.5 rounded-full", meta.dotClass)} />}
      {meta.label}
    </Badge>
  )
}

export function SeverityChip({
  severity,
  className,
}: Readonly<{ severity: AlertSeverity; className?: string }>) {
  return (
    <Badge
      variant="outline"
      className={cn("shrink-0 font-mono text-[11px]", SEVERITY_BADGE_CLASS[severity], className)}
    >
      {severity}
    </Badge>
  )
}
