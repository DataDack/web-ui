import { ExternalLink, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { FieldRow } from "@/components/console"

import { Button } from "@datadack/common-ui"

import { ProjectTypePicker, type RepoProjectType } from "./ProjectTypePicker"
import { GitHubAccountSelect, RepoSelect } from "../../../components"
import { ConnectRepoArt } from "../../../components/illustrations/ConnectRepoArt"
import { GITHUB_INSTALLATIONS_URL } from "../../../managed-apps.constants"
import { useGitHubConnections } from "../../../managed-apps.hooks"
import type { GitHubRepo, RepoDetection } from "../../../managed-apps.types"

interface ImportPhaseProps {
  installationId: number | null
  repo: string
  onAccountChange: (installationId: number) => void
  onRepoChange: (fullName: string, repo: GitHubRepo) => void
  onConnect: () => void
  connecting: boolean
  errors: { installation?: string; repo?: string }
  /** The chosen build type, and what the repository says it should be. */
  projectType: RepoProjectType | undefined
  onProjectTypeChange: (type: RepoProjectType) => void
  detection: RepoDetection | undefined
  detecting: boolean
  detectionFailed: boolean
  /** "" is the repository root; changing it re-runs detection. */
  rootDir: string
  onRootDirChange: (dir: string) => void
}

/**
 * Import — the first thing on screen is the repository list, not a form.
 *
 * That ordering is the whole point. Everything downstream (name, runtime,
 * build commands, branch) is derived from or defaulted by the repository, so
 * asking for anything before it is asking the user to make decisions with no
 * information. Pick a repo and the rest fills itself in.
 */
export function ImportPhase({
  installationId,
  repo,
  onAccountChange,
  onRepoChange,
  onConnect,
  connecting,
  errors,
  projectType,
  onProjectTypeChange,
  detection,
  detecting,
  detectionFailed,
  rootDir,
  onRootDirChange,
}: Readonly<ImportPhaseProps>) {
  const { t } = useTranslation()
  const { data: connections = [], isLoading } = useGitHubConnections()
  const usable = connections.filter((connection) => !connection.revoked)

  if (isLoading) {
    return (
      <div className="managed-panel flex items-center gap-2 px-6 py-16 text-sm text-muted-foreground sm:px-8">
        <Loader2 className="size-4 animate-spin" />
        {t("managedApps.importPhase.loadingYourGithubConnections")}
      </div>
    )
  }

  // Nothing to import from — the only useful thing on this screen is the way
  // to fix that, so it is the only thing on it.
  if (usable.length === 0) {
    return (
      <div className="managed-panel flex flex-col items-center gap-3 p-8 text-center">
        <ConnectRepoArt className="mb-1" />
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">
            {t("managedApps.importPhase.connectGithubToImportARepository")}
          </h2>
          <p className="text-[13px] text-muted-foreground">
            Install the DataDack app on the account or organisation that owns the repository you
            want to deploy. You choose which repositories it can see.
          </p>
        </div>
        <Button
          type="button"
          variant="gold"
          disabled={connecting}
          onClick={onConnect}
          className="gap-2"
        >
          {connecting && <Loader2 className="size-3.5 animate-spin" />}
          Connect GitHub
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <section className="managed-panel space-y-5 p-6 sm:p-8">
        <div className="space-y-1">
          <p className="managed-kicker font-mono text-[11px] font-semibold uppercase text-primary">
            Step 1
          </p>
          <h2 className="text-balance text-xl font-semibold">
            {t("managedApps.importPhase.importAGitRepository")}
          </h2>
          <p className="max-w-2xl text-pretty text-[13px] text-muted-foreground">
            {t("managedApps.importPhase.everyPushToTheBranchYouChooseWillBuildAndDep")}
          </p>
        </div>

        {/* Account and repository read as one sentence — “this account’s
            repository” — so they share a row on wider screens. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldRow
            label={t("managedApps.importPhase.githubAccount")}
            required
            error={errors.installation}
          >
            <GitHubAccountSelect
              value={installationId ?? undefined}
              onChange={onAccountChange}
              onConnect={onConnect}
              invalid={Boolean(errors.installation)}
            />
          </FieldRow>

          <FieldRow label="Repository" required error={errors.repo}>
            <RepoSelect
              installationId={installationId ?? undefined}
              value={repo || undefined}
              onChange={onRepoChange}
              invalid={Boolean(errors.repo)}
            />
          </FieldRow>
        </div>

        <p className="flex items-center gap-1.5 text-pretty text-[11px] text-muted-foreground">
          {t("managedApps.importPhase.repositoryMissing")}
          <a
            href={GITHUB_INSTALLATIONS_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-status-info hover:underline"
          >
            {t("managedApps.importPhase.adjustWhichRepositoriesTheAppCanSee")}
            <ExternalLink className="size-3" />
          </a>
        </p>
      </section>

      <section
        className={
          repo
            ? "managed-panel space-y-5 p-6 sm:p-8"
            : "glass-1 space-y-5 rounded-xl border border-border/60 p-6 opacity-60 sm:p-8"
        }
      >
        <div className="space-y-1">
          <p
            className={
              repo
                ? "managed-kicker font-mono text-[11px] font-semibold uppercase text-primary"
                : "managed-kicker font-mono text-[11px] font-semibold uppercase text-muted-foreground"
            }
          >
            Step 2
          </p>
          <h2 className="text-balance text-xl font-semibold">Choose the framework</h2>
          <p className="max-w-2xl text-pretty text-[13px] text-muted-foreground">
            {repo
              ? "We inspect the repository first, then keep only compatible deployment paths available."
              : "Select a repository above to unlock framework detection."}
          </p>
        </div>

        {/* A framework is only meaningful once there is a repository to
            inspect. The inactive panel remains visible so the whole flow is
            understandable before the first choice. */}
        {repo && (
          <ProjectTypePicker
            value={projectType}
            onChange={onProjectTypeChange}
            detection={detection}
            detecting={detecting}
            detectionFailed={detectionFailed}
            rootDir={rootDir}
            onRootDirChange={onRootDirChange}
          />
        )}
      </section>
    </div>
  )
}
