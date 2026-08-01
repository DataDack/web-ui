// ---------------------------------------------------------------------------
// The overview's list model: how projects become entries, and how search,
// filtering and ordering are applied to them.
//
// Deliberately free of JSX so it can be unit-tested without a renderer, and so
// the card grid and the table are guaranteed to agree — both read their order
// and their filters from here.
// ---------------------------------------------------------------------------

import type { SortingState } from "@tanstack/react-table"

import type { StatusTone } from "@/components/console/status-config"

import {
	deriveProjectState,
	PROJECT_STATE_META,
	PROJECT_STATE_URGENCY,
	type ProjectEntry,
	type ProjectStateKind,
} from "../../managed-apps.state"
import type { Build, Project } from "../../managed-apps.types"

/** Derive every project's state once, newest known build attached. */
export function buildProjectEntries(
	projects: readonly Project[],
	buildsByProject: Map<string, Build>
): ProjectEntry[] {
	return projects.map((project) => ({
		project,
		state: deriveProjectState(project, buildsByProject.get(project.id)),
		latestBuild: buildsByProject.get(project.id),
	}))
}

/**
 * Search over the DERIVED state rather than `project.status`.
 *
 * Typing "failed" or "awaiting" finds what the user means; `project.status`
 * would have matched every project equally, its readable value space being
 * exactly {"active"}.
 */
export function matchesProjectSearch(entry: ProjectEntry, needle: string): boolean {
	if (needle === "") return true
	const { project, state } = entry
	return [
		project.name,
		project.subdomain,
		project.url,
		project.repo_owner,
		project.repo_name,
		project.branch,
		state.label,
	]
		.join(" ")
		.toLowerCase()
		.includes(needle)
}

// ---------------------------------------------------------------------------
// Shape and ordering
// ---------------------------------------------------------------------------

/**
 * The two shapes the list can take. Cards lead because they are the default: at
 * the handful of projects most accounts have, a grid fills the page and gives
 * every fact its own line, where a full-width row spreads four facts across a
 * viewport until they stop reading as one project.
 */
export const PROJECT_VIEWS = ["cards", "list"] as const

export type ProjectView = (typeof PROJECT_VIEWS)[number]

export const PROJECT_SORTS = [
	{ value: "urgency", label: "Needs attention" },
	{ value: "name", label: "Name (A–Z)" },
	{ value: "updated", label: "Recently updated" },
] as const

export type ProjectSort = (typeof PROJECT_SORTS)[number]["value"]

export const PROJECT_SORT_VALUES: readonly ProjectSort[] = PROJECT_SORTS.map((sort) => sort.value)

export const DEFAULT_PROJECT_SORT: ProjectSort = "urgency"

/**
 * The same order, expressed as ResourceTable's `initialSorting`.
 *
 * ResourceTable owns its sorting in local state with no controlled prop, so a
 * sort chosen in card view can only reach the table as its initial value — and
 * every option here therefore has to name a column the table actually defines
 * (see PROJECT_TABLE_COLUMN_IDS).
 */
export const SORT_TO_TABLE_SORTING: Record<ProjectSort, SortingState> = {
	urgency: [{ id: "state", desc: false }],
	name: [{ id: "name", desc: false }],
	updated: [{ id: "updated", desc: true }],
}

function compareEntries(a: ProjectEntry, b: ProjectEntry, sort: ProjectSort): number {
	switch (sort) {
		case "name":
			return a.project.name.localeCompare(b.project.name)
		case "updated":
			// Newest first. An unparseable stamp sorts last rather than throwing
			// the whole order off — NaN comparisons are always false.
			return (
				new Date(b.project.updated_at).getTime() -
					new Date(a.project.updated_at).getTime() || 0
			)
		default:
			return (
				PROJECT_STATE_URGENCY[a.state.kind] - PROJECT_STATE_URGENCY[b.state.kind] ||
				a.project.name.localeCompare(b.project.name)
			)
	}
}

/** A new array — the query cache's array is never mutated. */
export function sortProjectEntries(entries: readonly ProjectEntry[], sort: ProjectSort) {
	return [...entries].sort((a, b) => compareEntries(a, b, sort))
}

// ---------------------------------------------------------------------------
// State filter chips
// ---------------------------------------------------------------------------

/**
 * Chip order: most urgent first, so "2 failed" is the leftmost thing on the
 * toolbar. Derived from the urgency rank rather than restated, because a chip
 * order that disagreed with the default sort would put the filter for the top
 * row at the far right.
 */
export const STATE_CHIP_ORDER: readonly ProjectStateKind[] = (
	Object.keys(PROJECT_STATE_URGENCY) as ProjectStateKind[]
).sort((a, b) => PROJECT_STATE_URGENCY[a] - PROJECT_STATE_URGENCY[b])

export interface StateChip {
	kind: ProjectStateKind
	label: string
	tone: StatusTone
	count: number
}

/**
 * One chip per state actually present, so a typical account gets one to three
 * chips rather than eleven mostly-zero ones. A chip that would read "0" is not
 * a filter, it is a dead end.
 *
 * Counted over the entries the toolbar is filtering — which is the type-filtered
 * set when the sidebar has applied ?type=. The toolbar states that scope next to
 * the counts.
 */
export function stateChips(entries: readonly ProjectEntry[]): StateChip[] {
	const counts = new Map<ProjectStateKind, number>()
	for (const entry of entries) {
		counts.set(entry.state.kind, (counts.get(entry.state.kind) ?? 0) + 1)
	}
	return STATE_CHIP_ORDER.filter((kind) => counts.has(kind)).map((kind) => ({
		kind,
		label: PROJECT_STATE_META[kind].label,
		tone: PROJECT_STATE_META[kind].tone,
		count: counts.get(kind) ?? 0,
	}))
}

/** Every state kind, as the allowed values for the ?state= param. */
export const STATE_FILTER_VALUES: readonly (ProjectStateKind | "all")[] = [
	"all",
	...STATE_CHIP_ORDER,
]

export type StateFilter = (typeof STATE_FILTER_VALUES)[number]

// ---------------------------------------------------------------------------
// The whole pipeline
// ---------------------------------------------------------------------------

export interface ProjectListView {
	/** What to render, filtered and ordered. */
	visible: ProjectEntry[]
	/** Chips for the unsearched set — a chip must not vanish as you type. */
	chips: StateChip[]
	/** Whether search or the state chip is narrowing the set. */
	filtersActive: boolean
}

/**
 * Chips count the set BEFORE search, so typing does not make the counts (and
 * therefore the chips themselves) flicker in and out of existence. The state
 * filter is applied after counting for the same reason: selecting "Failed"
 * must not hide every other chip and trap the user in that filter.
 */
export function projectListView(
	entries: readonly ProjectEntry[],
	options: { search: string; state: StateFilter; sort: ProjectSort }
): ProjectListView {
	const needle = options.search.trim().toLowerCase()
	const visible = sortProjectEntries(
		entries.filter(
			(entry) =>
				(options.state === "all" || entry.state.kind === options.state) &&
				matchesProjectSearch(entry, needle)
		),
		options.sort
	)
	return {
		visible,
		chips: stateChips(entries),
		filtersActive: needle !== "" || options.state !== "all",
	}
}
