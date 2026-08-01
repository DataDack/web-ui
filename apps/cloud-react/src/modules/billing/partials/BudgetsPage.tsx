import { PiggyBank } from "lucide-react"
import { useTranslation } from "react-i18next"

import { BillingComingSoon } from "./BillingComingSoon"

export function BudgetsPage() {
  const { t } = useTranslation()
  return (
    <BillingComingSoon
      icon={PiggyBank}
      title={t("billing.budgets.title")}
      description={t("billing.budgets.subtitle")}
    />
  )
}
