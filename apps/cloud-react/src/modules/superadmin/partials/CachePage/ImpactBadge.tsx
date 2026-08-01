import { ShieldAlert, ShieldCheck } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Badge } from "@DataDack/common-ui"

import type { CacheImpact } from "../../superadmin.types"

// "safe" vs "disruptive" is the single most important thing on this page — it
// is the difference between a cold read and a user losing their sign-in code —
// so it gets a colour and an icon rather than being buried in the description.
export function ImpactBadge({ impact }: Readonly<{ impact: CacheImpact }>) {
  const { t } = useTranslation()
  const disruptive = impact === "disruptive"
  const Icon = disruptive ? ShieldAlert : ShieldCheck

  return (
    <Badge
      variant="outline"
      className={
        disruptive
          ? "gap-1 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400"
          : "gap-1 border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      }
    >
      <Icon className="w-3 h-3" />
      {disruptive ? t("superAdmin.cache.impact.disruptive") : t("superAdmin.cache.impact.safe")}
    </Badge>
  )
}
