import { Loader2 } from 'lucide-react'

import { getStatusConfig, TONE_CLASSES, TONE_DOT_CLASSES } from './status-config'
import { cn } from '../lib/cn'
import { Badge } from '../ui/badge'

interface StatusBadgeProps {
  status: string
  /** Renders an animated activity dot (use for live/healthy states) */
  pulse?: boolean
  className?: string
}

export function StatusBadge({ status, pulse = false, className }: Readonly<StatusBadgeProps>) {
  const { tone, label, busy } = getStatusConfig(status)

  return (
    <Badge
      variant="outline"
      className={cn('gap-1.5 font-mono text-[11px]', TONE_CLASSES[tone], className)}
    >
      {/* In-flight statuses always show a loader until the operation settles. */}
      {busy ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        pulse && (
          <span className={cn('size-1.5 animate-pulse rounded-full', TONE_DOT_CLASSES[tone])} />
        )
      )}
      {label}
    </Badge>
  )
}
