import { Activity } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ComingSoon } from "@/components/console"

/**
 * Auto Scaling is gated behind a "coming soon" placeholder until the feature is
 * ready. Mirrors the networking placeholder pages.
 */
export function AutoscalingComingSoon() {
    const { t } = useTranslation()
    return (
        <ComingSoon
            icon={Activity}
            title={t("console.nav.items.autoscaling")}
            description={t("autoscaling.subtitle")}
            breadcrumbs={[{ label: t("console.nav.groups.compute") }]}
        />
    )
}
