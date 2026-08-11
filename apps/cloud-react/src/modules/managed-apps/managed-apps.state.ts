// ---------------------------------------------------------------------------
// How a project's lifecycle becomes something a user can read and act on.
//
// The lifecycle itself is the backend's `deploy_state` (see
// apps/managedapps/projects/constants/projects_constants.go:33-48) — stored
// rather than derived, so the overview list needs no per-project build query.
// This file does NOT re-derive it. It maps it to a label, a tone, an icon and
// the two questions every surface asks: may the public URL be a link, and may
// Deploy be enabled.
//
// The one thing added on top is `setup_state`. `awaiting_setup` says a project
// cannot build; only the setup state says WHY — the pull request is still being
// opened, is waiting to be merged, was closed, or could not be created at all.
// That distinction is the difference between "wait" and "go do something".
//
// Never render `project.status` as deployment health: it is a row-lifecycle
// column whose readable value space is exactly {"active"}.
// ---------------------------------------------------------------------------

import {
  AlertTriangle,
  CircleHelp,
  CircleSlash,
  FileClock,
  GitPullRequest,
  Globe,
  Hammer,
  PackageCheck,
  Rocket,
  Timer,
  Trash2,
  Unplug,
  type LucideIcon,
} from "lucide-react"

import type { StatusTone } from "@/components/console/status-config"

import type { Build, DeployState, GitHubConnection, Project } from "./managed-apps.types"

/**
 * What a surface renders. These are the backend's deploy states, plus the two
 * the row itself carries: a project being deleted, and an n8n instance that has
 * no build pipeline at all.
 */
export type ProjectStateKind = DeployState | "deleting" | "no_pipeline" | "unknown"

interface StateMeta {
  label: string
  tone: StatusTone
  icon: LucideIcon
  /** Work is in flight server-side — render a spinner and poll faster. */
  busy: boolean
  /** May `project.url` be presented as a link a user should click? */
  urlReachable: boolean
  /** May "Deploy now" / "Redeploy" be enabled? */
  canDeploy: boolean
}

/**
 * Single source of truth for how each state is labelled and coloured. Tones
 * resolve through the console's TONE_CLASSES, so this inherits the shared
 * colour vocabulary without polluting the global STATUS_TONES map — the same
 * argument BuildStatusPill.tsx:9-10 already makes for build statuses.
 */
export const PROJECT_STATE_META: Record<ProjectStateKind, StateMeta> = {
  deleting: {
    label: "Deleting",
    tone: "warning",
    icon: Trash2,
    busy: true,
    urlReachable: false,
    canDeploy: false,
  },
  source_disconnected: {
    label: "Source disconnected",
    tone: "danger",
    icon: Unplug,
    busy: false,
    urlReachable: false,
    canDeploy: false,
  },
  no_pipeline: {
    label: "Managed runtime",
    tone: "neutral",
    icon: CircleSlash,
    busy: false,
    urlReachable: false,
    canDeploy: false,
  },
  awaiting_setup: {
    label: "Awaiting setup",
    // Info, not warning. This is the normal first state of every repo-backed
    // project — nothing has gone wrong, a pull request is simply waiting to
    // be merged. Styling it as a warning made a fresh account look like it
    // was on fire, and left no colour free to mean "actually broken".
    tone: "info",
    icon: GitPullRequest,
    busy: false,
    urlReachable: false,
    // Nothing can build until the workflow is on the branch.
    canDeploy: false,
  },
  awaiting_build: {
    label: "Not deployed",
    tone: "neutral",
    icon: Timer,
    busy: false,
    urlReachable: false,
    canDeploy: true,
  },
  building: {
    label: "Building",
    tone: "info",
    icon: Hammer,
    busy: true,
    urlReachable: false,
    canDeploy: false,
  },
  built_pending_deploy: {
    label: "Built",
    // A successful build waiting on a runtime fleet is a good outcome, not a
    // degraded one. The detail line explains the wait; the chip should not
    // shout about it. Amber stays reserved for genuinely degraded states.
    tone: "info",
    icon: PackageCheck,
    busy: false,
    urlReachable: false,
    canDeploy: true,
  },
  deploying: {
    label: "Deploying",
    tone: "info",
    icon: Rocket,
    busy: true,
    urlReachable: false,
    canDeploy: false,
  },
  live: {
    label: "Live",
    tone: "success",
    icon: Globe,
    busy: false,
    urlReachable: true,
    canDeploy: true,
  },
  failed: {
    label: "Last build failed",
    tone: "danger",
    icon: AlertTriangle,
    busy: false,
    urlReachable: false,
    canDeploy: true,
  },
  // The platform reported a lifecycle this build of the console does not know.
  // Rendering it as "unknown" keeps the page alive and lets a newer backend
  // ship a state before the frontend catches up; the alternative — reading
  // through to an absent meta entry — takes the whole page down.
  unknown: {
    label: "Unknown",
    tone: "neutral",
    icon: CircleHelp,
    busy: false,
    urlReachable: false,
    canDeploy: false,
  },
}

/** Every lifecycle this console can render, for validating what the API sends. */
const KNOWN_KINDS = new Set<string>(Object.keys(PROJECT_STATE_META))

export interface ProjectState extends StateMeta {
  kind: ProjectStateKind
  /** One line of provenance shown under the chip. Never invented. */
  detail: string
  /**
   * The single next action, when there is one the user can take themselves.
   * `href` points off-platform (the pull request); otherwise the surface
   * decides what the label does.
   */
  action?: { label: string; href?: string }
}

/**
 * First value that carries text. The DTO sends "" (never null) for an absent
 * error, so `??` would hand back the empty string instead of falling through.
 */
function firstNonEmpty(...values: (string | undefined)[]): string {
  return values.find((v) => v !== undefined && v !== "") ?? ""
}

/**
 * Why a project is stuck before its first build, and what to do about it.
 * `awaiting_setup` on its own is not actionable — the setup state is.
 */
function setupDetail(project: Project): Pick<ProjectState, "detail" | "action"> {
  const repo = `${project.repo_owner}/${project.repo_name}`
  switch (project.setup_state) {
    case "pending_pr":
      return { detail: `Opening a pull request on ${repo} to add the build workflow.` }
    case "pr_open":
      return {
        detail: `Merge the pull request on ${repo} — the build workflow has to be on ${project.branch || "main"} before a push can run it.`,
        action: project.setup_pr_url
          ? {
              label: `Review pull request #${String(project.setup_pr_number)}`,
              href: project.setup_pr_url,
            }
          : undefined,
      }
    case "pr_closed":
      return {
        detail: "The setup pull request was closed without merging, so no build can run.",
        action: { label: "Open it again" },
      }
    case "failed":
      // Deliberately NOT `setup_error`. That is a raw GitHub API string
      // ("github PUT /repos/…/contents/…: HTTP 403: Resource not
      // accessible by integration") which, clamped to two lines on a card,
      // truncates mid-URL and tells the user nothing. The verbatim message
      // belongs on the setup page, which shows it in full and in context.
      return {
        detail:
          "We could not add the build workflow to this repository — open setup to see what GitHub said.",
        action: { label: "Retry setup" },
      }
    default:
      return { detail: "Waiting for the build workflow to reach the tracked branch." }
  }
}

/** The lifecycle the row is in, before setup nuance is layered on. */
function resolveKind(
  project: Project,
  connection: GitHubConnection | null | undefined,
): ProjectStateKind {
  if (project.status === "deleting") return "deleting"
  // A revoked installation is the same fact the backend reports as
  // source_disconnected, observed from the connection side instead.
  if (connection?.revoked === true) return "source_disconnected"
  if (project.project_type === "n8n") return "no_pipeline"
  // A stored `live` only means the fleet claimed it; an address having been
  // assigned is the evidence anything actually serves traffic.
  if (project.deploy_state === "live" && !project.served) {
    return "built_pending_deploy"
  }
  // `deploy_state` is whatever the API actually sent, not whatever the type
  // claims: a row written before the column existed, a degraded response, or a
  // state added server-side since this bundle was built all arrive here. It is
  // validated rather than trusted, because an unrecognised value used as a map
  // key yields undefined and takes the page down.
  return KNOWN_KINDS.has(project.deploy_state) ? project.deploy_state : "unknown"
}

/**
 * The one derivation every Managed Apps surface reads from.
 *
 * `latestBuild` (`useProjectBuilds(id).data?.at(0)`) is optional and only
 * sharpens the copy — it never changes the state, because the server already
 * decided that. `connection` is likewise optional; pass it where a revoked
 * GitHub installation should be surfaced.
 */
export function deriveProjectState(
  project: Project,
  latestBuild?: Build | null,
  connection?: GitHubConnection | null,
): ProjectState {
  const kind = resolveKind(project, connection)
  const meta = PROJECT_STATE_META[kind]

  switch (kind) {
    case "awaiting_setup":
      return { kind, ...meta, ...setupDetail(project) }
    case "deleting":
      return { kind, ...meta, detail: "Removing this project and its builds." }
    case "source_disconnected":
      return {
        kind,
        ...meta,
        detail:
          project.last_error ||
          "The GitHub connection behind this project was revoked. Reconnect it to deploy again.",
        action: { label: "Reconnect GitHub" },
      }
    case "no_pipeline":
      return {
        kind,
        ...meta,
        detail: "Provisioned by the platform — no repository, no builds.",
      }
    case "awaiting_build":
      return {
        kind,
        ...meta,
        detail: "The workflow is in place. Nothing has been built yet.",
        action: { label: "Deploy now" },
      }
    case "building":
      return {
        kind,
        ...meta,
        detail: latestBuild ? `Stage: ${latestBuild.status}.` : "A build is running.",
        action: { label: "View log" },
      }
    case "deploying":
      return { kind, ...meta, detail: "Releasing the artifact onto its runtime container." }
    case "built_pending_deploy":
      return {
        kind,
        ...meta,
        detail:
          "The build succeeded and the artifact is stored. No runtime container is attached yet, so this address does not serve the app.",
      }
    case "live":
      return { kind, ...meta, detail: "Served over HTTPS through the DataDack edge." }
    case "failed":
      return {
        kind,
        ...meta,
        detail: firstNonEmpty(
          latestBuild?.build_error,
          project.last_error,
          "The most recent build failed.",
        ),
        action: { label: "View log" },
      }
    default:
      // Belt and braces: every case above returns, but a switch that can
      // fall through returns undefined, and callers read `.kind` off this
      // without checking. One missed case must not blank the console.
      return {
        kind: "unknown",
        ...PROJECT_STATE_META.unknown,
        detail: "This project reported a state this console does not recognise.",
      }
  }
}

/**
 * A project paired with everything a surface needs to draw it.
 *
 * Derived ONCE per list, in the page, and handed down. The overview shows the
 * same project through three surfaces at once — the attention banner, a card and
 * a table row — and each calling deriveProjectState itself meant three
 * opportunities to disagree about one project's state.
 */
export interface ProjectEntry {
  project: Project
  state: ProjectState
  latestBuild?: Build
}

/**
 * Attention order: the project that needs a human comes first.
 *
 * Every one of the eleven kinds has a rank, because the map this replaced
 * covered three and left everything else tied at a fallback — which meant the
 * order below the blocked ones was whatever the API happened to return. Shared
 * by the card grid's default sort AND the table's State column, so the two
 * views cannot rank attention differently.
 *
 * Tone alone cannot express this: `awaiting_setup` (your turn) and
 * `built_pending_deploy` (nothing to do) are both `info`.
 */
export const PROJECT_STATE_URGENCY: Record<ProjectStateKind, number> = {
  // Blocked, and only a human can unblock it.
  source_disconnected: 0,
  failed: 1,
  awaiting_setup: 2,
  // A lifecycle this bundle does not know is worth a look before healthy ones.
  unknown: 3,
  // Waiting on the user to press something.
  awaiting_build: 4,
  // In flight server-side: interesting, but nothing to do.
  building: 5,
  deploying: 6,
  deleting: 7,
  // Resting states, in the order a user cares about them least.
  built_pending_deploy: 8,
  live: 9,
  no_pipeline: 10,
}

/** Poll cadence: fast while work is in flight server-side, slow otherwise. */
export function projectPollInterval(busy: boolean): number {
  return busy ? 4_000 : 30_000
}

/**
 * Whether work is in flight server-side for this project — the list's poll
 * cadence reads this.
 *
 * Answered through deriveProjectState rather than by testing `deploy_state`
 * against a second list of "busy" values, which would be one more place to
 * forget when a state is added.
 */
export function isProjectBusy(project: Project): boolean {
  return deriveProjectState(project).busy
}

/** Icon for a setup state, for surfaces that show onboarding on its own. */
export const SETUP_STATE_ICON: LucideIcon = FileClock
