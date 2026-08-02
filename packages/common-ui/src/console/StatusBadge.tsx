import { Loader2 } from "lucide-react"

import { getStatusConfig, TONE_CLASSES, TONE_DOT_CLASSES } from "./status-config"
import { css, cx } from "../lib/emotion"
import { animatePulse, animateSpin, fontMono } from "../lib/styles"
import { Badge } from "../ui/badge"

const badge = css`
  gap: 6px;
  font-family: ${fontMono};
  font-size: 11px;
`

const spinner = css`
  width: 12px;
  height: 12px;
`

const dot = css`
  width: 6px;
  height: 6px;
  border-radius: 9999px;
`

interface StatusBadgeProps {
  status: string
  /** Renders an animated activity dot (use for live/healthy states) */
  pulse?: boolean
  className?: string
}

export function StatusBadge({ status, pulse = false, className }: Readonly<StatusBadgeProps>) {
  const { tone, label, busy } = getStatusConfig(status)

  return (
    <Badge variant="outline" className={cx(badge, TONE_CLASSES[tone], className)}>
      {/* In-flight statuses always show a loader until the operation settles. */}
      {busy ? (
        <Loader2 className={cx(spinner, animateSpin)} />
      ) : (
        pulse && <span className={cx(dot, animatePulse, TONE_DOT_CLASSES[tone])} />
      )}
      {label}
    </Badge>
  )
}
