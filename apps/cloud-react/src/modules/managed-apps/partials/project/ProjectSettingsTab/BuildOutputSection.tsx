import { useState } from "react"

import { Info } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Section } from "@/components/console"

import { Button } from "@datadack/common-ui"

import { BuildSettingsSection, type BuildSettingsValue } from "../../../components"
import { MANAGED_APPS_ROUTES } from "../../../managed-apps.constants"
import { useUpdateProject } from "../../../managed-apps.hooks"
import type { Project } from "../../../managed-apps.types"

/**
 * Build and output settings for an existing project.
 *
 * Saving here does not rebuild anything, and it does not change the next build
 * either: every value in this section — the commands, the directories and the
 * environment — is written INTO the workflow file that lives on the customer's
 * branch, and that file is what GitHub runs. A save updates what we would
 * propose; the repository takes it when the update pull request is merged.
 *
 * The note under the button says so, with the way to get there, because "Save
 * changes" on a settings form otherwise reads as "this is now in effect".
 */
export function BuildOutputSection({ project }: Readonly<{ project: Project }>) {
  const { t } = useTranslation()
  const update = useUpdateProject(project.id)
  const [value, setValue] = useState<BuildSettingsValue>({
    root_dir: project.root_dir,
    install_command: project.install_command,
    build_command: project.build_command,
    output_dir: project.output_dir,
    node_version: project.node_version,
  })

  const dirty =
    value.root_dir !== project.root_dir ||
    value.install_command !== project.install_command ||
    value.build_command !== project.build_command ||
    value.output_dir !== project.output_dir ||
    value.node_version !== project.node_version

  return (
    <Section
      variant="panel"
      title={t("managedApps.buildOutputSection.buildOutput")}
      description={t("managedApps.buildOutputSection.whatRunsWhenThisProjectBuildsEmptyFieldsInhe")}
    >
      <div className="space-y-4">
        <BuildSettingsSection
          projectType={project.project_type}
          value={value}
          onChange={setValue}
          defaultOpen
        />

        <div className="flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            className="gap-1.5"
            disabled={!dirty || update.isPending}
            onClick={() => {
              update.mutate(value)
            }}
            loading={update.isPending}
          >
            Save changes
          </Button>
          <span className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
            <Info className="size-3 shrink-0" />
            <span>
              These values live in the workflow file on your branch, so a build picks them up once
              that file is updated.{" "}
              <Link
                to={MANAGED_APPS_ROUTES.setup(project.id)}
                className="text-status-info hover:underline"
              >
                Review the workflow
              </Link>
              .
            </span>
          </span>
        </div>
      </div>
    </Section>
  )
}
