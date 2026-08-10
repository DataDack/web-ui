import { Server } from "lucide-react"

import { PageHeader } from "@/components/console"

import { HOSTING_ROUTES } from "../hosting.constants"
import { HostingPlanPicker } from "./HostingPlanPicker"

/**
 * The pricing page — the buy flow reached from the cPanel Hosting view's
 * "New hosting" button, for an account that already has hosting.
 *
 * An account with none never comes here: the cPanel Hosting view renders the
 * same picker inline, because there is nothing else for that view to show. This
 * page is the header and the trail back; HostingPlanPicker is all the content.
 */
export function HostingPricingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Shared hosting"
        description="cPanel hosting with free SSL, daily backups and one-click installs."
        icon={Server}
        // The buy flow is reached from the cPanel Hosting tab and lands back
        // on it, so it carries the trail rather than being a dead end the
        // browser's Back button is the only way out of.
        breadcrumbs={[{ label: "cPanel Hosting", to: HOSTING_ROUTES.accounts }]}
      />
      <HostingPlanPicker />
    </div>
  )
}
