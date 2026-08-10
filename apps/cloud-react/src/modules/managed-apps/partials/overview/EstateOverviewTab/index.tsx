import { useMemo } from "react"

import { Globe, Rocket, Server, TriangleAlert } from "lucide-react"

import { StatGrid } from "@/components/console"
import { useHostingAccounts } from "@/modules/hosting/hosting.hooks"

import { AppsSummaryCard } from "./AppsSummaryCard"
import { estateAttention } from "./estate-attention"
import { EstateAttention } from "./EstateAttention"
import { HostingSummaryCard } from "./HostingSummaryCard"
import { RecentDeploys } from "./RecentDeploys"
import { useAccountPlan, useManagedAppsOverview, useProjects } from "../../../managed-apps.hooks"
import type { Build } from "../../../managed-apps.types"
import { buildProjectEntries } from "../project-list"

/**
 * The section's landing view: one answer to "what am I running, and is any of
 * it broken", across BOTH the repo-built apps and the cPanel accounts.
 *
 * It is a summary and nothing more — every number here is a link into the tab
 * that owns the detail. Nothing on this page can be filtered, sorted or acted
 * on in place, because the moment a dashboard grows its own controls it becomes
 * a third list that has to agree with the two below it.
 *
 * Reading order is deliberate: what you have (tiles) → what is wrong
 * (attention) → each half in its own words (cards) → what just happened
 * (deploys). The shape does NOT change when a half is empty: onboarding belongs
 * to the tab that owns it — the GitHub steps to Apps, the plans to cPanel
 * Hosting — so the overview always summarises and never sells. An account with
 * one cPanel site and no apps was otherwise reading a page about how to start,
 * for a product it had already started.
 */
export function EstateOverviewTab() {
  const { data: overview } = useManagedAppsOverview()
  const { data: projects = [], isLoading: projectsLoading } = useProjects()
  const { data: plan } = useAccountPlan()
  const { data: accounts = [], isLoading: hostingLoading } = useHostingAccounts()

  // Newest known build per project — the overview endpoint caps this at five,
  // so projects outside that window carry no build detail. Their state still
  // comes from `deploy_state`, which is always exact.
  const buildsByProject = useMemo(() => {
    const map = new Map<string, Build>()
    for (const build of overview?.recent_builds ?? []) {
      if (!map.has(build.project_id)) map.set(build.project_id, build)
    }
    return map
  }, [overview])

  const entries = useMemo(
    () => buildProjectEntries(projects, buildsByProject),
    [projects, buildsByProject],
  )

  const attention = useMemo(() => estateAttention(entries, accounts), [entries, accounts])

  const loading = projectsLoading || hostingLoading

  // "Live" spans both halves on purpose: a customer with one deployed app and
  // two cPanel sites runs three live sites, and that is the number they would
  // give if asked. `urlReachable` is the same test the project cards use.
  const live =
    entries.filter((entry) => entry.state.urlReachable).length +
    accounts.filter((account) => account.status === "ACTIVE").length

  return (
    <div>
      <StatGrid
        className="mb-6"
        stats={[
          {
            label: "Managed apps",
            value: projects.length,
            icon: Rocket,
            loading: projectsLoading,
          },
          {
            label: "cPanel accounts",
            value: accounts.length,
            icon: Server,
            loading: hostingLoading,
          },
          {
            label: "Live sites",
            value: live,
            icon: Globe,
            color: live > 0 ? "success" : "default",
            loading,
          },
          {
            label: "Needs attention",
            value: attention.length,
            icon: TriangleAlert,
            color: attention.length > 0 ? "danger" : "default",
            loading,
          },
        ]}
      />

      <EstateAttention items={attention} />

      <div className="grid gap-4 lg:grid-cols-2">
        <AppsSummaryCard entries={entries} plan={plan} isLoading={projectsLoading} />
        <HostingSummaryCard accounts={accounts} isLoading={hostingLoading} />
      </div>

      <RecentDeploys builds={overview?.recent_builds ?? []} projects={projects} />
    </div>
  )
}
