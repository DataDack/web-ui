import { Globe, Network } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ComingSoon } from "@/components/console"

export function RegisterDomainComingSoon() {
  const { t } = useTranslation()
  return (
    <ComingSoon
      icon={Globe}
      title={t("console.nav.items.registeredDomains")}
      description={t("domains.comingSoon.registration")}
    />
  )
}

export function DnsComingSoon() {
  const { t } = useTranslation()
  return (
    <ComingSoon
      icon={Network}
      title={t("console.nav.items.domainDns")}
      description={t("domains.comingSoon.dns")}
    />
  )
}
