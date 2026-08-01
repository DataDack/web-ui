import { type ReactNode, useMemo } from "react"

import type { ColumnDef, SortingState } from "@tanstack/react-table"
import { ExternalLink, GitBranch } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import { CopyButton, ResourceTable, type ColumnMeta } from "@/components/console"

import { ProjectActionsMenu } from "./ProjectActionsMenu"
import { cardAction } from "./ProjectCard/card-action"
import { ProjectAvatar, ProjectStateChip } from "../../components"
import { MANAGED_APPS_ROUTES } from "../../managed-apps.constants"
import { PROJECT_STATE_URGENCY, type ProjectEntry } from "../../managed-apps.state"
import type { Project } from "../../managed-apps.types"
import { hostLabel, shortSha, timeSince } from "../project/build-format"

/** Millisecond stamp for sorting; an unparseable date sorts oldest. */
function stampOf(iso: string): number {
	const ms = new Date(iso).getTime()
	return Number.isNaN(ms) ? 0 : ms
}

const DASH = <span className="text-muted-foreground">—</span>

interface ProjectTableProps {
	entries: ProjectEntry[]
	isLoading: boolean
	emptyState: ReactNode
	initialSorting: SortingState
	deployingId?: string
	onDeploy: (project: Project) => void
	onDelete: (project: Project) => void
}

/**
 * The list view: one project per row, with real column headers.
 *
 * This is the half of the toggle that cards are bad at. A card grid is the right
 * default at the handful of projects most accounts have, but it cannot answer
 * "which of these fifty was touched most recently" — that needs columns that
 * line up and a header you can click. Sorting, responsive column hiding and the
 * loading skeleton all come from the console's ResourceTable.
 *
 * Deliberately NOT passed `isError`: ResourceTable renders its own generic
 * failure copy inside the table body, and flipping the view toggle during an
 * outage would then change what the failure says. The page owns one error panel
 * above both views.
 */
export function ProjectTable({
	entries,
	isLoading,
	emptyState,
	initialSorting,
	deployingId,
	onDeploy,
	onDelete,
}: Readonly<ProjectTableProps>) {
	const navigate = useNavigate()

	const columns = useMemo<ColumnDef<ProjectEntry>[]>(
		() => [
			{
				id: "name",
				accessorFn: (entry) => entry.project.name,
				header: () => "Project",
				// The row's onClick is mouse-only, so the name is a real link: it is
				// how a keyboard reaches the project at all. `interactive` stops the
				// cell's click bubbling to the row, which would otherwise navigate
				// twice.
				meta: { interactive: true } satisfies ColumnMeta,
				cell: ({ row }) => {
					const { project } = row.original
					return (
						<div className="flex min-w-0 items-center gap-2">
							<ProjectAvatar
								seed={project.id}
								label={project.name}
								className="size-6 rounded text-[11px]"
							/>
							<Link
								to={MANAGED_APPS_ROUTES.project(project.id)}
								className="truncate text-[13px] font-medium text-foreground hover:underline"
							>
								{project.name}
							</Link>
						</div>
					)
				},
			},
			{
				id: "state",
				// Sorted by urgency, not alphabetically by label: the point of
				// clicking this header is to bring what needs attention to the top,
				// and the same rank drives the card grid's default order.
				accessorFn: (entry) => PROJECT_STATE_URGENCY[entry.state.kind],
				header: () => "State",
				cell: ({ row }) => <ProjectStateChip state={row.original.state} />,
			},
			{
				id: "address",
				accessorFn: (entry) => entry.project.url,
				header: () => "Address",
				enableSorting: false,
				meta: { responsive: "md", interactive: true } satisfies ColumnMeta,
				cell: ({ row }) => {
					const { project, state } = row.original
					if (!project.url) return DASH
					if (!state.urlReachable) {
						return (
							<CopyButton
								value={project.url}
								label={hostLabel(project.url)}
								className="text-[11px]"
							/>
						)
					}
					return (
						<a
							href={project.url}
							target="_blank"
							rel="noreferrer"
							className="flex items-center gap-1 font-mono text-[11px] text-status-info hover:underline"
						>
							{hostLabel(project.url)}
							<ExternalLink className="size-2.5" />
						</a>
					)
				},
			},
			{
				id: "source",
				accessorFn: (entry) => `${entry.project.repo_owner}/${entry.project.repo_name}`,
				header: () => "Source",
				meta: { responsive: "lg" } satisfies ColumnMeta,
				cell: ({ row }) => {
					const { project } = row.original
					if (project.project_type === "n8n") return DASH
					return (
						<span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
							<GitBranch className="size-3 shrink-0" />
							<span className="max-w-56 truncate font-mono">
								{project.repo_owner}/{project.repo_name}
							</span>
							<span className="shrink-0 font-mono opacity-70">
								{project.branch || "main"}
							</span>
						</span>
					)
				},
			},
			{
				id: "build",
				header: () => "Last build",
				enableSorting: false,
				meta: { responsive: "xl" } satisfies ColumnMeta,
				cell: ({ row }) => {
					const build = row.original.latestBuild
					// Absent for most projects: the overview endpoint returns only
					// the five most recent builds account-wide.
					if (!build?.commit_sha) return DASH
					return (
						<span className="flex max-w-72 items-center gap-1.5 truncate text-[11px] text-muted-foreground">
							<span className="font-mono">{shortSha(build.commit_sha)}</span>
							<span className="truncate">{build.commit_message}</span>
						</span>
					)
				},
			},
			{
				id: "next",
				accessorFn: (entry) => cardAction(entry.project, entry.state)?.label ?? "",
				header: () => "Next step",
				meta: { responsive: "lg" } satisfies ColumnMeta,
				// Plain text, not a button. Sixty live buttons in a view built for
				// scanning is noise, and the row menu already carries every action —
				// keeping the cell inert also leaves the row's own click working.
				cell: ({ row }) => {
					const label = cardAction(row.original.project, row.original.state)?.label
					if (!label) return DASH
					return <span className="text-[12px] text-foreground">{label}</span>
				},
			},
			{
				id: "updated",
				accessorFn: (entry) => stampOf(entry.project.updated_at),
				header: () => "Updated",
				meta: { responsive: "md" } satisfies ColumnMeta,
				cell: ({ row }) => (
					<span className="font-mono text-[11px] whitespace-nowrap text-muted-foreground">
						{timeSince(row.original.project.updated_at)}
					</span>
				),
			},
			{
				id: "__actions",
				header: () => null,
				enableSorting: false,
				enableHiding: false,
				meta: { interactive: true } satisfies ColumnMeta,
				cell: ({ row }) => (
					<div className="flex justify-end">
						<ProjectActionsMenu
							entry={row.original}
							deploying={deployingId === row.original.project.id}
							onDeploy={onDeploy}
							onDelete={onDelete}
						/>
					</div>
				),
			},
		],
		[deployingId, onDeploy, onDelete]
	)

	return (
		<ResourceTable
			data={entries}
			columns={columns}
			getRowId={(entry) => entry.project.id}
			isLoading={isLoading}
			initialSorting={initialSorting}
			emptyState={emptyState}
			onRowClick={(entry) => {
				void navigate(MANAGED_APPS_ROUTES.project(entry.project.id))
			}}
		/>
	)
}
