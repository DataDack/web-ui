import { useTranslation } from "react-i18next"

import type { PromoScope } from "@/modules/promotions"

/** ₹ with Indian digit grouping — the same convention the invoices use. */
export function formatRupees(value: number): string {
  return `₹${value.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
}

/** 20 → "20%", 12.5 → "12.5%". No trailing zeroes on a whole percentage. */
export function formatPct(value: number): string {
  return `${String(Number(value.toFixed(2)))}%`
}

/** Resource-kind slug → the service name a person recognises. */
export function useScopeLabels(): Record<PromoScope, string> {
  const { t } = useTranslation()
  return {
    compute: t("superAdmin.promoCodes.scopes.compute"),
    storage: t("superAdmin.promoCodes.scopes.storage"),
    network: t("superAdmin.promoCodes.scopes.network"),
    loadbalancer: t("superAdmin.promoCodes.scopes.loadbalancer"),
    hosting: t("superAdmin.promoCodes.scopes.hosting"),
    managedapps: t("superAdmin.promoCodes.scopes.managedapps"),
  }
}

/**
 * The scope of a percent-off code as one readable phrase.
 *
 * An empty scope reads as "all services" rather than as an empty string: the
 * stored value means "everything", and rendering nothing there would leave the
 * most expensive setting on the form looking unset.
 */
export function useScopeSentence(): (scopes: PromoScope[]) => string {
  const { t } = useTranslation()
  const labels = useScopeLabels()
  return (scopes) =>
    scopes.length === 0
      ? t("superAdmin.promoCodes.reward.allServices")
      : scopes.map((s) => labels[s]).join(", ")
}
