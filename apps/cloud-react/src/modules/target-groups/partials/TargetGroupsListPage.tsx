import { Crosshair } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { TargetGroupsPanel } from "./TargetGroupsPanel"

export function TargetGroupsListPage() {
  useScreen("target-groups.target-groups-list")
  const { t } = useTranslation()

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Crosshair}
        breadcrumbs={[
          { label: t("console.nav.groups.compute") },
          { label: t("targetGroups.title") },
        ]}
        title={t("targetGroups.title")}
        description={t("targetGroups.subtitle")}
      />

      <TargetGroupsPanel />
    </div>
  )
}
