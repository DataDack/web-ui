import { CreditCard } from "lucide-react"
import { useTranslation } from "react-i18next"

import { BillingComingSoon } from "./BillingComingSoon"

export function PaymentMethodsPage() {
  const { t } = useTranslation()
  return (
    <BillingComingSoon
      icon={CreditCard}
      title={t("billing.paymentMethods.title")}
      description={t("billing.paymentMethods.subtitle")}
    />
  )
}
