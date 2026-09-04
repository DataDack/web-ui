import { useState } from "react"

import { Badge, Button } from "@datadack/common-ui"
import { Hammer } from "lucide-react"
import { useTranslation } from "react-i18next"
import { SiGithubactions } from "react-icons/si"
import { Link } from "react-router-dom"

import { Section } from "@/components/console"

import { BuildSettingsSection, type BuildSettingsValue } from "../../../components"
import { MANAGED_APPS_ROUTES } from "../../../managed-apps.constants"
import { useUpdateProject } from "../../../managed-apps.hooks"
import type { Project } from "../../../managed-apps.types"

interface BuildOutputSectionProps {
  project: Project
  /** How many fields depart from the platform defaults. Counted by the tab,
   *  which shows the same number on the rail. */
  overrideCount?: number
}

/**
 * Build and output settings for an existing project.
 *
 * Saving here does not rebuild anything, and it does not change the next build
 * either: every value in this section — the commands, the directories and the
 * environment — is written INTO the workflow file that lives on the customer's
 * branch, and that file is what GitHub Actions runs. A save updates what we
 * would propose; the repository takes it when the update pull request is merged.
 *
 * The note under the button says so, with the way to get there and the Actions
 * mark beside it, because "Save changes" on a settings form otherwise reads as
 * "this is now in effect" — and because naming the thing that will run is
 * clearer than describing it.
 */
export function BuildOutputSection({
  project,
  overrideCount = 0,
}: Readonly<BuildOutputSectionProps>) {
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
      icon={Hammer}
      tone="brand"
      title={t("managedApps.buildOutputSection.buildOutput")}
      description={t("managedApps.buildOutputSection.whatRunsWhenThisProjectBuildsEmptyFieldsInhe")}
      badge={
        <Badge
          variant="outline"
          className="border-brand-gold/30 text-[11px] font-normal text-brand-gold-ink"
        >
          {overrideCount === 0 ? "using defaults" : `${String(overrideCount)} overridden`}
        </Badge>
      }
    >
      <div className="space-y-4">
        <BuildSettingsSection
          projectType={project.project_type}
          framework={project.framework}
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
            <SiGithubactions aria-hidden className="size-3 shrink-0 text-[#2088FF]" />
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
