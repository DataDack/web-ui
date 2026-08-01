import { LayoutGrid, List, Search } from "lucide-react"

import { SegmentedControl, type SegmentedOption } from "@/components/console"
import { Input } from "@/components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select"

import {
	PROJECT_SORTS,
	type ProjectSort,
	type ProjectView,
	type StateChip,
	type StateFilter,
} from "./project-list"
import { StateFilterChips } from "./StateFilterChips"
import { ProjectTypeIcon, projectTypeLabel } from "../../components"
import type { ProjectType } from "../../managed-apps.types"

const VIEW_OPTIONS: readonly SegmentedOption<ProjectView>[] = [
	{ value: "cards", label: "Card view", icon: LayoutGrid },
	{ value: "list", label: "List view", icon: List },
]

/**
 * The runtime filter's options. n8n is listed but disabled: hiding it would
 * make the runtime look unplanned, while enabling it would filter to a type
 * nobody can create yet.
 */
const TYPE_OPTIONS: readonly { value: ProjectType; soon?: boolean }[] = [
	{ value: "opennext" },
	{ value: "react" },
	{ value: "n8n", soon: true },
]

/** Select values are strings, so "every runtime" needs a sentinel. */
const ALL_TYPES = "all"

interface OverviewToolbarProps {
	search: string
	onSearchChange: (value: string) => void
	chips: StateChip[]
	total: number
	stateFilter: StateFilter
	onStateFilterChange: (value: StateFilter) => void
	sort: ProjectSort
	onSortChange: (value: ProjectSort) => void
	view: ProjectView
	onViewChange: (value: ProjectView) => void
	typeFilter?: ProjectType
	onTypeFilterChange: (value: ProjectType | undefined) => void
}

/**
 * One bar above both views: what to show, in what order, and in which shape.
 *
 * `glass-1` rather than a card surface, because this is chrome — it should not
 * compete with the project data below it for the reading of "panel".
 */
export function OverviewToolbar({
	search,
	onSearchChange,
	chips,
	total,
	stateFilter,
	onStateFilterChange,
	sort,
	onSortChange,
	view,
	onViewChange,
	typeFilter,
	onTypeFilterChange,
}: Readonly<OverviewToolbarProps>) {
	return (
		<div className="glass-1 mb-4 flex flex-wrap items-center gap-2 px-3 py-2.5">
			<div className="relative min-w-[200px] flex-1 sm:max-w-xs">
				<Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
				<Input
					value={search}
					onChange={(event) => {
						onSearchChange(event.target.value)
					}}
					placeholder="Search by name, repo, branch or state…"
					className="h-8 pl-8 text-[13px]"
					aria-label="Search projects"
				/>
			</div>

			<StateFilterChips
				chips={chips}
				total={total}
				value={stateFilter}
				onChange={onStateFilterChange}
			/>

			{/* The runtime filter used to live in the (since removed) service
			    sidebar as ?type= links; the toolbar is now the only place to set
			    it, so it is a picker rather than a clear-only badge. */}
			<Select
				value={typeFilter ?? ALL_TYPES}
				onValueChange={(next) => {
					onTypeFilterChange(next === ALL_TYPES ? undefined : (next as ProjectType))
				}}
			>
				<SelectTrigger
					size="sm"
					className="w-[150px] shrink-0 text-[12px]"
					aria-label="Filter by runtime"
				>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value={ALL_TYPES}>All runtimes</SelectItem>
					{TYPE_OPTIONS.map((option) => (
						<SelectItem key={option.value} value={option.value} disabled={option.soon}>
							<span className="flex items-center gap-1.5">
								<ProjectTypeIcon type={option.value} className="size-3" />
								{projectTypeLabel(option.value)}
								{option.soon && (
									<span className="text-[10px] text-muted-foreground">soon</span>
								)}
							</span>
						</SelectItem>
					))}
				</SelectContent>
			</Select>

			{/* Cards only. In the list view the column headers ARE the sort control,
			    and a select that silently stopped applying after the first header
			    click would be lying about the order on screen. */}
			{view === "cards" && (
				<Select
					value={sort}
					onValueChange={(next) => {
						onSortChange(next as ProjectSort)
					}}
				>
					<SelectTrigger
						size="sm"
						className="w-[170px] shrink-0 text-[12px]"
						aria-label="Sort projects"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{PROJECT_SORTS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			)}

			<SegmentedControl
				value={view}
				onChange={onViewChange}
				options={VIEW_OPTIONS}
				ariaLabel="View layout"
			/>
		</div>
	)
}
