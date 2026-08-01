// Shared presentation helpers for the project detail tabs.

import type { BuildTrigger } from "../../managed-apps.types"

/** Exhaustive by construction — a new BuildTrigger will not compile without one. */
const TRIGGER_LABEL_MAP: Record<BuildTrigger, string> = {
	push: "Push",
	manual: "Manual",
	initial: "Initial",
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

/** First 7 chars of a commit SHA — "" stays "". */
export function shortSha(sha: string): string {
	return sha.slice(0, 7)
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

/** Public URL without the scheme — reads better next to a copy button. */
export function hostLabel(url: string): string {
	return url.replace(/^https?:\/\//, "")
}
