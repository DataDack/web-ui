import { cn, CopyButton } from "@datadack/common-ui"
import { ExternalLink, GitBranch } from "lucide-react"
import { Link } from "react-router-dom"

import { cardAction } from "./card-action"
import { CardActionButton } from "./CardActionButton"
import {
  BuildProgressBar,
  ProjectAvatar,
  ProjectStateChip,
  projectTypeLabel,
} from "../../../components"
import { MANAGED_APPS_ROUTES } from "../../../managed-apps.constants"
import type { ProjectEntry } from "../../../managed-apps.state"
import { isBuildTransitional, type Project } from "../../../managed-apps.types"
import { hostLabel, shortSha, timeSince } from "../../project/build-format"
import { ProjectActionsMenu } from "../ProjectActionsMenu"

interface ProjectCardProps {
  entry: ProjectEntry
  deploying: boolean
  onDeploy: (project: Project) => void
  onDelete: (project: Project) => void
  onReconnect: () => void
}

/**
 * One project, as a card.
 *
 * The row this replaced spent a 1900px viewport on four facts and pushed them
 * 600px apart, so they stopped reading as one project — and it truncated anyway
 * at narrow widths, because its three columns divided the width between them. A
 * card fixes the measure rather than the shape: each fact gets the card's full
 * content width on its own line, so the address, the repository and the commit
 * subject all fit at the lengths they really are.
 *
 * What sits where a screenshot would go is `state.detail` — the one piece of
 * content this API guarantees for all eleven states, including the ones with no
 * build, no commit and no serving address.
 */
export function ProjectCard({
  entry,
  deploying,
  onDeploy,
  onDelete,
  onReconnect,
}: Readonly<ProjectCardProps>) {
  const { project, state, latestBuild } = entry
  const action = cardAction(project, state)
  const isN8n = project.project_type === "n8n"

  return (
    <article
      className={cn(
        // The fill comes from .managed-project-card, which reads glass-2 —
        // the console's standard panel tier — so the card sits on the page
        // rather than hovering over it. The border is the edge.
        "managed-project-card group relative flex h-full flex-col gap-2.5 border border-border/70 px-3.5 py-3 transition-colors",
        // Tone is carried in text by the chip; the border is the only second
        // encoding, and only for the state that has to be findable across a
        // grid of forty.
        state.tone === "danger" && "border-status-danger/40",
      )}
    >
      {/* Identity — name, address, and the menu that never hides. */}
      <div className="flex items-start gap-2.5">
        {/* The framework's logo, which doubles as the type badge — a second
            generic glyph beside the name said the same thing twice. */}
        <ProjectAvatar
          seed={project.id}
          label={project.name}
          framework={project.framework}
          type={project.project_type}
          className="size-8 rounded-sm"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Link
              to={MANAGED_APPS_ROUTES.project(project.id)}
              className="truncate text-[14px] font-semibold tracking-tight text-foreground hover:underline"
            >
              {project.name}
              {/* Stretched click target. Inside the anchor, so the
							    accessible name stays the project name. */}
              <span className="absolute inset-0" aria-hidden />
            </Link>
            <span className="sr-only">{projectTypeLabel(project.project_type)}</span>
          </div>

          {project.url && (
            <span className="relative z-10 mt-0.5 flex min-w-0 items-center gap-1.5">
              {state.urlReachable ? (
                <a
                  href={project.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex min-w-0 max-w-full items-center gap-1 font-mono text-[11px] text-status-info hover:underline"
                >
                  <span className="truncate">{hostLabel(project.url)}</span>
                  <ExternalLink className="size-2.5 shrink-0" />
                </a>
              ) : (
                <CopyButton
                  value={project.url}
                  label={hostLabel(project.url)}
                  className="text-[11px]"
                />
              )}
            </span>
          )}
        </div>

        <ProjectActionsMenu
          entry={entry}
          deploying={deploying}
          onDeploy={onDeploy}
          onDelete={onDelete}
          className="relative z-10 -mt-1 -mr-1.5"
        />
      </div>

      <ProjectStateChip state={state} className="self-start" />

      {/* Why it is in that state. Clamped at two lines and deliberately given
			    no `title`: a tooltip cannot fire under the stretched overlay above,
			    and does not exist on touch at all. `failed` puts the build's raw
			    error here, which is unbounded — the action routes to the log, which
			    shows it in full. */}
      <p className="line-clamp-2 text-[11.5px] leading-snug text-muted-foreground">
        {state.detail}
      </p>

      {latestBuild && isBuildTransitional(latestBuild.status) && (
        <BuildProgressBar build={latestBuild} />
      )}

      {/* Provenance, on honest branches: the overview endpoint caps
			    recent_builds at five account-wide, so most projects arrive with no
			    build at all and must not imply one. */}
      <div className="min-w-0 space-y-0.5 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
        {isN8n ? (
          <p>created {timeSince(project.created_at)}</p>
        ) : (
          <>
            <p className="flex items-center gap-1.5 truncate">
              <GitBranch className="size-3 shrink-0" />
              <span className="truncate font-mono">
                {project.repo_owner}/{project.repo_name}
              </span>
              <span className="shrink-0 font-mono opacity-70">{project.branch || "main"}</span>
            </p>
            <p className="truncate">
              {latestBuild?.commit_sha ? (
                <>
                  <span className="font-mono">{shortSha(latestBuild.commit_sha)}</span>
                  {latestBuild.commit_message && <> {latestBuild.commit_message}</>}
                </>
              ) : (
                <>No build has run yet · created {timeSince(project.created_at)}</>
              )}
            </p>
          </>
        )}
      </div>

      {/* `mt-auto` aligns every footer across a row without reserving dead
			    height on the cards whose detail is short — grid items already
			    stretch to the tallest in their row. */}
      {action && (
        <div className="relative z-10 mt-auto pt-1">
          <CardActionButton
            action={action}
            deploying={deploying}
            onDeploy={() => {
              onDeploy(project)
            }}
            onReconnect={onReconnect}
          />
        </div>
      )}
    </article>
  )
}
