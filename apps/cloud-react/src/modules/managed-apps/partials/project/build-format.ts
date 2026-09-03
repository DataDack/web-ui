// Shared presentation helpers for the project detail tabs.

import type { BuildTrigger } from "../../managed-apps.types"

/** Exhaustive by construction — a new BuildTrigger will not compile without one. */
const TRIGGER_LABEL_MAP: Record<BuildTrigger, string> = {
  push: "Push",
  manual: "Manual redeploy",
  // "Initial" is pipeline jargon; what happened, from the user's side, is the
  // project's first deploy.
  initial: "First deploy",
}

const TRIGGER_LOOKUP = new Map<string, string>(Object.entries(TRIGGER_LABEL_MAP))

/**
 * How a build was triggered.
 *
 * Read through a Map because the value comes off the wire: an unrecognised
 * trigger falls back to itself rather than rendering the literal string
 * "undefined" in the middle of a sentence.
 */
export function triggerLabel(trigger: string): string {
  return TRIGGER_LOOKUP.get(trigger) ?? trigger
}

/**
 * A build with no commit message, described by its trigger: "Push deploy",
 * "Manual redeploy", "First deploy". Not `${triggerLabel} deploy` — two of the
 * three labels already end in "deploy", and "First deploy deploy" is what that
 * template renders.
 */
export function triggerFallbackLabel(trigger: string): string {
  return trigger === "push" ? "Push deploy" : triggerLabel(trigger)
}

/** First 7 chars of a commit SHA — "" stays "". */
export function shortSha(sha: string): string {
  return sha.slice(0, 7)
}

/** A compact, word-safe commit subject for dense deployment surfaces. */
export function commitMessageExcerpt(message: string, maxWords = 7): string {
  const words = message.trim().split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return words.join(" ")
  return `${words.slice(0, maxWords).join(" ")}…`
}

/**
 * The commit on GitHub. Empty for a build whose commit never resolved — queued,
 * or failed before the runner reported one — so callers render plain text
 * rather than a link to a repository's commit page for no commit.
 */
export function commitURL(owner: string, repo: string, sha: string): string {
  if (owner === "" || repo === "" || sha === "") return ""
  return `https://github.com/${owner}/${repo}/commit/${sha}`
}

/**
 * Who to show for a commit: the git author's name, or the GitHub handle when
 * that is all the row has.
 *
 * The NAME leads, not the login. A build history is read to find whose change
 * something was, and the name is what a colleague is known by in conversation —
 * the handle is what they are known by to GitHub. Returns "" when the row knows
 * neither, so a caller renders a dash rather than the word "unknown" repeated
 * down a column.
 */
export function authorLabel(login: string, name: string): string {
  if (name !== "") return name
  return login === "" ? "" : `@${login}`
}

/**
 * A GitHub account's avatar, at a pixel size.
 *
 * `github.com/<login>.png` rather than the `avatars.githubusercontent.com` URL
 * the API returns, because a build row stores the LOGIN and not that URL — the
 * numeric-id form would have to be fetched per build, and this one is derivable
 * offline and stays correct through a rename.
 *
 * `size` is requested at twice the rendered box so the image is not soft on a
 * retina display. An empty login returns "" — GitHub answers its 404 HTML page
 * for a login it does not know, which renders as a broken image rather than as
 * nothing.
 */
export function githubAvatarURL(login: string, size = 48): string {
  if (login === "") return ""
  return `https://github.com/${encodeURIComponent(login)}.png?size=${String(size)}`
}

/** The account's profile page. Empty login, empty string — see above. */
export function githubProfileURL(login: string): string {
  return login === "" ? "" : `https://github.com/${encodeURIComponent(login)}`
}

/**
 * Whether an ISO timestamp is actually set — nullable stamps (started_at,
 * finished_at) serialize as null, Go zero times as "0001-01-01T00:00:00Z"
 * (negative epoch ms), and empty strings parse as NaN.
 */
export function isTimeSet(iso: string | null | undefined): iso is string {
  if (!iso) return false
  const ms = new Date(iso).getTime()
  return !Number.isNaN(ms) && ms > 0
}

/** Compact "time since" for ISO timestamps: 12m ago, 3h ago, 2d ago. */
export function timeSince(iso: string): string {
  const deltaMs = Date.now() - new Date(iso).getTime()
  if (Number.isNaN(deltaMs)) return "—"
  const minutes = Math.floor(deltaMs / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${String(minutes)}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${String(hours)}h ago`
  const days = Math.floor(hours / 24)
  return `${String(days)}d ago`
}

/** Wall-clock duration between two ISO stamps: 42s, 3m 12s, 1h 4m. */
export function formatDuration(startIso: string | null, endIso: string | null): string {
  if (!isTimeSet(startIso) || !isTimeSet(endIso)) return "—"
  const deltaMs = new Date(endIso).getTime() - new Date(startIso).getTime()
  if (deltaMs < 0) return "—"
  const seconds = Math.round(deltaMs / 1000)
  if (seconds < 60) return `${String(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${String(minutes)}m ${String(seconds % 60)}s`
  return `${String(Math.floor(minutes / 60))}h ${String(minutes % 60)}m`
}

/**
 * Compact absolute stamp: "15 Aug, 13:56". Relative times answer "how long
 * ago"; this answers "when", and the two are shown together wherever a reader
 * might need to correlate builds — "2d ago" on four rows in a row says nothing.
 */
export function shortDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

/** Public URL without the scheme — reads better next to a copy button. */
export function hostLabel(url: string): string {
  return url.replace(/^https?:\/\//, "")
}

/**
 * The project URL, upgraded to https when the console itself is on https.
 *
 * Defence in depth against a control plane that reports the wrong scheme — and
 * the failure it prevents is invisible without it. A browser silently blocks an
 * http:// subresource on an https:// page, so an http URL in the deployment
 * preview does not error: the frame stays blank, the load event never fires,
 * and the console concludes the site refuses to be embedded. The link and the
 * copy button fail more quietly still, handing out an address that answers 308.
 *
 * Only ever upgrades, and only when this page is already https. On a local
 * console served over http there is no mixed-content rule to satisfy and a
 * gratuitous upgrade would break a plain-HTTP dev deployment.
 */
export function secureURL(url: string): string {
  if (url === "" || !url.startsWith("http://")) return url
  if (typeof window !== "undefined" && window.location.protocol !== "https:") return url
  return "https://" + url.slice("http://".length)
}
