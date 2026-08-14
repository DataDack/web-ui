import { GitPullRequest, Globe, Hammer, Info, PackageX, Settings } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useParams } from "react-router-dom"

import { DetailPage } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { Button, EmptyState, Skeleton } from "@datadack/common-ui"

import { ProjectBuildsTab } from "./ProjectBuildsTab"
import { ProjectOverviewTab } from "./ProjectOverviewTab"
import { ProjectSettingsTab } from "./ProjectSettingsTab"
import { ResourceDomainsTab } from "../../../domains/partials/ResourceDomainsTab"
import { PROJECT_TYPE_META, ProjectStateChip } from "../../components"
import { MANAGED_APPS_ROUTES } from "../../managed-apps.constants"
import { useProject, useProjectBuilds } from "../../managed-apps.hooks"
import { deriveProjectState, projectPollInterval } from "../../managed-apps.state"
import { isBuildTransitional } from "../../managed-apps.types"

/**
 * Project detail — deployment status and public URL (Overview), deploy
 * history with live logs (Builds), and build/env/danger-zone config
 * (Settings). Tab state syncs to ?tab= via the shared DetailPage.
 */
export function ProjectDetailPage() {
  const { t } = useTranslation()
  useScreen("managed-apps-project-detail")
  const navigate = useNavigate()
  const { id = "" } = useParams()

  // The builds list already polls at 5s while anything is in flight; the
  // project row is what gains url/served when a deploy settles, so it
  // follows the same cadence instead of lagging 30s behind.
  const { data: builds = [] } = useProjectBuilds(id)
  // `.at()` rather than [0] — an empty history really is undefined here.
  const latestBuild = builds.at(0)
  const {
    data: project,
    isLoading,
    isError,
  } = useProject(id, projectPollInterval(isBuildTransitional(latestBuild?.status)))

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-80" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    )
  }

  if (isError || !project) {
    return (
      <EmptyState
        icon={PackageX}
        title={t("managedApps.projectDetailPage.projectNotFound")}
        description={`No project with id "${id}" exists in this account.`}
        action={{
          label: "Back to Managed Apps",
          onClick: () => void navigate(MANAGED_APPS_ROUTES.root),
        }}
      />
    )
  }

  const state = deriveProjectState(project, latestBuild)

  return (
    <DetailPage
      backTo={MANAGED_APPS_ROUTES.root}
      backLabel="Managed Apps"
      icon={PROJECT_TYPE_META[project.project_type].icon}
      title={project.name}
      statusNode={<ProjectStateChip state={state} />}
      id={project.id}
      actions={
        // Visit and Deploy live on the deployment hero in the Overview
        // tab, next to the state they act on. Repeating them here would
        // put two Deploy buttons on the same screen.
        state.kind === "awaiting_setup" ? (
          <Button asChild size="sm" className="gap-1.5">
            <Link to={MANAGED_APPS_ROUTES.setup(project.id)}>
              <GitPullRequest className="size-3.5" />
              {t("managedApps.projectDetailPage.finishSetup")}
            </Link>
          </Button>
        ) : undefined
      }
      tabs={[
        {
          value: "overview",
          label: "Overview",
          icon: Info,
          content: <ProjectOverviewTab project={project} />,
        },
        {
          value: "builds",
          label: "Builds",
          icon: Hammer,
          content: <ProjectBuildsTab project={project} />,
        },
        {
          value: "domains",
          label: "Domains",
          icon: Globe,
          // "mgd_app_project" is the registry's resource_type for a project —
          // the registry keys attachments by its own identifiers, not routes.
          content: <ResourceDomainsTab resourceType="mgd_app_project" resourceId={project.id} />,
        },
        {
          value: "settings",
          label: "Settings",
          icon: Settings,
          content: <ProjectSettingsTab project={project} />,
        },
      ]}
    />
  )
}
