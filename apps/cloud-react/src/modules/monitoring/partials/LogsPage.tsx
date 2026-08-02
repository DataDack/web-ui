import { useTranslation } from "react-i18next"
import { Badge, Button, EmptyState } from "@datadack/common-ui"
import { Radio, ScrollText } from "lucide-react"

import { PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

export function LogsPage() {
  const { t } = useTranslation()
  useScreen("monitoring.logs")

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ScrollText}
        breadcrumbs={[{ label: "Monitoring" }, { label: "Logs" }]}
        title="Logs"
        description={t("monitoring.logsPage.searchAndFilterRecentLogEventsAcrossYourServ")}
        actions={
          <Button variant="outline" disabled className="gap-2">
            <Radio className="w-4 h-4" />
            {t("monitoring.logsPage.liveTail")}
            <Badge variant="secondary">Soon</Badge>
          </Button>
        }
      />

      <EmptyState
        icon={ScrollText}
        title={t("monitoring.logsPage.logStreamingIsOnTheWay")}
        description="Once log ingestion ships, recent events from your services will be searchable here by log group, severity and message."
      />
    </div>
  )
}
