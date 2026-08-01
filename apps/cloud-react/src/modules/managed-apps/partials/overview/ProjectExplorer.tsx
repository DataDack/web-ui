import { type ReactNode, useMemo, useState } from "react"

import { AlertTriangle, Search } from "lucide-react"

import { EmptyState, staggerDelay } from "@/components/console"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useQueryParamState } from "@/hooks/use-query-param-state"
import { useViewPreference } from "@/hooks/use-view-preference"

import { OverviewToolbar } from "./OverviewToolbar"
import {
	DEFAULT_PROJECT_SORT,
	PROJECT_SORT_VALUES,
	PROJECT_VIEWS,
	projectListView,
	SORT_TO_TABLE_SORTING,
	STATE_FILTER_VALUES,
	type ProjectSort,
	type ProjectView,
	type StateFilter,
} from "./project-list"
import { ProjectCard } from "./ProjectCard"
import { ProjectTable } from "./ProjectTable"
import { PROJECT_TYPE_META, projectTypeLabel } from "../../components"
import type { ProjectEntry } from "../../managed-apps.state"
import type { Project, ProjectType } from "../../managed-apps.types"

const SKELETON_KEYS = ["c1", "c2", "c3", "c4", "c5", "c6"] as const

/** The API's page size. A full page means there may be more we cannot see. */
const PAGE_LIMIT = 100

interface ProjectExplorerProps {
	entries: ProjectEntry[]
	isLoading: boolean
	isError: boolean
	onRetry: () => void
	typeFilter?: ProjectType
	onTypeFilterChange: (value: ProjectType | undefined) => void
	deployingId?: string
	onDeploy: (project: Project) => void
	onDelete: (project: Project) => void
	onReconnect: () => void
}

/**
 * The project list, in whichever shape the user asked for.
 *
 * Cards are the default: at the handful of projects most accounts have, a grid
 * fills the page and gives every fact its own line. The table is the opt-in view
 * for the case cards are bad at — fifty projects that need sorting by a column.
 * Both read their filtering and ordering from project-list.ts, so the two can
 * never disagree about what is on screen or in what order.
 *
 * Search, state, sort and view all live in the URL, so a triaged view is a link
 * someone can send.
 */
export function ProjectExplorer({
	entries,
	isLoading,
	isError,
	onRetry,
	typeFilter,
	onTypeFilterChange,
	deployingId,
	onDeploy,
	onDelete,
	onReconnect,
}: Readonly<ProjectExplorerProps>) {
	// Search stays component state: it changes on every keystroke, and writing
	// each one to the URL would flood history and re-render every consumer of the
	// query string.
	const [search, setSearch] = useState("")
	const [stateFilter, setStateFilter] = useQueryParamState<StateFilter>(
		"state",
		STATE_FILTER_VALUES,
		"all"
	)
	const [sort, setSort] = useQueryParamState<ProjectSort>(
		"sort",
		PROJECT_SORT_VALUES,
		DEFAULT_PROJECT_SORT
	)
	const [view, setView] = useViewPreference<ProjectView>(
		"view",
		PROJECT_VIEWS,
		"cards",
		"managed-apps:view"
	)

	const { visible, chips, filtersActive } = useMemo(
		() => projectListView(entries, { search, state: stateFilter, sort }),
		[entries, search, stateFilter, sort]
	)

	const clearFilters = () => {
		setSearch("")
		setStateFilter("all")
	}

	/**
	 * Two distinct "nothing here" answers: filters that matched nothing, and a
	 * type filter with no members. An account with no projects at all never
	 * reaches here — the page shows its onboarding hero instead.
	 */
	let empty: ReactNode = null
	if (filtersActive) {
		empty = (
			<EmptyState
				icon={Search}
				title="No projects match these filters"
				description="Nothing matches what you are filtering by. Clear the filters to see every project."
				action={{ label: "Clear filters", onClick: clearFilters }}
			/>
		)
	} else if (typeFilter) {
		empty = (
			<EmptyState
				icon={PROJECT_TYPE_META[typeFilter].icon}
				title={`No ${projectTypeLabel(typeFilter)} projects yet`}
				description={
					typeFilter === "n8n"
						? "n8n workspaces are coming soon."
						: "Nothing here yet — clear the filter to see every project."
				}
			/>
		)
	}

	// One error panel for both views. ResourceTable can render its own failure
	// copy inside the table body, but then flipping the toggle during an outage
	// would change what the failure says.
	let content: ReactNode
	if (isError && !isLoading) {
		content = (
			<div className="glass-1 flex flex-col items-center gap-3 rounded-xl border border-status-danger/30 px-6 py-12 text-center">
				<AlertTriangle className="size-5 text-status-danger" />
				<p className="text-[13px] text-muted-foreground">Could not load your projects.</p>
				<Button size="sm" variant="outline" onClick={onRetry}>
					Try again
				</Button>
			</div>
		)
	} else if (view === "list") {
		content = (
			<ProjectTable
				entries={visible}
				isLoading={isLoading}
				emptyState={empty}
				initialSorting={SORT_TO_TABLE_SORTING[sort]}
				deployingId={deployingId}
				onDeploy={onDeploy}
				onDelete={onDelete}
			/>
		)
	} else if (!isLoading && visible.length === 0) {
		// The table renders its own empty state inside the table body, so that one
		// keeps its column headers; the grid has no frame to keep, so the empty
		// state simply replaces it.
		content = empty
	} else {
		content = (
			<CardGrid
				entries={visible}
				isLoading={isLoading}
				deployingId={deployingId}
				onDeploy={onDeploy}
				onDelete={onDelete}
				onReconnect={onReconnect}
			/>
		)
	}

	return (
		<div>
			<OverviewToolbar
				search={search}
				onSearchChange={setSearch}
				chips={chips}
				total={entries.length}
				stateFilter={stateFilter}
				onStateFilterChange={setStateFilter}
				sort={sort}
				onSortChange={setSort}
				view={view}
				onViewChange={setView}
				typeFilter={typeFilter}
				onTypeFilterChange={onTypeFilterChange}
			/>

			{content}

			{/* The list endpoint asks for one page of a hundred and the client
			    discards the total, so a full page is the only signal that more may
			    exist. Saying so is the honest option; silently showing a hundred and
			    counting states over them reads as "this is everything". */}
			{!isLoading && !isError && entries.length >= PAGE_LIMIT && (
				<p className="mt-3 text-[11px] text-muted-foreground">
					Showing the first {String(PAGE_LIMIT)} projects. Counts and filters above cover
					these only.
				</p>
			)}
		</div>
	)
}

interface CardGridProps {
	entries: ProjectEntry[]
	isLoading: boolean
	deployingId?: string
	onDeploy: (project: Project) => void
	onDelete: (project: Project) => void
	onReconnect: () => void
}

/**
 * A list, marked up as one: a screen reader announces "6 items" and can walk
 * them, which is the only way to answer "how many projects need me" without
 * seeing the colours.
 *
 * Column counts are chosen so a card never drops below ~400px of content — the
 * width at which the address, the repository line and the commit subject stop
 * fitting, which is what made the old four-up grid truncate everything.
 */
function CardGrid({
	entries,
	isLoading,
	deployingId,
	onDeploy,
	onDelete,
	onReconnect,
}: Readonly<CardGridProps>) {
	if (isLoading) {
		return (
			<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
				{SKELETON_KEYS.map((key) => (
					<Skeleton key={key} className="h-[190px] rounded-xl" />
				))}
			</div>
		)
	}

	return (
		<ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
			{entries.map((entry, index) => (
				<li
					key={entry.project.id}
					className="animate-content-enter"
					style={staggerDelay(index)}
				>
					<ProjectCard
						entry={entry}
						deploying={deployingId === entry.project.id}
						onDeploy={onDeploy}
						onDelete={onDelete}
						onReconnect={onReconnect}
					/>
				</li>
			))}
		</ul>
	)
}
