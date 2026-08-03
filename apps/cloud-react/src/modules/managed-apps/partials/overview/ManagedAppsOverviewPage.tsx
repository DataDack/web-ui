import { useMemo, useState } from "react"

import { Button, cn } from "@datadack/common-ui"
import { Plus, RefreshCw, Rocket } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"

import { ConfirmDialog, PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { AttentionBanner } from "./AttentionBanner"
import { GetStartedHero } from "./GetStartedHero"
import { GitHubConnectionsDialog } from "./GitHubConnectionsDialog"
import { PlanUsageChip } from "./PlanUsageChip"
import { buildProjectEntries } from "./project-list"
import { ProjectExplorer } from "./ProjectExplorer"
import { GitHubMark } from "../../components/GitHubMark"
import { MANAGED_APPS_ROUTES } from "../../managed-apps.constants"
import {
  useCreateBuild,
  useDeleteProject,
  useGitHubInstallUrl,
  useManagedAppsOverview,
  useGitHubConnections,
  useProjects,
} from "../../managed-apps.hooks"
import type { Build, Project, ProjectType } from "../../managed-apps.types"

const PROJECT_TYPES: readonly ProjectType[] = ["opennext", "react", "n8n"]

/** Validate the toolbar's ?type= query param — anything else means "all". */
function parseTypeParam(raw: string | null): ProjectType | undefined {
  return PROJECT_TYPES.find((type) => type === raw)
}

/**
 * Managed Apps landing page — truthful state tiles, the project grid
 * (filterable by ?type=, set from the toolbar) and account-wide activity.
 */
export function ManagedAppsOverviewPage() {
  const { t } = useTranslation()
  useScreen("managed-apps-overview")
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const typeFilter = parseTypeParam(searchParams.get("type"))

  const { data: overview } = useManagedAppsOverview()
  const { data: projects = [], isLoading, isError, refetch, isFetching } = useProjects(typeFilter)
  // Unfiltered — resolves project names for Activity and backs the
  // account-wide tiles even while the grid is filtered.
  const { data: allProjects = [] } = useProjects()

  const { data: connections = [] } = useGitHubConnections()
  // A revoked installation cannot source a project, so it does not count as
  // "connected" for the purposes of step one.
  const hasConnection = connections.some((connection) => !connection.revoked)

  const installUrl = useGitHubInstallUrl()
  const createBuild = useCreateBuild()
  const deleteProject = useDeleteProject()
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null)
  const [connectionsOpen, setConnectionsOpen] = useState(false)

  // Newest known build per project. The overview endpoint caps this at five,
  // so projects outside that window simply carry no build detail — their
  // state still comes from `deploy_state`, which is always exact.
  const buildsByProject = useMemo(() => {
    const map = new Map<string, Build>()
    for (const build of overview?.recent_builds ?? []) {
      if (!map.has(build.project_id)) map.set(build.project_id, build)
    }
    return map
  }, [overview])

  // Every project's state, derived once here and handed down. The banner, the
  // cards and the table rows all describe the same projects; deriving it in each
  // of them was three chances to disagree.
  const entries = useMemo(
    () => buildProjectEntries(projects, buildsByProject),
    [projects, buildsByProject],
  )
  const allEntries = useMemo(
    () => buildProjectEntries(allProjects, buildsByProject),
    [allProjects, buildsByProject],
  )

  // Nothing to list and nothing filtered out: this account has never created
  // a project, so the page is onboarding rather than an empty table.
  const isFirstRun = !isLoading && !isError && allProjects.length === 0 && !typeFilter

  const setTypeFilter = (type: ProjectType | undefined) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (type) next.set("type", type)
        else next.delete("type")
        // A state chip counted against the old type-filtered set would keep
        // filtering the new one, which reads as a page hiding projects for no
        // stated reason.
        next.delete("state")
        return next
      },
      { replace: true },
    )
  }

  const connectGitHub = () => {
    installUrl.mutate(undefined, {
      onSuccess: ({ url }) => {
        window.location.assign(url)
      },
    })
  }

  return (
    <div>
      <PageHeader
        icon={Rocket}
        title={t("managedApps.managedAppsOverviewPage.managedApps")}
        description="Build OpenNext and React apps straight from a GitHub branch — every push triggers a new deploy."
        meta={<PlanUsageChip />}
        actions={
          <>
            {/* Reachable at all times. Connections used to be managed
						    only inside the create flow, so an account with projects
						    had no way to add, replace or remove one. */}
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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void refetch()}
              disabled={isFetching}
              aria-label="Refresh"
            >
              <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
            </Button>
            <Button className="gap-2" onClick={() => void navigate(MANAGED_APPS_ROUTES.create)}>
              <Plus className="size-4" />
              {t("managedApps.managedAppsOverviewPage.createProject")}
            </Button>
          </>
        }
      />

      {/* A first run is onboarding, not an empty table. When there is
			    nothing to list, the hero IS the page — no search box over zero
			    rows, no state bar summarising nothing. */}
      {isFirstRun ? (
        <GetStartedHero
          connected={hasConnection}
          connecting={installUrl.isPending}
          onConnect={connectGitHub}
          onCreate={() => void navigate(MANAGED_APPS_ROUTES.create)}
        />
      ) : (
        <>
          <AttentionBanner entries={allEntries} />
          <ProjectExplorer
            entries={entries}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => void refetch()}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            deployingId={
              createBuild.isPending && typeof createBuild.variables === "string"
                ? createBuild.variables
                : undefined
            }
            onDeploy={(project) => {
              createBuild.mutate(project.id)
            }}
            onDelete={setPendingDelete}
            // A revoked installation is fixed by managing connections, not
            // by starting a fresh install and hoping it lands on the right
            // account.
            onReconnect={() => {
              setConnectionsOpen(true)
            }}
          />
        </>
      )}

      <GitHubConnectionsDialog open={connectionsOpen} onOpenChange={setConnectionsOpen} />

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null)
        }}
        title={`Delete ${pendingDelete?.name ?? "project"}?`}
        description="The project, its build history and its public address are removed. Your repository and the workflow file in it are left untouched."
        confirmLabel={t("managedApps.managedAppsOverviewPage.deleteProject")}
        loading={deleteProject.isPending}
        onConfirm={() => {
          if (!pendingDelete) return
          deleteProject.mutate(pendingDelete.id, {
            onSuccess: () => {
              setPendingDelete(null)
            },
          })
        }}
      />
    </div>
  )
}
