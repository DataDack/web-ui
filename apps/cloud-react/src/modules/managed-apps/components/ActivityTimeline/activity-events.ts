// Derives the deployment activity feed from build rows. There is no events
// API — every entry here is a timestamp the backend already stamps on a build
// as it moves through the pipeline, so the feed costs nothing to serve and can
// never drift from the build history it sits next to.

import type { StatusTone } from "@/components/console/status-config"

import type { Build, BuildStatus, BuildTrigger } from "../../managed-apps.types"

export interface ActivityEvent {
  /** `${buildId}:${stage}` — stable across refetches, unique across builds. */
  id: string
  buildId: string
  /** The ISO stamp the event is anchored to — always set, never a Go zero time. */
  at: string
  title: string
  /** Secondary line under the title — "" renders nothing. */
  detail: string
  tone: StatusTone
  /** External link shown with the detail (the GitHub Actions run). */
  href?: string
  /**
   * Position in the build's lifecycle, used only as a sort tie-break: two
   * events of one build can carry the same second-resolution stamp (a failure
   * is often stamped in the same write as the claim), and wall-clock order
   * alone would let "Build queued" render above "Build failed".
   */
  seq: number
}

/**
 * Whether a nullable stamp is actually set. Kept local so components/ does not
 * reach into partials/ (see BuildProgressBar for the same trade) — nullable
 * stamps serialize as null, Go zero times as "0001-01-01T00:00:00Z" (negative
 * epoch ms), and empty strings parse as NaN.
 */
function isTimeSet(iso: string | null | undefined): iso is string {
  if (!iso) return false
  const ms = new Date(iso).getTime()
  return !Number.isNaN(ms) && ms > 0
}

/**
 * Compact "time since" for ISO timestamps: 12m ago, 3h ago, 2d ago.
 *
 * Unset is "—", using isTimeSet's definition of set: a null stamp parses to
 * epoch 0 and a Go zero time to a negative epoch, and either fed into the
 * arithmetic would render as a straight-faced "20657d ago".
 */
export function timeSince(iso: string): string {
  const ms = new Date(iso).getTime()
  if (Number.isNaN(ms) || ms <= 0) return "—"
  const deltaMs = Date.now() - ms
  const minutes = Math.floor(deltaMs / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${String(minutes)}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${String(hours)}h ago`
  const days = Math.floor(hours / 24)
  return `${String(days)}d ago`
}

/**
 * Artifact size for the upload event: 3.2 MB, 412 KB. Zero returns "" — the
 * runner reports the size with the upload, so a 0 next to a real `artifact_at`
 * is a row written before the field existed, and "0 B" would read as an empty
 * artifact rather than an unknown one.
 */
export function formatArtifactBytes(bytes: number): string {
  if (bytes <= 0) return ""
  if (bytes < 1024) return `${String(bytes)} B`
  const units = ["KB", "MB", "GB", "TB"] as const
  let value = bytes
  let unit = -1
  do {
    value /= 1024
    unit += 1
    // Judged on the ROUNDED value: 1048200 bytes is 1023.63 KB, which the
    // display would round to "1024 KB" — it belongs to the next unit up.
  } while (Math.round(value) >= 1024 && unit < units.length - 1)
  return `${value >= 10 ? String(Math.round(value)) : value.toFixed(1)} ${units[unit]}`
}

/** Exhaustive by construction — a new BuildTrigger will not compile without one. */
const TRIGGER_LABEL_MAP: Record<BuildTrigger, string> = {
  push: "Push",
  manual: "Manual redeploy",
  initial: "First deploy",
}

// Read through a Map because the value comes off the wire: an unrecognised
// trigger falls back to itself rather than rendering "undefined".
const TRIGGER_LOOKUP = new Map<string, string>(Object.entries(TRIGGER_LABEL_MAP))

/**
 * Terminal event per settled status. `deploying`/`cloning` and the queue
 * stages never appear here — a build only gets `finished_at` when it settles.
 * `built` is worded as a success with a caveat because it IS the terminal
 * success state today: the artifact exists, there is just no runtime fleet yet.
 */
const TERMINAL_META: Record<
  Exclude<BuildStatus, "queued" | "cloning" | "building" | "uploading" | "deploying">,
  { title: string; tone: StatusTone; detail?: string }
> = {
  built: { title: "Build succeeded", tone: "success", detail: "Artifact stored and verified" },
  ready: { title: "Build succeeded", tone: "success", detail: "Deployed and serving" },
  failed: { title: "Build failed", tone: "danger" },
  canceled: { title: "Build canceled", tone: "neutral" },
  superseded: {
    title: "Build superseded",
    tone: "neutral",
    detail: "A newer build replaced this one before it settled",
  },
}

// Same Record-for-compile-safety / Map-for-reads split as BuildStatusPill: the
// status is whatever the API sent, and a status added server-side since this
// bundle was built must degrade to a neutral row, not an error boundary.
const TERMINAL_LOOKUP = new Map<string, { title: string; tone: StatusTone; detail?: string }>(
  Object.entries(TERMINAL_META),
)

/** First 7 chars of a commit SHA — "" stays "". */
export function shortSha(sha: string): string {
  return sha.slice(0, 7)
}

/**
 * Absolute wall-clock stamp for an event: "14:02:29", or "15 Aug, 14:02" once
 * the event is not from today. Lifecycle events are seconds apart — four of
 * them all reading "2d ago" says nothing about their order or spacing, which
 * is the one thing a lifecycle feed exists to show.
 *
 * Kept local so components/ does not reach into partials/ for build-format
 * (same trade as isTimeSet above).
 */
export function eventStamp(iso: string): string {
  const date = new Date(iso)
  const ms = date.getTime()
  if (Number.isNaN(ms) || ms <= 0) return "—"
  const sameDay = new Date().toDateString() === date.toDateString()
  return sameDay
    ? date.toLocaleTimeString(undefined, { hour12: false })
    : date.toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
}

/**
 * A build with no commit message, described by its trigger. Mirrors
 * build-format's triggerFallbackLabel under the same layering rule as above.
 */
export function buildFallbackLabel(trigger: string): string {
  if (trigger === "push") return "Push deploy"
  return TRIGGER_LOOKUP.get(trigger) ?? trigger
}

/** One build's events, oldest first (the `seq` values encode this order). */
export function deriveBuildEvents(build: Build): ActivityEvent[] {
  const events: ActivityEvent[] = []

  // created_at is NOT gated on isTimeSet: a build row cannot exist without
  // being created, so a missing stamp here is corrupt data worth surfacing as
  // a "—" timestamp rather than a build silently absent from the feed.
  events.push({
    id: `${build.id}:queued`,
    buildId: build.id,
    at: build.created_at,
    title: "Build queued",
    // No " trigger" suffix — the labels are self-explanatory, and "First
    // deploy trigger" reads like the pipeline talking to itself.
    detail: [TRIGGER_LOOKUP.get(build.triggered_by) ?? build.triggered_by]
      .concat(build.commit_sha !== "" ? [shortSha(build.commit_sha)] : [])
      .join(" · "),
    tone: "info",
    seq: 0,
  })

  if (isTimeSet(build.claimed_at)) {
    events.push({
      id: `${build.id}:claimed`,
      buildId: build.id,
      at: build.claimed_at,
      title: "Runner claimed build",
      detail: build.gh_run_url !== "" ? "View the run on GitHub" : "",
      href: build.gh_run_url !== "" ? build.gh_run_url : undefined,
      tone: "info",
      seq: 1,
    })
  }

  if (isTimeSet(build.artifact_at)) {
    events.push({
      id: `${build.id}:artifact`,
      buildId: build.id,
      at: build.artifact_at,
      title: "Artifact uploaded",
      detail: formatArtifactBytes(build.artifact_bytes),
      tone: "info",
      seq: 2,
    })
  }

  if (isTimeSet(build.finished_at)) {
    const meta = TERMINAL_LOOKUP.get(build.status) ?? {
      title: `Build ${build.status}`,
      tone: "neutral" as StatusTone,
    }
    events.push({
      id: `${build.id}:finished`,
      buildId: build.id,
      at: build.finished_at,
      title: meta.title,
      // The server's verbatim failure beats any canned phrasing.
      detail: build.status === "failed" ? build.build_error : (meta.detail ?? ""),
      tone: meta.tone,
      seq: 3,
    })
  }

  return events
}

/** The whole feed, newest first, across every build in the list. */
export function deriveActivityEvents(builds: readonly Build[]): ActivityEvent[] {
  return builds.flatMap(deriveBuildEvents).sort((a, b) => {
    const delta = new Date(b.at).getTime() - new Date(a.at).getTime()
    if (delta !== 0) return delta
    // Same instant, same build: later lifecycle stage on top. Different
    // builds tied to the second keep a stable, if arbitrary, order.
    return a.buildId === b.buildId ? b.seq - a.seq : 0
  })
}
