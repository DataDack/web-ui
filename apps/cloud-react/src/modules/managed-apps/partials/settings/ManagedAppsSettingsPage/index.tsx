import { Settings2 } from "lucide-react"

import { PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { GitHubConnectionsSection } from "./GitHubConnectionsSection"
import { MANAGED_APPS_ROUTES } from "../../../managed-apps.constants"

/** Managed Apps account configuration. Plan selection has its own upgrade flow. */
export function ManagedAppsSettingsPage() {
  useScreen("managed-apps-settings")

  return (
    <div>
      <PageHeader
        icon={Settings2}
        title="Settings"
        breadcrumbs={[
          { label: "Managed Apps", to: MANAGED_APPS_ROUTES.root },
          { label: "Settings" },
        ]}
        description="The GitHub accounts and organisations this platform can build your projects from."
      />
      <div className="min-w-0">
        <GitHubConnectionsSection />
      </div>
    </div>
  )
}
