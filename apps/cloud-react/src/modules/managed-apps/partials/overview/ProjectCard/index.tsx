import { ExternalLink, GitBranch } from "lucide-react"
import { Link } from "react-router-dom"

import { CopyButton } from "@/components/console"
import { cn } from "@/lib/utils"

import { cardAction } from "./card-action"
import { CardActionButton } from "./CardActionButton"
import {
	BuildProgressBar,
	ProjectAvatar,
	ProjectStateChip,
	ProjectTypeIcon,
	projectTypeLabel,
} from "../../../components"
import { MANAGED_APPS_ROUTES } from "../../../managed-apps.constants"
import type { ProjectEntry } from "../../../managed-apps.state"
import { isBuildTransitional, type Project } from "../../../managed-apps.types"
import { hostLabel, shortSha, timeSince } from "../../project/build-format"
import { ProjectActionsMenu } from "../ProjectActionsMenu"

interface ProjectCardProps {
	entry: ProjectEntry
	deploying: boolean
	onDeploy: (project: Project) => void
	onDelete: (project: Project) => void
	onReconnect: () => void
}

/**
 * One project, as a card.
 *
 * The row this replaced spent a 1900px viewport on four facts and pushed them
 * 600px apart, so they stopped reading as one project — and it truncated anyway
 * at narrow widths, because its three columns divided the width between them. A
 * card fixes the measure rather than the shape: each fact gets the card's full
 * content width on its own line, so the address, the repository and the commit
 * subject all fit at the lengths they really are.
 *
 * What sits where a screenshot would go is `state.detail` — the one piece of
 * content this API guarantees for all eleven states, including the ones with no
 * build, no commit and no serving address.
 */
export function ProjectCard({
	entry,
	deploying,
	onDeploy,
	onDelete,
	onReconnect,
}: Readonly<ProjectCardProps>) {
	const { project, state, latestBuild } = entry
	const action = cardAction(project, state)
	const isN8n = project.project_type === "n8n"

	return (
		<article
			className={cn(
				"group console-card relative flex h-full flex-col gap-2.5 rounded-xl border border-border/60 bg-card/50 px-4 py-3.5 transition-colors hover:border-border hover:bg-card/80",
				// Tone is carried in text by the chip; the border is the only second
				// encoding, and only for the state that has to be findable across a
				// grid of forty.
				state.tone === "danger" && "border-status-danger/40"
			)}
		>
			{/* Identity — name, address, and the menu that never hides. */}
			<div className="flex items-start gap-2.5">
				<ProjectAvatar
					seed={project.id}
					label={project.name}
					className="size-8 rounded-md text-[12px]"
				/>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-1.5">
						<Link
							to={MANAGED_APPS_ROUTES.project(project.id)}
							className="truncate text-[13px] font-semibold text-foreground hover:underline"
						>
							{project.name}
							{/* Stretched click target. Inside the anchor, so the
							    accessible name stays the project name. */}
							<span className="absolute inset-0" aria-hidden />
						</Link>
						<ProjectTypeIcon
							type={project.project_type}
							className="size-3.5 shrink-0 text-muted-foreground"
						/>
						<span className="sr-only">{projectTypeLabel(project.project_type)}</span>
					</div>

					{project.url && (
						<span className="relative z-10 mt-0.5 flex items-center gap-1.5">
							{state.urlReachable ? (
								<a
									href={project.url}
									target="_blank"
									rel="noreferrer"
									className="flex items-center gap-1 font-mono text-[11px] text-status-info hover:underline"
								>
									{hostLabel(project.url)}
									<ExternalLink className="size-2.5" />
								</a>
							) : (
								<CopyButton
									value={project.url}
									label={hostLabel(project.url)}
									className="text-[11px]"
								/>
							)}
						</span>
					)}
				</div>

				<ProjectActionsMenu
					entry={entry}
					deploying={deploying}
					onDeploy={onDeploy}
					onDelete={onDelete}
					className="relative z-10 -mt-1 -mr-1.5"
				/>
			</div>

			<ProjectStateChip state={state} className="self-start" />

			{/* Why it is in that state. Clamped at two lines and deliberately given
			    no `title`: a tooltip cannot fire under the stretched overlay above,
			    and does not exist on touch at all. `failed` puts the build's raw
			    error here, which is unbounded — the action routes to the log, which
			    shows it in full. */}
			<p className="line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
				{state.detail}
			</p>

			{latestBuild && isBuildTransitional(latestBuild.status) && (
				<BuildProgressBar build={latestBuild} />
			)}

			{/* Provenance, on honest branches: the overview endpoint caps
			    recent_builds at five account-wide, so most projects arrive with no
			    build at all and must not imply one. */}
			<div className="min-w-0 text-[11px] text-muted-foreground">
				{isN8n ? (
					<p>created {timeSince(project.created_at)}</p>
				) : (
					<>
						<p className="flex items-center gap-1.5 truncate">
							<GitBranch className="size-3 shrink-0" />
							<span className="truncate font-mono">
								{project.repo_owner}/{project.repo_name}
							</span>
							<span className="shrink-0 font-mono opacity-70">
								{project.branch || "main"}
							</span>
						</p>
						<p className="mt-0.5 truncate">
							{latestBuild?.commit_sha ? (
								<>
									<span className="font-mono">
										{shortSha(latestBuild.commit_sha)}
									</span>
									{latestBuild.commit_message && (
										<> {latestBuild.commit_message}</>
									)}
								</>
							) : (
								<>No build has run yet · created {timeSince(project.created_at)}</>
							)}
						</p>
					</>
				)}
			</div>

			{/* `mt-auto` aligns every footer across a row without reserving dead
			    height on the cards whose detail is short — grid items already
			    stretch to the tallest in their row. */}
			{action && (
				<div className="relative z-10 mt-auto pt-1">
					<CardActionButton
						action={action}
						deploying={deploying}
						onDeploy={() => {
							onDeploy(project)
						}}
						onReconnect={onReconnect}
					/>
				</div>
			)}
		</article>
	)
}
