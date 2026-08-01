import { useState } from "react"

import { Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { ConfirmDialog, Section } from "@/components/console"
import { Button } from "@/components/ui/button"

import { MANAGED_APPS_ROUTES } from "../../../managed-apps.constants"
import { useDeleteProject } from "../../../managed-apps.hooks"
import type { Project } from "../../../managed-apps.types"

/**
 * Deleting the project.
 *
 * The copy is precise about the blast radius in both directions: the platform
 * side goes, and the customer's repository — including the workflow file the
 * setup pull request added — does not. Someone deleting a project should not
 * have to wonder whether their repo is about to be touched.
 */
export function DangerZone({ project }: Readonly<{ project: Project }>) {
	const navigate = useNavigate()
	const deleteProject = useDeleteProject()
	const [confirmOpen, setConfirmOpen] = useState(false)

	return (
		<>
			<Section
				variant="panel"
				title="Danger zone"
				description="Deleting a project removes it, its build history and its public address. Your repository is left untouched."
				className="border border-destructive/30"
			>
				<Button
					variant="destructive"
					size="sm"
					className="gap-1.5"
					onClick={() => {
						setConfirmOpen(true)
					}}
				>
					<Trash2 className="size-3.5" />
					Delete project
				</Button>
			</Section>

			<ConfirmDialog
				open={confirmOpen}
				onOpenChange={setConfirmOpen}
				title="Delete project"
				description={`This permanently deletes "${project.name}", its build history and its public address. The workflow file stays in your repository — remove it there if you no longer want it.`}
				confirmLabel="Delete project"
				confirmText={project.name}
				loading={deleteProject.isPending}
				onConfirm={() => {
					deleteProject.mutate(project.id, {
						onSuccess: () => void navigate(MANAGED_APPS_ROUTES.root),
					})
				}}
			/>
		</>
	)
}
