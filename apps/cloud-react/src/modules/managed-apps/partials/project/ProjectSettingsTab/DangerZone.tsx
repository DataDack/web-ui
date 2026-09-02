import { useState } from "react"

import { ShieldAlert, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { ConfirmDialog, Section } from "@/components/console"

import { Button } from "@datadack/common-ui"

import { MANAGED_APPS_ROUTES } from "../../../managed-apps.constants"
import { useDeleteProject } from "../../../managed-apps.hooks"
import type { Project } from "../../../managed-apps.types"

/**
 * Deleting the project.
 *
 * It sits last in General, after the safe identity settings. Keeping the
 * irreversible action visually separated and at the end makes it available
 * without presenting deletion as a settings category of its own.
 *
 * The copy is precise about the blast radius in both directions: the platform
 * side goes, and the customer's repository — including the workflow file the
 * setup pull request added — does not. Someone deleting a project should not
 * have to wonder whether their repo is about to be touched.
 */
export function DangerZone({ project }: Readonly<{ project: Project }>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const deleteProject = useDeleteProject()
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <Section
        variant="panel"
        icon={ShieldAlert}
        tone="danger"
        title={t("managedApps.dangerZone.dangerZone")}
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
          {t("managedApps.dangerZone.deleteProject3")}
        </Button>
      </Section>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={t("managedApps.dangerZone.deleteProject")}
        description={`This permanently deletes "${project.name}", its build history and its public address. The workflow file stays in your repository — remove it there if you no longer want it.`}
        confirmLabel={t("managedApps.dangerZone.deleteProject2")}
        confirmText={project.name}
        loading={deleteProject.isPending}
        onConfirm={() => {
          deleteProject.mutate(project.id, {
            // The list the project was in, not the section default. After a
            // delete the reader wants to see that it is gone; Overview does not
            // show them that.
            onSuccess: () => void navigate(MANAGED_APPS_ROUTES.apps),
          })
        }}
      />
    </>
  )
}
