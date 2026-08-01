import { AlertTriangle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { useQuotas } from "@/modules/governance/quotas.hooks"
import type { EffectiveQuota } from "@/modules/governance/quotas.types"

interface QuotaNoticeProps {
  /** Quota code, e.g. "compute.vm_instances". */
  code: string
  /** How many resources the pending action would create (default 1). */
  count?: number
}

function findBlocked(
  quotas: EffectiveQuota[] | undefined,
  code: string,
  count: number,
): EffectiveQuota | null {
  const quota = quotas?.find((q) => q.code === code)
  if (!quota || quota.limit === -1) return null
  return quota.usage + count > quota.limit ? quota : null
}

/**
 * True when creating `count` more of `code` would exceed the account's quota —
 * for disabling a create wizard's submit alongside a rendered <QuotaNotice>.
 * Fails open (false) while quotas are loading or unavailable: the backend
 * enforces the limit regardless, and the quota gate catches its 403.
 */
export function useQuotaBlocked(code: string, count = 1): boolean {
  const { data } = useQuotas()
  return findBlocked(data, code, count) !== null
}

/**
 * Proactive quota wall for create surfaces: renders an inline warning row when
 * the account is at (or the pending action would push it over) the limit for
 * `code`, deep-linking into the increase-request flow. Renders nothing while
 * within limits.
 */
export function QuotaNotice({ code, count = 1 }: Readonly<QuotaNoticeProps>) {
  const { t } = useTranslation()
  const { data } = useQuotas()

  const quota = findBlocked(data, code, count)
  if (!quota) return null

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-status-warning/30 bg-status-warning-bg px-4 py-3">
      <div className="flex items-center gap-2.5">
        <AlertTriangle className="size-4 shrink-0 text-status-warning" />
        <span className="text-[13px] text-foreground">
          {t("governance.quotas.quotaReachedInline", {
            used: quota.usage,
            limit: quota.limit,
            name: quota.name,
          })}
        </span>
      </div>
      <Link
        to={`/governance/quotas?request=${encodeURIComponent(code)}`}
        className="text-[13px] font-medium text-status-warning underline-offset-4 hover:underline"
      >
        {t("quotaGate.action")}
      </Link>
    </div>
  )
}
