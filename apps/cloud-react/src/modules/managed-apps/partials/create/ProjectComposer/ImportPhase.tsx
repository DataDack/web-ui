import { ExternalLink, Loader2 } from "lucide-react"

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
  const { data: connections = [], isLoading } = useGitHubConnections()
  const usable = connections.filter((connection) => !connection.revoked)

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading your GitHub connections…
      </div>
    )
  }

  // Nothing to import from — the only useful thing on this screen is the way
  // to fix that, so it is the only thing on it.
  if (usable.length === 0) {
    return (
      <div className="glass-1 mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-border/60 p-8 text-center">
        <ConnectRepoArt className="mb-1" />
        <div className="space-y-1">
          <h2 className="text-sm font-semibold">Connect GitHub to import a repository</h2>
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
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">Import a Git repository</h2>
        <p className="text-[13px] text-muted-foreground">
          Every push to the branch you choose will build and deploy.
        </p>
      </div>

      {/* Account and repository read as one sentence — "this account's
			    this repo" — so they sit on one line and the eye travels left to
			    right instead of down a column of two lonely selects. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <FieldRow label="GitHub account" required error={errors.installation}>
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

      {/* Only once there is a repository to be a type OF. Asking first
			    would be asking the user to classify something they have not
			    chosen yet, and detection would have nothing to check it against. */}
      {repo && (
        <FieldRow label="Project type" required>
          <ProjectTypePicker
            value={projectType}
            onChange={onProjectTypeChange}
            detection={detection}
            detecting={detecting}
            detectionFailed={detectionFailed}
            rootDir={rootDir}
            onRootDirChange={onRootDirChange}
          />
        </FieldRow>
      )}

      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        Repository missing?
        <a
          href={GITHUB_INSTALLATIONS_URL}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-status-info hover:underline"
        >
          Adjust which repositories the app can see
          <ExternalLink className="size-3" />
        </a>
      </p>
    </div>
  )
}
