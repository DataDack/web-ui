import { Badge } from "@DataDack/common-ui"
import { useTranslation } from "react-i18next"

import type { StatusTone } from "@/components/console"
import { cn } from "@/lib/utils"

import { priorityMeta } from "../support-tickets.constants"
import type { TicketPriority } from "../support-tickets.types"

// Priority isn't a lifecycle status, so it renders its own badge rather than
// going through StatusBadge — but it reuses the same status-tone color tokens
// so the palette stays consistent across the console.
const TONE_CLASSES: Record<StatusTone, string> = {
  success: "text-status-success bg-status-success-bg border-status-success/25",
  neutral: "text-status-neutral bg-status-neutral-bg border-status-neutral/25",
  warning: "text-status-warning bg-status-warning-bg border-status-warning/25",
  danger: "text-status-danger bg-status-danger-bg border-status-danger/25",
  info: "text-status-info bg-status-info-bg border-status-info/25",
}

export function PriorityBadge({
  priority,
  className,
}: Readonly<{ priority: TicketPriority; className?: string }>) {
  const { t } = useTranslation()
  const meta = priorityMeta(priority)
  return (
    <Badge
      variant="outline"
      className={cn("font-mono text-[11px]", TONE_CLASSES[meta.tone], className)}
    >
      {t(meta.labelKey, { defaultValue: priority })}
    </Badge>
  )
}
