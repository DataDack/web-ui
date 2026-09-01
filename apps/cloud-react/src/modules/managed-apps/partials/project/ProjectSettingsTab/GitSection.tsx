import { useState } from "react"

import { Badge, Button } from "@datadack/common-ui"
import { ExternalLink, GitBranch, GitPullRequest, Lock, Unplug } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { ConfirmDialog, FieldRow, KeyValueGrid, Section } from "@/components/console"

import { BranchSelect } from "../../../components"
import { GitHubMark } from "../../../components/GitHubMark"
import { MANAGED_APPS_ROUTES } from "../../../managed-apps.constants"
import {
  useDisconnectSource,
  useReconnectSource,
  useUpdateProject,
} from "../../../managed-apps.hooks"
import { isSetupComplete, isSourceConnected, type Project } from "../../../managed-apps.types"

/**
 * The Git connection.
 *
 * The repository and installation are immutable by design — connecting a
 * different repo means a new project, matching how the large PaaS products
 * behave. Only the tracked branch can move, so only it is a control, and the
 * two that cannot move say so with a lock instead of leaving the reader to
 * discover it by finding no way to edit them.
 *
 * The section wears the Octocat rather than a generic branch glyph: everything
 * in it — the installation, the repository, the workflow file that actually
 * runs — is GitHub's, and the mark says that faster than the heading does.
 *
 * Disconnecting lives here rather than in the Danger zone because it is not
 * destructive and it is not permanent: nothing is deleted, the deployed app
 * keeps serving, and the button beside it puts the connection back. The Danger
 * zone is for the one action that cannot be undone.
 */
export function GitSection({ project }: Readonly<{ project: Project }>) {
  const { t } = useTranslation()
  const [branch, setBranch] = useState(project.branch)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const update = useUpdateProject(project.id)
  const disconnect = useDisconnectSource(project.id)
  const reconnect = useReconnectSource(project.id)

  const setupDone = isSetupComplete(project.setup_state)
  const connected = isSourceConnected(project.source_state)

  return (
    <>
      <Section
        variant="panel"
        icon={GitHubMark}
        tone={connected ? "info" : "warning"}
        title="Git"
        description={t("managedApps.gitSection.whereThisProjectSCodeComesFrom")}
        badge={
          connected ? undefined : (
            <Badge
              variant="outline"
              className="border-status-warning/25 text-[11px] font-normal text-status-warning"
            >
              disconnected
            </Badge>
          )
        }
        actions={
          connected ? (
            <Link
              to={MANAGED_APPS_ROUTES.setup(project.id)}
              className="text-[12px] text-status-info hover:underline"
            >
              {setupDone ? "View workflow" : "Finish setup"}
            </Link>
          ) : undefined
        }
      >
        <div className="space-y-5">
          {!connected && (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-status-warning/25 bg-status-warning-bg px-3 py-2.5">
              <Unplug className="size-4 shrink-0 text-status-warning" />
              <div className="flex-1 min-w-0 text-[12px] text-muted-foreground">
                <p className="font-medium text-foreground">
                  This project is disconnected from {project.repo_owner}/{project.repo_name}.
                </p>
                <p className="mt-0.5">
                  Pushes no longer build it and its webhooks were removed from the repository. What
                  is deployed keeps serving, and past builds can still be rolled back to.
                </p>
              </div>
              <Button
                size="sm"
                className="shrink-0 gap-1.5"
                loading={reconnect.isPending}
                disabled={reconnect.isPending}
                onClick={() => {
                  // No payload: reconnecting to the repository it already has is
                  // the case this button is for. Re-pointing at a repository that
                  // moved is a different, explicit act — the server takes the
                  // coordinates, and there is nowhere here to type them yet.
                  reconnect.mutate({})
                }}
              >
                <GitHubMark className="size-3.5" />
                Reconnect
              </Button>
            </div>
          )}

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
                value: buildWorkflowBadge(connected, setupDone),
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
            description={
              connected
                ? t("managedApps.gitSection.everyPushToThisBranchTriggersABuild")
                : "Stored, but not watched. Reconnect to build from pushes again."
            }
          >
            <div className="sm:w-80">
              <BranchSelect
                installationId={project.installation_id}
                owner={project.repo_owner}
                repo={project.repo_name}
                value={branch || undefined}
                onChange={setBranch}
                disabled={!connected}
              />
            </div>
          </FieldRow>

          {connected && !setupDone && (
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

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <Button
              size="sm"
              className="gap-1.5"
              disabled={
                !connected || branch === project.branch || branch === "" || update.isPending
              }
              onClick={() => {
                update.mutate({ branch })
              }}
              loading={update.isPending}
            >
              Save branch
            </Button>

            {connected && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-destructive/30 text-destructive hover:text-destructive"
                disabled={disconnect.isPending}
                onClick={() => {
                  setConfirmOpen(true)
                }}
              >
                <Unplug className="size-3.5" />
                Disconnect from GitHub
              </Button>
            )}
          </div>
        </div>
      </Section>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Disconnect from GitHub?"
        confirmLabel="Disconnect"
        loading={disconnect.isPending}
        description={
          // Spelled out in both directions. The question someone actually has
          // at this dialog is "does my site go down?", and the answer is no —
          // saying only what stops would leave them to assume the worst.
          <span className="space-y-2 text-[13px]">
            <span className="block">
              Pushes to <span className="font-mono">{project.branch}</span> will stop building this
              project, and every webhook DataDack put on{" "}
              <span className="font-mono">
                {project.repo_owner}/{project.repo_name}
              </span>{" "}
              is removed.
            </span>
            <span className="block text-muted-foreground">
              What is deployed keeps serving, past builds stay and can still be rolled back to, and
              the workflow file stays in your repository. You can reconnect here at any time.
            </span>
          </span>
        }
        onConfirm={() => {
          disconnect.mutate(undefined, {
            onSuccess: () => {
              setConfirmOpen(false)
            },
          })
        }}
      />
    </>
  )
}

/**
 * The workflow's state, which means nothing while the project is disconnected.
 *
 * "on branch" is a true statement about the repository even then — the file was
 * never removed — but on a disconnected project it reads as "builds are wired
 * up", which is the one thing that is no longer true.
 */
function buildWorkflowBadge(connected: boolean, setupDone: boolean) {
  if (!connected) {
    return (
      <Badge variant="outline" className="text-[11px] text-muted-foreground">
        not watched
      </Badge>
    )
  }
  return setupDone ? (
    <Badge variant="outline" className="border-status-success/25 text-[11px] text-status-success">
      on branch
    </Badge>
  ) : (
    <Badge variant="outline" className="border-status-warning/25 text-[11px] text-status-warning">
      not merged
    </Badge>
  )
}
