import { Radio, ScrollText } from "lucide-react"

import { EmptyState, PageHeader } from "@/components/console"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useScreen } from "@/services/api/screen"

export function LogsPage() {
  useScreen("monitoring.logs")

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ScrollText}
        breadcrumbs={[{ label: "Monitoring" }, { label: "Logs" }]}
        title="Logs"
        description="Search and filter recent log events across your services."
        actions={
          <Button variant="outline" disabled className="gap-2">
            <Radio className="w-4 h-4" />
            Live tail
            <Badge variant="secondary">Soon</Badge>
          </Button>
        }
      />

      <EmptyState
        icon={ScrollText}
        title="Log streaming is on the way"
        description="Once log ingestion ships, recent events from your services will be searchable here by log group, severity and message."
      />
    </div>
  )
}
