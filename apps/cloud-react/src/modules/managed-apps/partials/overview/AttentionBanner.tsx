import { useState } from "react"

import { ArrowRight, GitPullRequest, Unplug, X, XCircle } from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"

import { Button, cn } from "@datadack/common-ui"

import { MANAGED_APPS_ROUTES } from "../../managed-apps.constants"
import type { ProjectEntry } from "../../managed-apps.state"

interface AttentionBannerProps {
  /**
   * Projects paired with their derived state, in list order — the ACCOUNT-wide
   * set, not the type-filtered one. An alarm that goes quiet because the sidebar
   * is filtered to React is not an alarm.
   */
  entries: ProjectEntry[]
}

/**
 * The one thing worth acting on, stated as a sentence with the action attached.
 *
 * This replaces a segmented state bar that, on a real account, rendered as a
 * single flat colour — every project sat in the same state, so the "chart" was
 * a decoration that repeated its own legend. Proportion is only interesting
 * when there is a spread; when everything is blocked on the same thing, the
 * useful output is that sentence and a button.
 *
 * It renders nothing when nothing is blocked. A dashboard that always shows a
 * banner teaches people to stop reading banners.
 */
export function AttentionBanner({ entries }: Readonly<AttentionBannerProps>) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [dismissedAlert, setDismissedAlert] = useState<string | null>(null)

  const disconnected = entries.filter((e) => e.state.kind === "source_disconnected")
  const failed = entries.filter((e) => e.state.kind === "failed")
  const awaitingSetup = entries.filter((e) => e.state.kind === "awaiting_setup")

  // Most severe first: a revoked connection blocks everything, a failed build
  // blocks that project, unmerged setup is merely unfinished.
  const group = [
    {
      items: disconnected,
      tone: "danger" as const,
      icon: Unplug,
      label: (n: number) =>
        n === 1
          ? "1 project lost access to its GitHub repository"
          : `${String(n)} projects lost access to their GitHub repositories`,
      action: "Reconnect",
    },
    {
      items: failed,
      tone: "danger" as const,
      icon: XCircle,
      label: (n: number) =>
        n === 1 ? "1 project's last build failed" : `${String(n)} projects' last builds failed`,
      action: "View the failure",
    },
    {
      items: awaitingSetup,
      tone: "info" as const,
      icon: GitPullRequest,
      label: (n: number) =>
        n === 1
          ? "1 project is waiting for its setup pull request to be merged"
          : `${String(n)} projects are waiting for their setup pull requests to be merged`,
      action: "Finish setup",
    },
  ].find((candidate) => candidate.items.length > 0)

  if (!group) return null

  const first = group.items.at(0)
  if (!first) return null

  const alertKey = `${first.state.kind}:${group.items.map((entry) => entry.project.id).join(",")}`
  if (dismissedAlert === alertKey) return null

  // The list is already filtered to this group, so the banner would only be
  // restating a filter the user can see applied above it.
  if (searchParams.get("state") === first.state.kind) return null

  const Icon = group.icon
  const many = group.items.length > 1

  return (
    <div
      className={cn(
        "mb-6 flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3",
        group.tone === "danger"
          ? "border-status-danger/30 bg-status-danger-bg/50"
          : "border-status-info/30 bg-status-info-bg/50",
      )}
    >
      <Icon
        className={cn(
          "size-4 shrink-0",
          group.tone === "danger" ? "text-status-danger" : "text-status-info",
        )}
      />
      <p className="min-w-0 flex-1 text-[13px] font-medium">{group.label(group.items.length)}</p>

      {/* With one project the button goes straight there. With several,
			    sending the user to an arbitrary one would be a guess — so the button
			    filters the list to exactly this group instead. It used to say
			    "Listed first below", which named a fact and left the user to do the
			    finding. */}
      {many ? (
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 gap-1.5"
          onClick={() => {
            setSearchParams(
              (prev) => {
                const next = new URLSearchParams(prev)
                next.set("state", group.items[0]?.state.kind ?? "all")
                return next
              },
              { replace: true },
            )
          }}
        >
          Show {String(group.items.length)} projects
          <ArrowRight className="size-3.5" />
        </Button>
      ) : (
        <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5">
          <Link
            to={
              first.state.kind === "awaiting_setup"
                ? MANAGED_APPS_ROUTES.setup(first.project.id)
                : MANAGED_APPS_ROUTES.project(first.project.id)
            }
          >
            {group.action}
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      )}

      <Button
        size="sm"
        variant="ghost"
        className="size-8 shrink-0 p-0"
        aria-label="Dismiss alert"
        onClick={() => {
          setDismissedAlert(alertKey)
        }}
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}
