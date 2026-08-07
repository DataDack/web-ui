import { useState } from "react"

import { Info } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Section } from "@/components/console"

import { Button } from "@datadack/common-ui"

import { BuildSettingsSection, type BuildSettingsValue } from "../../../components"
import { useUpdateProject } from "../../../managed-apps.hooks"
import type { Project } from "../../../managed-apps.types"

/**
 * Build and output settings for an existing project.
 *
 * Saving here does not rebuild anything — the values are read by the next
 * build, and the workflow file already on the customer's branch is what runs
 * it. Saying so prevents the reasonable assumption that pressing Save deploys.
 */
export function BuildOutputSection({ project }: Readonly<{ project: Project }>) {
  const { t } = useTranslation()
  const update = useUpdateProject(project.id)
  const [value, setValue] = useState<BuildSettingsValue>({
    root_dir: project.root_dir,
    install_command: project.install_command,
    build_command: project.build_command,
    output_dir: project.output_dir,
  })

  const dirty =
    value.root_dir !== project.root_dir ||
    value.install_command !== project.install_command ||
    value.build_command !== project.build_command ||
    value.output_dir !== project.output_dir

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
          <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Info className="size-3" />
            {t("managedApps.buildOutputSection.appliesToTheNextBuildThisDoesNotStartOne")}
          </span>
        </div>
      </div>
    </Section>
  )
}
