import { useState } from "react"

import { Button, cn } from "@datadack/common-ui"
import { useQueryClient } from "@tanstack/react-query"
import { Plus, RefreshCw } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"

import { DUR, EASE } from "@/components/console/motion/motion-config"
import { HOSTING_ROUTES } from "@/modules/hosting/hosting.constants"
import { HostingAccountsPanel } from "@/modules/hosting/partials/HostingAccountsPanel"
import { useScreen } from "@/services/api/screen"

import { EstateOverviewTab } from "./EstateOverviewTab"
import { GitHubConnectionsDialog } from "./GitHubConnectionsDialog"
import { PlanUsageChip } from "./PlanUsageChip"
import { ProjectsTab } from "./ProjectsTab"
import { GitHubMark } from "../../components/GitHubMark"
import {
  DEFAULT_MANAGED_APPS_TAB,
  MANAGED_APPS_ROUTES,
  MANAGED_APPS_TABS,
  type ManagedAppsTab,
} from "../../managed-apps.constants"

/** X-Screen value per view, so backend traffic is attributed to what is on screen. */
const SCREEN: Record<ManagedAppsTab, string> = {
  overview: "managed-apps-overview",
  apps: "managed-apps-projects",
  hosting: "managed-apps-hosting",
}

/**
 * Which query caches a view's Refresh button invalidates.
 *
 * The overview reads both, so it refreshes both — a refresh that only reloaded
 * half of what is on screen would leave the tiles disagreeing with the cards
 * beside them.
 */
const REFRESH_KEYS: Record<ManagedAppsTab, readonly (readonly string[])[]> = {
  overview: [["managed-apps"], ["hosting"]],
  apps: [["managed-apps"]],
  hosting: [["hosting"]],
}

function parseTab(raw: string | null): ManagedAppsTab {
  return MANAGED_APPS_TABS.find((tab) => tab === raw) ?? DEFAULT_MANAGED_APPS_TAB
}

interface ViewMeta {
  title: string
  description: string
}

/**
 * Managed Apps — the account's whole website estate.
 *
 * Three views over two runtimes: a summary of both, the repo-built projects,
 * and the cPanel accounts that used to live under their own "Web hosting"
 * sidebar group. Merging them is the point — a customer running a Next.js app
 * and a WordPress site was previously asked to hold two mental models of "my
 * websites", and to check two pages to find out whether either was down.
 *
 * The sidebar IS the switch. There is no on-page tab bar: the service sidebar
 * already lists these three as items, and a second row of the same three
 * choices directly below it made the page look like it had six destinations.
 * The header names the view instead, so what is selected on the left is stated
 * on the right.
 *
 * Which view is showing lives in ?tab=, so a view is a link. Every route into
 * one (the sidebar items, the overview's cards, MANAGED_APPS_ROUTES.byType)
 * sets the whole query string, so one view's filters can never survive into
 * another and hide rows for a reason the page no longer shows a control for.
 */
export function ManagedAppsOverviewPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()

  const tab = parseTab(searchParams.get("tab"))
  useScreen(SCREEN[tab])

  // Built here rather than at module scope so the section title stays
  // translated; the other two are the sidebar's own labels verbatim, because a
  // page whose title disagrees with the nav item that reached it reads as a
  // navigation mistake.
  const VIEW: Record<ManagedAppsTab, ViewMeta> = {
    overview: {
      title: t("managedApps.managedAppsOverviewPage.managedApps"),
      description:
        "Every site you run with DataDack — apps built from a GitHub branch, and cPanel hosting — in one place.",
    },
    apps: {
      title: "Apps",
      description:
        "Build OpenNext and React apps straight from a GitHub branch — every push triggers a new deploy.",
    },
    hosting: {
      title: "cPanel Hosting",
      description: "Your cPanel hosting accounts, provisioned and managed from the console.",
    },
  }

  const [connectionsOpen, setConnectionsOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const refresh = () => {
    setRefreshing(true)
    void Promise.all(
      REFRESH_KEYS[tab].map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    ).finally(() => {
      setRefreshing(false)
    })
  }

  const refreshButton = (
    <Button
      variant="ghost"
      size="icon"
      onClick={refresh}
      disabled={refreshing}
      aria-label="Refresh"
    >
      <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
    </Button>
  )

  // Reachable from the overview and the Apps view, because a revoked
  // installation is discovered on either. Connections used to be managed only
  // inside the create flow, so an account with projects had no way to add,
  // replace or remove one.
  const githubButton = (
    <Button
      variant="ghost"
      size="sm"
      className="gap-1.5"
      onClick={() => {
        setConnectionsOpen(true)
      }}
    >
      <GitHubMark className="size-3.5" />
      GitHub
    </Button>
  )

  const newProject = (
    <Button className="gap-2" onClick={() => void navigate(MANAGED_APPS_ROUTES.create)}>
      <Plus className="size-4" />
      {t("managedApps.managedAppsOverviewPage.createProject")}
    </Button>
  )

  const newHosting = (variant: "default" | "outline") => (
    <Button
      variant={variant}
      className="gap-2"
      onClick={() => void navigate(HOSTING_ROUTES.pricing)}
    >
      <Plus className="size-4" />
      New hosting
    </Button>
  )

  // The primary action is whatever the visible view creates. On the overview
  // both are offered, because the overview is not about either one.
  let actions
  if (tab === "hosting") {
    actions = (
      <>
        {refreshButton}
        {newHosting("default")}
      </>
    )
  } else if (tab === "apps") {
    actions = (
      <>
        {githubButton}
        {refreshButton}
        {newProject}
      </>
    )
  } else {
    actions = (
      <>
        {githubButton}
        {refreshButton}
        {newHosting("outline")}
        {newProject}
      </>
    )
  }

  return (
    <div className="managed-apps-console -m-4 min-h-[calc(100vh-60px)] bg-background px-4 py-8 md:-m-6 md:px-6 lg:-m-8 lg:px-10 lg:py-10">
      <header className="mb-10 flex flex-col gap-6 border-b border-border pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-3">
            <span className="managed-kicker font-mono text-[11px] uppercase text-primary">
              Managed applications
            </span>
            {tab === "hosting" ? undefined : <PlanUsageChip />}
          </div>
          <h1 className="text-4xl font-bold tracking-[-0.045em] sm:text-5xl">{VIEW[tab].title}</h1>
          <p className="mt-3 max-w-2xl font-mono text-[13px] text-muted-foreground">
            {VIEW[tab].description}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </header>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: DUR.fast, ease: EASE.out }}
        >
          {tab === "overview" && <EstateOverviewTab />}
          {tab === "apps" && (
            <ProjectsTab
              onOpenConnections={() => {
                setConnectionsOpen(true)
              }}
            />
          )}
          {tab === "hosting" && <HostingAccountsPanel />}
        </motion.div>
      </AnimatePresence>

      <GitHubConnectionsDialog open={connectionsOpen} onOpenChange={setConnectionsOpen} />
    </div>
  )
}
