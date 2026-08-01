import type { CacheNamespaceGroup } from "../../superadmin.types"

// Selection helpers, kept out of the components so the "which combo is this?"
// logic is testable and the JSX stays about layout.

export type Selection = ReadonlySet<string>

export const EMPTY_SELECTION: Selection = new Set<string>()

export function toggle(selection: Selection, key: string): Selection {
	const next = new Set(selection)
	if (!next.delete(key)) next.add(key)
	return next
}

// Toggling a module is all-or-nothing: if every namespace in it is already
// selected, the click clears them; otherwise it completes the set. Partially
// selected modules therefore fill in rather than empty out, which is what the
// tri-state checkbox in the header implies.
export function toggleGroup(selection: Selection, group: CacheNamespaceGroup): Selection {
	const keys = group.namespaces.map((ns) => ns.key)
	const next = new Set(selection)
	if (keys.every((k) => next.has(k))) keys.forEach((k) => next.delete(k))
	else keys.forEach((k) => next.add(k))
	return next
}

export function groupState(selection: Selection, group: CacheNamespaceGroup) {
	const total = group.namespaces.length
	const picked = group.namespaces.filter((ns) => selection.has(ns.key)).length
	return { picked, total, all: total > 0 && picked === total, some: picked > 0 && picked < total }
}

// Everything the confirm step needs to describe the pending clear honestly:
// how many key families, how many live keys, and whether any of them is
// Redis-only state that will not come back.
export function summarize(groups: CacheNamespaceGroup[], selection: Selection) {
	const selected = groups
		.flatMap((g) => g.namespaces)
		.filter((ns) => selection.has(ns.key))
	return {
		namespaces: selected,
		keys: selected.reduce((sum, ns) => sum + ns.keys, 0),
		disruptive: selected.filter((ns) => ns.impact === "disruptive"),
	}
}
