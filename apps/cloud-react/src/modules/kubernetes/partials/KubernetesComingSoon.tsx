import { Ship } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ComingSoon } from "@/components/console"

/**
 * Kubernetes is gated behind a "coming soon" placeholder until the managed
 * cluster service ships. Mirrors the Auto Scaling / networking placeholders.
 */
export function KubernetesComingSoon() {
  const { t } = useTranslation()
  return (
    <ComingSoon
      icon={Ship}
      title={t("console.nav.items.kubernetes")}
      description={t("kubernetes.subtitle")}
      breadcrumbs={[{ label: t("console.nav.groups.compute") }]}
    />
  )
}
