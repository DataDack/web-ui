import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@datadack/common-ui"
import {
  Code2,
  Copy,
  ExternalLink,
  GitCommitHorizontal,
  History,
  MoreHorizontal,
  PlayCircle,
  RotateCcw,
  ScrollText,
  X,
} from "lucide-react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { commitURL, shortSha } from "./build-format"
import { MANAGED_APPS_ROUTES } from "../../managed-apps.constants"
import { isRollbackable, type Build, type Project } from "../../managed-apps.types"

interface BuildActionsMenuProps {
  build: Build
  project: Project
  /** The build the public URL is actually served from — it may not roll back to itself. */
  servingId?: string
  /** True only for THIS row's in-flight mutation; see the note in the tab. */
  cancelling: boolean
  rebuilding: boolean
  rollingBack: boolean
  onCancel: (build: Build) => void
  onRebuild: (build: Build) => void
  onRollback: (build: Build) => void
  className?: string
}

/**
 * Every action a build has, in one menu.
 *
 * It replaces a row of four ghost buttons, two of which only appeared on hover.
 * That row had three problems this does not: it was as wide as the actions were
 * numerous, so adding one meant taking one away; the hover-only pair did not
 * exist at all on a touch screen; and Logs and Code — two NAVIGATIONS — sat in
 * the same visual rank as Rollback, which changes what the world is served.
 *
 * Grouped by consequence rather than by frequency, because the reader is being
 * asked to aim: go and look (navigations), make something happen (mutations),
 * go and look somewhere else (GitHub), and take a string with you (copies). The
 * destructive item is last and marked, in its own group, so the pointer never
 * passes over it on the way to something harmless.
 *
 * Navigation items are `asChild` links rather than click handlers, so
 * middle-click and open-in-new-tab keep working — the reason this does not use
 * the console's generic `actionsColumn`.
 */
export function BuildActionsMenu({
  build,
  project,
  servingId,
  cancelling,
  rebuilding,
  rollingBack,
  onCancel,
  onRebuild,
  onRollback,
  className,
}: Readonly<BuildActionsMenuProps>) {
  const buildPath = MANAGED_APPS_ROUTES.build(project.id, build.id)
  const commitHref = commitURL(project.repo_owner, project.repo_name, build.commit_sha)
  const hasCommit = build.commit_sha !== ""
  // Not offered for what is already being served: a rollback to the live build
  // does nothing but restart the app, and an action whose honest description is
  // "no change" should not sit on a row that looks like every other row.
  const canRollback = build.id !== servingId && isRollbackable(build, project)
  const canCancel = build.status === "queued"
  const busy = cancelling || rebuilding || rollingBack

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Actions for build ${hasCommit ? shortSha(build.commit_sha) : build.id}`}
          loading={busy}
          className={cn("shrink-0 text-muted-foreground hover:text-foreground", className)}
        >
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-mono text-[11px] text-muted-foreground">
          {hasCommit ? shortSha(build.commit_sha) : "No commit"}
        </DropdownMenuLabel>

        <DropdownMenuItem asChild>
          <Link to={buildPath}>
            <ScrollText className="size-3.5" />
            Build logs
          </Link>
        </DropdownMenuItem>
        {/* Omitted rather than disabled on a build with no commit: there is no
            tree to browse, and `asChild` hands the disabled state to a Link that
            would still navigate when clicked. */}
        {hasCommit && (
          <DropdownMenuItem asChild>
            <Link to={`${buildPath}?tab=source`}>
              <Code2 className="size-3.5" />
              Browse source
            </Link>
          </DropdownMenuItem>
        )}

        {(canRollback || (hasCommit && !canCancel)) && <DropdownMenuSeparator />}

        {/* Rollback and Rebuild sit together because the difference between them
            is the whole point, and it is a difference of minutes: one re-releases
            the artifact already in object storage, the other goes back to the
            repository and makes new bytes. */}
        {canRollback && (
          <DropdownMenuItem
            disabled={rollingBack}
            onSelect={() => {
              onRollback(build)
            }}
          >
            <History className="size-3.5" />
            Roll back to this build
          </DropdownMenuItem>
        )}
        {hasCommit && !canCancel && (
          <DropdownMenuItem
            disabled={rebuilding}
            onSelect={() => {
              onRebuild(build)
            }}
          >
            <RotateCcw className="size-3.5" />
            Rebuild this commit
          </DropdownMenuItem>
        )}

        {(commitHref !== "" || build.gh_run_url !== "") && <DropdownMenuSeparator />}

        {commitHref !== "" && (
          <DropdownMenuItem asChild>
            <a href={commitHref} target="_blank" rel="noreferrer">
              <GitCommitHorizontal className="size-3.5" />
              Commit on GitHub
              <ExternalLink className="ml-auto size-3 text-muted-foreground" aria-hidden />
            </a>
          </DropdownMenuItem>
        )}
        {/* Empty on every build that predates the Actions pipeline, and on one
            no runner ever claimed — there is no run to open, so no item. */}
        {build.gh_run_url !== "" && (
          <DropdownMenuItem asChild>
            <a href={build.gh_run_url} target="_blank" rel="noreferrer">
              <PlayCircle className="size-3.5" />
              Actions run
              <ExternalLink className="ml-auto size-3 text-muted-foreground" aria-hidden />
            </a>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {hasCommit && (
          <DropdownMenuItem
            onSelect={() => {
              void copyValue(build.commit_sha, "Commit SHA copied")
            }}
          >
            <Copy className="size-3.5" />
            Copy commit SHA
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onSelect={() => {
            void copyValue(build.id, "Build ID copied")
          }}
        >
          <Copy className="size-3.5" />
          Copy build ID
        </DropdownMenuItem>

        {canCancel && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              disabled={cancelling}
              onSelect={() => {
                onCancel(build)
              }}
            >
              <X className="size-3.5" />
              Cancel build
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Copy, and say so.
 *
 * A copy that reports nothing is indistinguishable from a copy that failed, and
 * the clipboard genuinely does refuse: it is unavailable outside a secure
 * context, which is exactly where a console is run against a local backend.
 */
async function copyValue(value: string, message: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value)
    toast.success(message)
  } catch {
    toast.error("Could not copy to the clipboard")
  }
}
