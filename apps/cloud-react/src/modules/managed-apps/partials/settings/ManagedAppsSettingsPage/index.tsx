import { Settings2 } from "lucide-react"
import { useSearchParams } from "react-router-dom"

import { PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { ComparePlansSection } from "./ComparePlansSection"
import { GitHubConnectionsSection } from "./GitHubConnectionsSection"
import { PlanSection } from "./PlanSection"
import {
  DEFAULT_SETTINGS_SECTION,
  parseSettingsSection,
  type SettingsSection,
} from "./settings-sections"
import { SettingsNav } from "./SettingsNav"
import { MANAGED_APPS_ROUTES } from "../../../managed-apps.constants"

/** What the header says under the title, per section. */
const DESCRIPTION: Record<SettingsSection, string> = {
  plan: "The plan every managed app in this account runs under, and the quotas it comes with.",
  compare: "What each plan includes, so the one you are on can be checked against the rest.",
  github: "The GitHub accounts and organisations this platform can build your projects from.",
}

/**
 * Managed Apps settings — everything account-scoped, one section at a time.
 *
 * Sections rather than one scroll: the tier, the comparison table and the
 * GitHub connections share only the account they belong to, and stacked
 * together the table buried the two things people actually come here to change.
 *
 * They are tabs across the top rather than a column down the left: three items
 * fit on one line, and the 232px sidebar they used to sit in was width the
 * five-column comparison table needed more.
 *
 * Which one is showing lives in ?section=, so a section is a link — the overview
 * header's GitHub button points straight at the connections one, and back works
 * between sections the way it does between pages.
 */
export function ManagedAppsSettingsPage() {
  useScreen("managed-apps-settings")

  const [searchParams, setSearchParams] = useSearchParams()
  const section = parseSettingsSection(searchParams.get("section"))

  const select = (next: SettingsSection) => {
    const params = new URLSearchParams(searchParams)
    // The default section is the bare URL: /managed-apps/settings?section=plan
    // and /managed-apps/settings are the same page, and only one of them should
    // be what a user copies out of the address bar.
    if (next === DEFAULT_SETTINGS_SECTION) params.delete("section")
    else params.set("section", next)
    setSearchParams(params)
  }

  return (
    <div>
      <PageHeader
        icon={Settings2}
        title="Settings"
        breadcrumbs={[
          { label: "Managed Apps", to: MANAGED_APPS_ROUTES.root },
          { label: "Settings" },
        ]}
        description={DESCRIPTION[section]}
      />

      <SettingsNav active={section} onSelect={select} className="mb-5" />

      <div className="min-w-0">
        {section === "plan" && <PlanSection />}
        {section === "compare" && <ComparePlansSection />}
        {section === "github" && <GitHubConnectionsSection />}
      </div>
    </div>
  )
}
