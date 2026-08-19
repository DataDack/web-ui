import { useMemo } from "react"

import { Button, Skeleton } from "@datadack/common-ui"
import { ArrowRight, Plus, Rocket } from "lucide-react"
import { Link } from "react-router-dom"

import { TONE_DOT_CLASSES } from "@/components/console/status-config"

import { SurfaceCard } from "./SurfaceCard"
import { ProjectTypeIcon } from "../../../components"
import { QuotaMeter } from "../../../components/PlanLimitsPanel/QuotaMeter"
import { MANAGED_APPS_ROUTES } from "../../../managed-apps.constants"
import { PROJECT_STATE_URGENCY, type ProjectEntry } from "../../../managed-apps.state"
import type { AccountPlan } from "../../../managed-apps.types"

/** How many projects the card names before deferring to the tab. */
const PREVIEW = 3

interface AppsSummaryCardProps {
  entries: readonly ProjectEntry[]
  plan?: AccountPlan
  isLoading: boolean
}

/**
 * The repo-built half of the estate: how much of the tier is spent, and the
 * three projects most likely to be why you opened the console.
 *
 * Ordered by PROJECT_STATE_URGENCY rather than by recency, so the preview is
 * the same three rows the Apps tab puts at the top of its default sort. A
 * preview that ranked differently from the list it previews would send people
 * looking for a project that is not where the card implied.
 */
export function AppsSummaryCard({ entries, plan, isLoading }: Readonly<AppsSummaryCardProps>) {
  const preview = useMemo(
    () =>
      [...entries]
        .sort((a, b) => PROJECT_STATE_URGENCY[a.state.kind] - PROJECT_STATE_URGENCY[b.state.kind])
        .slice(0, PREVIEW),
    [entries],
  )

  let body
  if (isLoading) {
    body = (
      <div className="space-y-2">
        <Skeleton className="h-8 rounded-lg" />
        <Skeleton className="h-8 rounded-lg" />
        <Skeleton className="h-8 rounded-lg" />
      </div>
    )
  } else if (entries.length === 0) {
    body = (
      <p className="text-[12px] leading-relaxed text-muted-foreground">
        Connect a GitHub repository and every push to the branch you choose builds and deploys.
        OpenNext and React today.
      </p>
    )
  } else {
    body = (
      <div className="space-y-4">
        {/* The tier's ceiling, not a bare count. "2 projects" and "2 of 2
				    projects" are different facts, and only one of them tells you the
				    next Create button will fail. */}
        {plan && (
          <QuotaMeter
            label={plan.plan.name}
            used={plan.projects_in_use}
            limit={plan.plan.limits.max_projects}
            unit="projects"
          />
        )}

        <ul className="-mx-2 space-y-0.5">
          {preview.map((entry) => (
            <li key={entry.project.id}>
              <Link
                to={MANAGED_APPS_ROUTES.project(entry.project.id)}
                className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 outline-none transition-colors hover:glass-1-bg-raised focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <ProjectTypeIcon
                  type={entry.project.project_type}
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
                <span className="min-w-0 flex-1 truncate text-[13px]">{entry.project.name}</span>
                <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className={`size-1.5 rounded-full ${TONE_DOT_CLASSES[entry.state.tone]}`} />
                  {entry.state.label}
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {entries.length > preview.length && (
          <p className="text-[11px] text-muted-foreground">
            {String(entries.length - preview.length)} more in the Apps tab.
          </p>
        )}
      </div>
    )
  }

  return (
    <SurfaceCard
      icon={Rocket}
      title="Managed apps"
      count={isLoading ? undefined : entries.length}
      description="Built from a GitHub branch on every push."
      footer={
        <>
          <Button asChild size="sm" className="gap-1.5">
            <Link to={MANAGED_APPS_ROUTES.create}>
              <Plus className="size-3.5" />
              New project
            </Link>
          </Button>
          {entries.length > 0 && (
            <Button asChild size="sm" variant="ghost" className="gap-1.5">
              <Link to={MANAGED_APPS_ROUTES.apps}>
                View all
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          )}
        </>
      }
    >
      {body}
    </SurfaceCard>
  )
}
