import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

import { Badge } from "@DataDack/common-ui"

import { getStatusConfig, TONE_CLASSES, TONE_DOT_CLASSES } from "./status-config"

interface StatusBadgeProps {
  status: string
  /** Renders an animated activity dot (use for live/healthy states) */
  pulse?: boolean
  className?: string
}

export function StatusBadge({ status, pulse = false, className }: Readonly<StatusBadgeProps>) {
  const { t } = useTranslation()
  const { tone, labelKey, busy } = getStatusConfig(status)

  return (
    <Badge
      variant="outline"
      className={cn("font-mono text-[11px] gap-1.5", TONE_CLASSES[tone], className)}
    >
      {/* In-flight statuses always show a loader until the operation settles. */}
      {busy ? (
        <Loader2 className="size-3 animate-spin" />
      ) : (
        pulse && (
          <span className={cn("size-1.5 rounded-full animate-pulse", TONE_DOT_CLASSES[tone])} />
        )
      )}
      {t(labelKey, { defaultValue: status })}
    </Badge>
  )
}
