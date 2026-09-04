import { Cable } from "lucide-react"

import { PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { GitHubConnectionsSection } from "./GitHubConnectionsSection"
import { MANAGED_APPS_ROUTES } from "../../../managed-apps.constants"

/** Managed Apps source integrations. Plan selection has its own upgrade flow. */
export function ManagedAppsSettingsPage() {
  useScreen("managed-apps-settings")

  return (
    <div>
      <PageHeader
        icon={Cable}
        title="Integrations"
        breadcrumbs={[
          { label: "Managed Apps", to: MANAGED_APPS_ROUTES.root },
          { label: "Integrations" },
        ]}
        description="The GitHub accounts and organisations this platform can build your projects from."
      />
      <div className="min-w-0">
        <GitHubConnectionsSection />
      </div>
    </div>
  )
}
