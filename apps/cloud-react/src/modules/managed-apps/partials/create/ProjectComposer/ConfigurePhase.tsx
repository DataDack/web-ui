import { Button, Input } from "@datadack/common-ui"
import { ChevronLeft, GitBranch } from "lucide-react"
import { useTranslation } from "react-i18next"

import { FieldRow } from "@/components/console"

import { DetectionNotice } from "./DetectionNotice"
import { NetworkingSection } from "./NetworkingSection"
import type { ComposerValues } from "./schema"
import {
  BranchSelect,
  BuildSettingsSection,
  EnvVarEditor,
  PlanLimitsPanel,
  PreviewEnvironmentField,
  projectTypeLabel,
  type EnvRow,
} from "../../../components"
import type { RepoDetection } from "../../../managed-apps.types"

interface ConfigurePhaseProps {
  values: ComposerValues
  envRows: EnvRow[]
  onChange: (patch: Partial<ComposerValues>) => void
  onEnvChange: (rows: EnvRow[]) => void
  onChangeRepo: () => void
  errors: Partial<Record<"branch" | "name" | "vpc_id" | "env" | "project_type", string>>
  detection: RepoDetection | undefined
  detecting: boolean
  detectionFailed: boolean
  detectionOverridden: boolean
  onResetDetection: () => void
}

/**
 * Configure — everything else, on one page.
 *
 * There is no step gate here. The source is already chosen, every remaining
 * field has a working default, and hiding them behind Next buttons only stops
 * the user seeing what they are about to deploy. Advanced groups collapse; they
 * are never more than one click away.
 */
export function ConfigurePhase({
  values,
  envRows,
  onChange,
  onEnvChange,
  onChangeRepo,
  errors,
  detection,
  detecting,
  detectionFailed,
  detectionOverridden,
  onResetDetection,
}: Readonly<ConfigurePhaseProps>) {
  const { t } = useTranslation()
  return (
    <div className="space-y-6">
      {/* The chosen source, with the way back to change it. Losing nothing
			    when you do is what makes this safe to offer. */}
      <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-border/60 glass-1-bg px-3 py-2.5">
        <GitBranch className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate font-mono text-[13px] font-medium">{values.repo}</span>
            {/* The runtime, stated rather than re-asked. It was chosen on
						    Import and checked against the repository there, so a second
						    editable copy here would be both a second source of truth and
						    the way around that check. */}
            <span className="shrink-0 rounded-full border border-border/60 px-1.5 py-0.5 text-[10px] tracking-wide text-muted-foreground uppercase">
              {projectTypeLabel(values.project_type)}
            </span>
          </span>
          <span className="text-[11px] text-muted-foreground">
            Deploys on every push to {values.branch || values.default_branch}
          </span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 shrink-0 gap-1 px-2 text-[12px]"
          onClick={onChangeRepo}
        >
          <ChevronLeft className="size-3.5" />
          {t("managedApps.configurePhase.changeRepoOrType")}
        </Button>
      </div>

      <FieldRow label="Branch" required error={errors.branch}>
        <BranchSelect
          installationId={values.installation_id ?? undefined}
          owner={values.repo_owner || undefined}
          repo={values.repo_name || undefined}
          value={values.branch || undefined}
          defaultBranch={values.default_branch}
          invalid={Boolean(errors.branch)}
          onChange={(branch) => {
            onChange({ branch })
          }}
        />
      </FieldRow>

      <FieldRow
        label={t("managedApps.configurePhase.projectName")}
        htmlFor="project-name"
        error={errors.name}
        description={t("managedApps.configurePhase.leaveEmptyToNameItAfterTheRepositoryBecomesP")}
      >
        <Input
          id="project-name"
          value={values.name}
          placeholder={values.repo_name}
          className="font-mono sm:w-80"
          onChange={(event) => {
            onChange({ name: event.target.value })
          }}
        />
      </FieldRow>

      {errors.project_type && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-[12px] text-destructive">
          {errors.project_type}
        </p>
      )}

      <DetectionNotice
        detection={detection}
        isLoading={detecting}
        isError={detectionFailed}
        overridden={detectionOverridden}
        onApply={onResetDetection}
      />

      {/* Not a choice: the plan is account-scoped, so this project inherits
			    whatever the account is on. Offering a picker here implied a
			    per-project tier the platform does not have — and quietly moved
			    every other project onto it. The limits it will run under are
			    worth stating, so they are; changing them is Settings' job. */}
      <FieldRow
        label={t("managedApps.configurePhase.planLimits")}
        description={t("managedApps.configurePhase.inheritedFromYourAccountPlanChangeItInManage")}
      >
        <PlanLimitsPanel />
      </FieldRow>

      <BuildSettingsSection
        projectType={values.project_type}
        framework={values.framework}
        value={{
          root_dir: values.root_dir,
          install_command: values.install_command,
          build_command: values.build_command,
          output_dir: values.output_dir,
          node_version: values.node_version,
        }}
        onChange={(build) => {
          onChange(build)
        }}
      />

      <div className="space-y-4">
        <PreviewEnvironmentField
          enabled={values.preview_enabled}
          onChange={(preview_enabled) => {
            onChange({ preview_enabled })
          }}
        />

        <EnvVarEditor
          rows={envRows}
          onChange={onEnvChange}
          previewEnabled={values.preview_enabled}
          description="Available to the build on your GitHub Actions runner and masked in its log. Values are sealed at rest — after saving, only the names come back. Prod and Preview scope a variable; a preview-only one is withheld from production builds."
        />
        {errors.env && <p className="text-[11px] text-destructive">{errors.env}</p>}
      </div>

      <NetworkingSection
        vpcId={values.vpc_id}
        subnetId={values.subnet_id}
        vpcError={errors.vpc_id}
        onChange={(patch) => {
          onChange(patch)
        }}
      />
    </div>
  )
}
