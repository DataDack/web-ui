// ---------------------------------------------------------------------------
// The one list on the overview that is not a summary: everything across BOTH
// surfaces that is waiting on a human, in the order a human should deal with
// it.
//
// It deliberately reuses each surface's own vocabulary — a project's state
// comes from deriveProjectState and an account's from accountSummary — so a row
// here reads exactly like the chip on the card it links to. A second set of
// words for the same condition is how a dashboard starts disagreeing with the
// page it summarises.
// ---------------------------------------------------------------------------

import { CircleAlert, Gauge, type LucideIcon } from "lucide-react"

import type { StatusTone } from "@/components/console/status-config"
import { HOSTING_ROUTES } from "@/modules/hosting/hosting.constants"
import type { HostingAccount } from "@/modules/hosting/hosting.types"
import {
  accountNeedsAttention,
  accountSummary,
  usagePct,
  usageTone,
} from "@/modules/hosting/hosting.utils"

import { MANAGED_APPS_ROUTES } from "../../../managed-apps.constants"
import type { ProjectEntry, ProjectStateKind } from "../../../managed-apps.state"

export interface AttentionItem {
  id: string
  /** Which tab this came from, so the row says where to go, not just what. */
  surface: "Managed apps" | "cPanel hosting"
  icon: LucideIcon
  tone: StatusTone
  /** The resource, named the way its own list names it. */
  name: string
  /** Its state, in that surface's words. */
  state: string
  detail: string
  to: string
  actionLabel: string
}

/**
 * The project states that mean "your turn".
 *
 * The same three the Apps tab's banner raises — a revoked connection, a failed
 * build, an unmerged setup PR. Everything else is either in flight server-side
 * or resting, and neither is something a person can act on.
 */
const PROJECT_ATTENTION_KINDS: readonly ProjectStateKind[] = [
  "source_disconnected",
  "failed",
  "awaiting_setup",
]

/** Most severe first. Ties keep insertion order, which is API order. */
const TONE_RANK: Record<StatusTone, number> = {
  danger: 0,
  warning: 1,
  info: 2,
  success: 3,
  neutral: 4,
}

/**
 * Why an account is on this list.
 *
 * A suspension or a failure explains itself through accountSummary; a quota in
 * the red band does not, so it names the meter and the number — "Disk is 97%
 * full" is actionable in a way "needs attention" never is.
 */
interface AccountAttention {
  state: string
  detail: string
  tone: StatusTone
  icon: LucideIcon
}

function accountAttention(account: HostingAccount): AccountAttention {
  if (account.status === "FAILED") {
    return {
      state: "Setup failed",
      detail: accountSummary(account),
      tone: "danger",
      icon: CircleAlert,
    }
  }
  if (account.status === "SUSPENDED") {
    return {
      state: "Suspended",
      detail: accountSummary(account),
      tone: "warning",
      icon: CircleAlert,
    }
  }

  const disk = usagePct(account.disk_used_mb, account.disk_limit_mb)
  const bandwidth = usagePct(account.bw_used_mb, account.bw_limit_mb)
  const full =
    usageTone(disk) === "danger"
      ? { label: "Disk", pct: disk }
      : { label: "Bandwidth", pct: bandwidth }

  return {
    state: "Almost out of quota",
    detail: `${full.label} is ${String(full.pct ?? 0)}% used — upgrade the plan or free some space before it stops serving.`,
    tone: "danger",
    icon: Gauge,
  }
}

/**
 * Everything across both surfaces that needs a person, most severe first.
 *
 * `entries` must be the ACCOUNT-wide set, not the type-filtered one: an alarm
 * that goes quiet because a filter is applied is not an alarm.
 */
export function estateAttention(
  entries: readonly ProjectEntry[],
  accounts: readonly HostingAccount[],
): AttentionItem[] {
  const items: AttentionItem[] = []

  for (const entry of entries) {
    if (!PROJECT_ATTENTION_KINDS.includes(entry.state.kind)) continue
    items.push({
      id: `project:${entry.project.id}`,
      surface: "Managed apps",
      icon: entry.state.icon,
      tone: entry.state.tone,
      name: entry.project.name,
      state: entry.state.label,
      detail: entry.state.detail,
      // An unmerged pull request is finished on the setup page, not on the
      // project page that can only tell you about it again.
      to:
        entry.state.kind === "awaiting_setup"
          ? MANAGED_APPS_ROUTES.setup(entry.project.id)
          : MANAGED_APPS_ROUTES.project(entry.project.id),
      actionLabel: entry.state.action?.label ?? "Open project",
    })
  }

  for (const account of accounts) {
    if (!accountNeedsAttention(account)) continue
    const { state, detail, tone, icon } = accountAttention(account)
    items.push({
      id: `hosting:${account.id}`,
      surface: "cPanel hosting",
      icon,
      tone,
      name: account.domain,
      state,
      detail,
      to: HOSTING_ROUTES.account(account.id),
      actionLabel: "Open account",
    })
  }

  return items.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone])
}
