import { ShieldCheck } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ComingSoon } from "@/components/console"

export function IpsecComingSoon() {
  const { t } = useTranslation()

  return <ComingSoon icon={ShieldCheck} title={t("console.nav.items.ipsec")} />
}
