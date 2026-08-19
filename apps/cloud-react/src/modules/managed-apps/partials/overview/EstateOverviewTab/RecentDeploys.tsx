import { useMemo } from "react"

import { Link } from "react-router-dom"

import { BuildStatusPill } from "../../../components"
import { MANAGED_APPS_ROUTES } from "../../../managed-apps.constants"
import type { Build, Project } from "../../../managed-apps.types"
import { isTimeSet, shortSha, timeSince, triggerLabel } from "../../project/build-format"

interface RecentDeploysProps {
  /** The overview endpoint's `recent_builds` — newest first, capped at five. */
  builds: readonly Build[]
  /** Every project, for resolving a build's project_id to a name. */
  projects: readonly Project[]
}

/**
 * The last few deploys across every project.
 *
 * Account-wide, so each row has to name its project — the per-project timeline
 * on a project page can leave that implied, this cannot. A build whose project
 * is not in the list (deleted while its build row survives) is dropped rather
 * than rendered as an unnamed row pointing nowhere.
 *
 * cPanel accounts have no equivalent event stream — provisioning is a single
 * queued job, not a pipeline — so this covers the Apps half only and says so in
 * its heading rather than pretending to be estate-wide.
 */
export function RecentDeploys({ builds, projects }: Readonly<RecentDeploysProps>) {
  const names = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  )

  const rows = useMemo(
    () =>
      builds
        .map((build) => ({ build, name: names.get(build.project_id) }))
        .filter((row): row is { build: Build; name: string } => row.name !== undefined),
    [builds, names],
  )

  if (rows.length === 0) return null

  return (
    <section aria-label="Recent deploys" className="mt-6">
      <h2 className="mb-3 text-[13px] font-semibold">Recent deploys</h2>
      <ul className="divide-y divide-border/50 overflow-hidden rounded-xl border border-border/60 glass-1-bg">
        {rows.map(({ build, name }) => (
          <li key={build.id}>
            <Link
              to={MANAGED_APPS_ROUTES.project(build.project_id)}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 outline-none transition-colors hover:glass-2-bg focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset"
            >
              <BuildStatusPill status={build.status} />
              <span className="min-w-0 shrink-0 truncate text-[13px] font-medium">{name}</span>
              <span className="min-w-0 flex-1 truncate text-[12px] text-muted-foreground">
                {build.commit_message || "No commit message"}
              </span>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                {shortSha(build.commit_sha)}
              </span>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {triggerLabel(build.triggered_by)}
                {isTimeSet(build.created_at) && ` · ${timeSince(build.created_at)}`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
