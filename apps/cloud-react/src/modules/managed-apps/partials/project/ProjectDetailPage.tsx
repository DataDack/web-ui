import { Button, EmptyState, Skeleton } from "@datadack/common-ui"
import {
  Activity,
  Boxes,
  GitBranch,
  GitPullRequest,
  Globe,
  Hammer,
  Info,
  PackageX,
  Settings,
  ShieldCheck,
  Zap,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useParams } from "react-router-dom"

import { DetailPage } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { commitURL, isTimeSet, shortSha, timeSince } from "./build-format"
import { ProjectBuildsTab } from "./ProjectBuildsTab"
import { EnvironmentsTab } from "./EnvironmentsTab"
import { ProjectDomainsTab } from "./ProjectDomainsTab"
import { ProjectOverviewTab } from "./ProjectOverviewTab"
import { ProjectSettingsTab } from "./ProjectSettingsTab"
import { CommitAuthor, GitHubMark, ProjectAvatar, ProjectStateChip } from "../../components"
import { MANAGED_APPS_ROUTES } from "../../managed-apps.constants"
import { useProject, useProjectBuilds } from "../../managed-apps.hooks"
import { deriveProjectState, projectPollInterval } from "../../managed-apps.state"
import { isBuildTransitional } from "../../managed-apps.types"
import { ProjectObservabilityPage } from "../../observability"

/**
 * Project detail — deployment status and public URL (Overview), deploy
 * history with live logs (Builds), environment variables, and project config
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
          label: "Back to apps",
          onClick: () => void navigate(MANAGED_APPS_ROUTES.apps),
        }}
      />
    )
  }

  const state = deriveProjectState(project, latestBuild)
  const commitHref = latestBuild?.commit_sha
    ? commitURL(project.repo_owner, project.repo_name, latestBuild.commit_sha)
    : ""
  const settledAt =
    latestBuild && isTimeSet(latestBuild.finished_at) ? latestBuild.finished_at : null

  return (
    <DetailPage
      // `.apps`, not `.root`. Root resolves to the section's DEFAULT tab, which
      // is Overview — so Back from a project landed on a summary page rather
      // than on the list the reader had just clicked out of, and their filter
      // and scroll position went with it. A back affordance that does not
      // return you where you came from is worse than none: it silently costs a
      // second navigation every time.
      backTo={MANAGED_APPS_ROUTES.apps}
      backLabel="Apps"
      // The FRAMEWORK's mark, not the project type's glyph. project_type only
      // ever holds "opennext", "react" or "n8n", so the type icon drew the React
      // atom on this Angular project — and on every Vue, Astro and SvelteKit one
      // besides, all of which report `project_type: "react"`. ProjectAvatar
      // already resolves the catalogue id to its brand mark for the overview
      // cards; the two views now agree on what a project looks like.
      iconNode={
        <ProjectAvatar
          seed={project.id}
          label={project.name}
          framework={project.framework}
          type={project.project_type}
        />
      }
      title={project.name}
      statusNode={<ProjectStateChip state={state} />}
      id={project.id}
      // The facts that were only ever on the Overview tab. Open Builds, Domains
      // or Settings and you used to lose track of which branch and which commit
      // the thing you are configuring is actually running.
      //
      // n8n projects have no repository — the source half is simply absent for
      // them rather than rendering an empty "/" and a branch nobody pushed to.
      meta={
        <>
          {project.repo_owner && project.repo_name && (
            <a
              href={`https://github.com/${project.repo_owner}/${project.repo_name}`}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 items-center gap-1.5 truncate hover:text-foreground hover:underline"
            >
              {/* Marked like the branch and the commit beside it. Without it the
                  repository was the one fact on this line with no glyph, which
                  read as a stray string rather than as a link to GitHub. */}
              <GitHubMark className="size-3 shrink-0" />
              <span className="truncate">
                {project.repo_owner}/{project.repo_name}
              </span>
            </a>
          )}
          {project.branch && (
            <>
              <span className="opacity-40">·</span>
              <span className="flex items-center gap-1">
                <GitBranch className="size-3 shrink-0" />
                {project.branch}
              </span>
            </>
          )}
          {latestBuild?.commit_sha && (
            <>
              <span className="opacity-40">·</span>
              {/* Whose commit is deployed, on the line that follows the reader
                  across every tab. The rest of this line already says which
                  branch and which sha; a sha identifies a change, a face
                  identifies a person, and the second is the one somebody can
                  act on without looking anything up. */}
              <CommitAuthor
                login={latestBuild.commit_author_login}
                name={latestBuild.commit_author_name}
                className="size-4"
                linked
              />
              {commitHref ? (
                <a
                  href={commitHref}
                  target="_blank"
                  rel="noreferrer"
                  title={latestBuild.commit_sha}
                  className="hover:text-foreground hover:underline"
                >
                  {shortSha(latestBuild.commit_sha)}
                </a>
              ) : (
                <span title={latestBuild.commit_sha}>{shortSha(latestBuild.commit_sha)}</span>
              )}
            </>
          )}
          {settledAt && (
            <>
              <span className="opacity-40">·</span>
              <span title={new Date(settledAt).toLocaleString()}>
                deployed {timeSince(settledAt)}
              </span>
            </>
          )}
        </>
      }
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
        // The three measurement areas, each its own tab.
        //
        // They were one tab with a second strip inside it, which put two tab
        // bars on the same screen and made Firewall and CDN reachable only by
        // first guessing they lived behind "Observability". They are three
        // different questions — is it up, is something attacking it, is it
        // being served fast — and each is the reason somebody opened the page.
        //
        // Still one component: the area is a filter over the section map, so
        // adding a section is a line in sections.ts and nothing here.
        {
          value: "observability",
          label: "Observability",
          icon: Activity,
          content: <ProjectObservabilityPage project={project} tab="observability" />,
        },
        {
          value: "firewall",
          label: "Firewall",
          icon: ShieldCheck,
          content: <ProjectObservabilityPage project={project} tab="firewall" />,
        },
        {
          value: "cdn",
          label: "CDN",
          icon: Zap,
          content: <ProjectObservabilityPage project={project} tab="cdn" />,
        },
        {
          // Environments own the variables and the access rules, so they are a
          // thing rather than a setting — see EnvironmentsTab.
          value: "environments",
          label: "Environments",
          icon: Boxes,
          content: <EnvironmentsTab project={project} />,
        },
        {
          value: "domains",
          label: "Domains",
          icon: Globe,
          content: <ProjectDomainsTab project={project} />,
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
