import { Gauge } from "lucide-react"
import { useTranslation } from "react-i18next"

import { MODULE_ICONS } from "./modules-meta"
import { QuotaRow } from "./QuotaRow"
import { quotaTone } from "../../components/QuotaRing/quota-tone"
import type { EffectiveQuota } from "../../quotas.types"

interface ModuleSectionProps {
  module: string
  quotas: EffectiveQuota[]
  onRequest: (code: string) => void
}

/** One card per registry module: tinted icon header + its quota rows. */
export function ModuleSection({ module, quotas, onRequest }: Readonly<ModuleSectionProps>) {
  const { t } = useTranslation()
  const Icon = MODULE_ICONS[module] ?? Gauge
  const atLimit = quotas.filter((q) => quotaTone(q.usage, q.limit) === "full").length

  return (
    <section className="glass-1 overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">
            {t(`governance.quotas.modules.${module}`, { defaultValue: module })}
          </h2>
          <p className="text-[12px] text-muted-foreground">
            {atLimit > 0
              ? t("governance.quotas.moduleAtLimit", {
                  atLimit,
                  total: quotas.length,
                })
              : t("governance.quotas.moduleCount", { count: quotas.length })}
          </p>
        </div>
      </div>
      <div className="divide-y divide-border/40">
        {quotas.map((quota) => (
          <QuotaRow key={quota.code} quota={quota} onRequest={onRequest} />
        ))}
      </div>
    </section>
  )
}
