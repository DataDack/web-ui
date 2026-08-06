import { useMemo, useState } from "react"

import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"

import { ConfirmDialog } from "@/components/console"

import { AttentionBanner } from "./AttentionBanner"
import { GetStartedHero } from "./GetStartedHero"
import { buildProjectEntries } from "./project-list"
import { ProjectExplorer } from "./ProjectExplorer"
import { MANAGED_APPS_ROUTES } from "../../managed-apps.constants"
import {
  useCreateBuild,
  useDeleteProject,
  useGitHubConnections,
  useGitHubInstallUrl,
  useManagedAppsOverview,
  useProjects,
} from "../../managed-apps.hooks"
import type { Build, Project, ProjectType } from "../../managed-apps.types"

const PROJECT_TYPES: readonly ProjectType[] = ["opennext", "react", "n8n"]

/** Validate the toolbar's ?type= query param — anything else means "all". */
function parseTypeParam(raw: string | null): ProjectType | undefined {
  return PROJECT_TYPES.find((type) => type === raw)
}

interface ProjectsTabProps {
  /** Opens the section's GitHub connections dialog, which the shell owns. */
  onOpenConnections: () => void
}

/**
 * The repo-built projects — truthful state chips, the project grid (filterable
 * by ?type=, set from the toolbar) and the one thing worth acting on.
 *
 * Extracted from the page that used to be all of Managed Apps: this is now one
 * of three tabs, so it owns its own list state and nothing else. The header,
 * the tab bar and the GitHub connections dialog belong to the section shell.
 */
export function ProjectsTab({ onOpenConnections }: Readonly<ProjectsTabProps>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const typeFilter = parseTypeParam(searchParams.get("type"))

  const { data: overview } = useManagedAppsOverview()
  const { data: projects = [], isLoading, isError, refetch } = useProjects(typeFilter)
  // Unfiltered — resolves project names for the banner and backs the
  // account-wide counts even while the grid is filtered.
  const { data: allProjects = [] } = useProjects()

  const { data: connections = [] } = useGitHubConnections()
  // A revoked installation cannot source a project, so it does not count as
  // "connected" for the purposes of step one.
  const hasConnection = connections.some((connection) => !connection.revoked)

  const installUrl = useGitHubInstallUrl()
  const createBuild = useCreateBuild()
  const deleteProject = useDeleteProject()
  const [pendingDelete, setPendingDelete] = useState<Project | null>(null)

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
  // a project, so the tab is onboarding rather than an empty table.
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
      {/* A first run is onboarding, not an empty table. When there is
			    nothing to list, the hero IS the tab — no search box over zero
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
            onReconnect={onOpenConnections}
          />
        </>
      )}

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
