import { Button } from "@datadack/common-ui"
import { ArrowLeft, Sparkles } from "lucide-react"
import { Link } from "react-router-dom"

import { PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { PlanSection } from "./ManagedAppsSettingsPage/PlanSection"
import { MANAGED_APPS_ROUTES } from "../../managed-apps.constants"

export function ManagedAppsUpgradePage() {
  useScreen("managed-apps-upgrade")

  return (
    <div>
      <PageHeader
        icon={Sparkles}
        title="Choose your plan"
        breadcrumbs={[
          { label: "Managed Apps", to: MANAGED_APPS_ROUTES.root },
          { label: "Upgrade" },
        ]}
        description="Choose the capacity your account needs. Open any plan's details for the full feature list."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to={MANAGED_APPS_ROUTES.root}>
              <ArrowLeft className="size-4" />
              Back to managed apps
            </Link>
          </Button>
        }
      />
      <PlanSection />
    </div>
  )
}
