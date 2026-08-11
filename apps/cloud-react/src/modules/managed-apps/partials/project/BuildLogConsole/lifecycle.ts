// The build's own lifecycle, as log lines.
//
// The runner's output starts when a GitHub Actions worker has already been
// assigned and ends before the artifact is verified — everything the control
// plane does around it (queueing, waiting for a runner, storing the artifact,
// releasing the container) leaves no trace in that text. A user watching an
// empty log therefore cannot tell "no runner has picked this up yet" from
// "the runner is silent", and a settled log stops at the last build command
// with nothing to say about whether it was deployed.
//
// These lines close both gaps. Every one of them is stamped from a REAL
// timestamp on the build row; where the platform records no time, the line
// still renders and says so rather than inventing one.

import type { Build, Project } from "../../../managed-apps.types"
import { isTimeSet, shortSha, triggerLabel } from "../build-format"

export type LifecycleTone = "muted" | "info" | "success" | "danger"

export interface LifecycleEvent {
  key: string
  /** ISO stamp, or null when the platform records no time for this step. */
  at: string | null
  label: string
  /** The specifics worth having in the log: run ids, commands, sizes, errors. */
  detail?: string
  tone: LifecycleTone
  /** Still happening — renders as a spinner with no time yet. */
  pending?: boolean
  /** Opens the GitHub Actions run behind this line. */
  href?: string
}

/** Bytes as MB/KB, for the artifact line. */
function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 B"
  if (bytes < 1024) return `${String(bytes)} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(1)} KB`
  return `${(kb / 1024).toFixed(1)} MB`
}

/** First line of a commit message — the rest is a paragraph, not a log line. */
function subject(message: string): string {
  const first = message.split("\n")[0].trim()
  return first.length > 72 ? `${first.slice(0, 71)}…` : first
}

/**
 * What the build was told to run. Empty commands are the platform's defaults
 * resolved on the runner, so they are described rather than printed as blanks.
 */
function buildCommands(project: Project | undefined): string | undefined {
  if (!project) return undefined
  const parts: string[] = []
  if (project.root_dir !== "") parts.push(`root ${project.root_dir}`)
  parts.push(`install: ${project.install_command || "default"}`)
  parts.push(`build: ${project.build_command || "default"}`)
  if (project.node_version !== "") parts.push(`node ${project.node_version}`)
  return parts.join(" · ")
}

/**
 * The settled states and how each reads. A Map because the status comes off
 * the wire: a status this console has never heard of must miss, not index into
 * an object and hand back an `undefined` the types swore was there.
 */
const TERMINAL_LABEL = new Map<string, { label: string; tone: LifecycleTone }>([
  ["built", { label: "Build complete", tone: "success" }],
  ["failed", { label: "Build failed", tone: "danger" }],
  ["canceled", { label: "Build canceled", tone: "danger" }],
  ["superseded", { label: "Build superseded by a newer commit", tone: "muted" }],
])

/** Everything up to the point the runner starts printing. */
function leadingEvents(build: Build, project: Project | undefined): LifecycleEvent[] {
  const leading: LifecycleEvent[] = []

  const queuedDetail = [
    build.commit_sha === "" ? undefined : shortSha(build.commit_sha),
    subject(build.commit_message) || undefined,
    `${triggerLabel(build.triggered_by).toLowerCase()} trigger`,
    project ? `branch ${project.branch}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ")

  leading.push({
    key: "queued",
    at: build.created_at,
    label: "Build queued",
    detail: queuedDetail,
    tone: "info",
  })

  // Waiting for a runner is the longest unexplained pause in the whole flow:
  // the job sits in GitHub's queue and nothing anywhere says so.
  if (isTimeSet(build.claimed_at)) {
    leading.push({
      key: "claimed",
      at: build.claimed_at,
      label: "GitHub Actions worker assigned",
      detail: build.gh_run_url === "" ? "the job left the queue" : "run assigned on GitHub Actions",
      tone: "info",
      href: build.gh_run_url === "" ? undefined : build.gh_run_url,
    })
  } else if (build.status === "queued") {
    leading.push({
      key: "claimed",
      at: null,
      label: "Waiting for a GitHub Actions worker",
      detail: "the job is queued on your runners — nothing builds until one picks it up",
      tone: "muted",
      pending: true,
    })
  }

  if (isTimeSet(build.started_at)) {
    leading.push({
      key: "started",
      at: build.started_at,
      label: "Build started",
      detail: buildCommands(project),
      tone: "info",
    })
  }

  return leading
}

/** Everything after the runner's last line: storage, settlement, release. */
function trailingEvents(build: Build, project: Project | undefined): LifecycleEvent[] {
  const trailing: LifecycleEvent[] = []

  if (isTimeSet(build.artifact_at)) {
    trailing.push({
      key: "artifact",
      at: build.artifact_at,
      label: "Artifact uploaded",
      detail: `${formatBytes(build.artifact_bytes)} stored and verified`,
      tone: "info",
    })
  }

  const terminal = TERMINAL_LABEL.get(build.status)
  if (terminal) {
    trailing.push({
      key: "settled",
      at: build.finished_at,
      label: terminal.label,
      detail: build.build_error || undefined,
      tone: terminal.tone,
    })
  }

  // Deployment. `deploying` has not overwritten finished_at yet, so that stamp
  // is still the build's own completion; by `ready` it has been reused for the
  // release and the artifact upload is the closest honest anchor left.
  if (build.status === "deploying" || build.status === "ready") {
    const completedAt = build.status === "deploying" ? build.finished_at : build.artifact_at
    trailing.push({
      key: "built",
      at: completedAt,
      label: "Build complete",
      detail: "the image is stored — releasing it to a runtime container",
      tone: "success",
    })
    trailing.push({
      key: "deploy-start",
      // Nothing stamps the start of a release, and `deploying` is only visible
      // while it runs. Say that rather than reusing a neighbouring time.
      at: build.status === "deploying" ? build.updated_at : null,
      label: "Deployment started",
      detail:
        build.status === "deploying"
          ? "provisioning the runtime container"
          : "start time is not recorded",
      tone: "info",
    })
  }

  if (build.status === "deploying") {
    trailing.push({
      key: "deploy-end",
      at: null,
      label: "Deploying",
      detail: "staging the image, starting the container and pointing DNS at it",
      tone: "muted",
      pending: true,
    })
  }

  if (build.status === "ready") {
    trailing.push({
      key: "deploy-end",
      at: build.finished_at,
      label: "Deployment finished",
      detail: project ? `live at ${project.url}` : "the container is serving this build",
      tone: "success",
    })
  }

  return trailing
}

/**
 * The lifecycle split around the runner's output: what happened before the
 * runner started printing, and what happened after it stopped.
 *
 * The split is chronological, not cosmetic. Putting "Deployment finished" at
 * the top of a log whose last line is a webpack summary would misdate it by
 * minutes, so the trailing events render below the output where they belong.
 */
export function buildLifecycle(
  build: Build | undefined,
  project?: Project,
): { leading: LifecycleEvent[]; trailing: LifecycleEvent[] } {
  if (!build) return { leading: [], trailing: [] }
  return { leading: leadingEvents(build, project), trailing: trailingEvents(build, project) }
}

/** Wall-clock HH:MM:SS for a lifecycle line, or a dash when there is no time. */
export function eventClock(at: string | null): string {
  if (!isTimeSet(at)) return "--:--:--"
  return new Date(at).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

/**
 * How long after the build was queued this line happened: +7.3s, +2m 04s.
 * Relative to the queue rather than the previous line, so a line read on its
 * own still answers "how far into the build was this".
 */
export function eventOffset(at: string | null, originIso: string): string {
  if (!isTimeSet(at) || !isTimeSet(originIso)) return ""
  const deltaMs = new Date(at).getTime() - new Date(originIso).getTime()
  if (deltaMs < 0) return ""
  if (deltaMs < 10_000) return `+${(deltaMs / 1000).toFixed(1)}s`
  const seconds = Math.round(deltaMs / 1000)
  if (seconds < 60) return `+${String(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `+${String(minutes)}m ${String(seconds % 60).padStart(2, "0")}s`
  return `+${String(Math.floor(minutes / 60))}h ${String(minutes % 60).padStart(2, "0")}m`
}
