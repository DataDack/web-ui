import { useState } from "react"

import { Badge, Button } from "@datadack/common-ui"
import { ExternalLink, GitBranch, GitPullRequest, Lock } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { FieldRow, KeyValueGrid, Section } from "@/components/console"

import { BranchSelect } from "../../../components"
import { GitHubMark } from "../../../components/GitHubMark"
import { MANAGED_APPS_ROUTES } from "../../../managed-apps.constants"
import { useUpdateProject } from "../../../managed-apps.hooks"
import { isSetupComplete, type Project } from "../../../managed-apps.types"

/**
 * The Git connection.
 *
 * The repository and installation are immutable by design — connecting a
 * different repo means a new project, matching how the large PaaS products
 * behave. Only the tracked branch can move, so only it is a control, and the
 * two that cannot move now say so with a lock instead of leaving the reader to
 * discover it by finding no way to edit them.
 *
 * The section wears the Octocat rather than a generic branch glyph: everything
 * in it — the installation, the repository, the workflow file that actually
 * runs — is GitHub's, and the mark says that faster than the heading does.
 */
export function GitSection({ project }: Readonly<{ project: Project }>) {
  const { t } = useTranslation()
  const [branch, setBranch] = useState(project.branch)
  const update = useUpdateProject(project.id)
  const setupDone = isSetupComplete(project.setup_state)

  return (
    <Section
      variant="panel"
      icon={GitHubMark}
      tone="info"
      title="Git"
      description={t("managedApps.gitSection.whereThisProjectSCodeComesFrom")}
      actions={
        <Link
          to={MANAGED_APPS_ROUTES.setup(project.id)}
          className="text-[12px] text-status-info hover:underline"
        >
          {setupDone ? "View workflow" : "Finish setup"}
        </Link>
      }
    >
      <div className="space-y-5">
        <KeyValueGrid
          columns={3}
          items={[
            {
              label: "Repository",
              value: (
                <span className="inline-flex items-center gap-1.5">
                  <a
                    href={`https://github.com/${project.repo_owner}/${project.repo_name}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-[13px] text-status-info hover:underline"
                  >
                    <GitHubMark className="size-3.5" />
                    {project.repo_owner}/{project.repo_name}
                    <ExternalLink className="size-3" />
                  </a>
                  <Lock className="size-3 text-muted-foreground" aria-label="Cannot be changed" />
                </span>
              ),
            },
            {
              label: "Installation",
              value: (
                <span className="inline-flex items-center gap-1.5 font-mono text-[13px]">
                  #{String(project.installation_id)}
                  <Lock className="size-3 text-muted-foreground" aria-label="Cannot be changed" />
                </span>
              ),
            },
            {
              label: "Build workflow",
              value: setupDone ? (
                <Badge
                  variant="outline"
                  className="border-status-success/25 text-[11px] text-status-success"
                >
                  on branch
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-status-warning/25 text-[11px] text-status-warning"
                >
                  not merged
                </Badge>
              ),
            },
          ]}
        />

        <FieldRow
          label={
            <span className="inline-flex items-center gap-1.5">
              <GitBranch className="size-3.5" />
              {t("managedApps.gitSection.trackedBranch")}
            </span>
          }
          description={t("managedApps.gitSection.everyPushToThisBranchTriggersABuild")}
        >
          <div className="sm:w-80">
            <BranchSelect
              installationId={project.installation_id}
              owner={project.repo_owner}
              repo={project.repo_name}
              value={branch || undefined}
              onChange={setBranch}
            />
          </div>
        </FieldRow>

        {!setupDone && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-status-warning/25 bg-status-warning-bg px-3 py-2.5">
            <GitPullRequest className="size-3.5 shrink-0 text-status-warning" />
            <span className="flex-1 text-[12px] text-muted-foreground">
              {t("managedApps.gitSection.theBuildWorkflowIsNotOnThisBranchYetSoPushes")}
            </span>
            <Button asChild size="sm" variant="outline" className="shrink-0">
              <Link to={MANAGED_APPS_ROUTES.setup(project.id)}>
                {t("managedApps.gitSection.finishSetup")}
              </Link>
            </Button>
          </div>
        )}

        <Button
          size="sm"
          className="gap-1.5"
          disabled={branch === project.branch || branch === "" || update.isPending}
          onClick={() => {
            update.mutate({ branch })
          }}
          loading={update.isPending}
        >
          Save branch
        </Button>
      </div>
    </Section>
  )
}
