import { cn } from "@datadack/common-ui"
import { useTranslation } from "react-i18next"

import type { ServiceHealthStatus, ServiceState } from "../../superadmin.types"

// Shared by the service rows, the module rows and the module sheet, so a state
// never reads one way in the list and another in the editor.
const PILL = "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium"

const STATE_STYLES: Record<ServiceState, string> = {
  enabled: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  coming_soon: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  disabled: "border-border-glass bg-muted/50 text-muted-foreground",
}

export function StateBadge({ state }: Readonly<{ state: ServiceState }>) {
  const { t } = useTranslation()
  return (
    <span className={cn(PILL, STATE_STYLES[state])}>
      {t(`superAdmin.services.states.${state}`)}
    </span>
  )
}

const STATUS_STYLES: Record<ServiceHealthStatus, string> = {
  operational: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  degraded: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  maintenance: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
}

export function HealthBadge({ status }: Readonly<{ status: ServiceHealthStatus }>) {
  const { t } = useTranslation()
  return (
    <span className={cn(PILL, STATUS_STYLES[status])}>
      {t(`superAdmin.services.statuses.${status}`)}
    </span>
  )
}
