import { Skeleton } from "@DataDack/common-ui"

import { OverrideField } from "@/components/console"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@datadack/common-ui"

import { RootDirectoryInput } from "./RootDirectoryInput"
import { useBuildDefaults } from "../managed-apps.hooks"
import type { ProjectType } from "../managed-apps.types"

export interface BuildSettingsValue {
  root_dir: string
  install_command: string
  build_command: string
  output_dir: string
}

interface BuildSettingsSectionProps {
  projectType: ProjectType
  value: BuildSettingsValue
  onChange: (value: BuildSettingsValue) => void
  /** Open on first render — the settings tab wants this, the composer does not. */
  defaultOpen?: boolean
}

/**
 * Build and output settings, collapsed behind one disclosure.
 *
 * Every field inherits until it is explicitly taken over, and the inherited
 * value shown is the one the server actually serves from
 * GET /projects/defaults — not a copy maintained here. That is the whole reason
 * the endpoint exists: the defaults used to live inside the build runner where
 * the console could not read them, so the placeholders drifted from the
 * commands that ran.
 */
export function BuildSettingsSection({
  projectType,
  value,
  onChange,
  defaultOpen = false,
}: Readonly<BuildSettingsSectionProps>) {
  const { data: defaults, isLoading } = useBuildDefaults(projectType)

  const set = (patch: Partial<BuildSettingsValue>) => {
    onChange({ ...value, ...patch })
  }

  const overriddenCount = [
    value.root_dir,
    value.install_command,
    value.build_command,
    value.output_dir,
  ].filter((field) => field !== "").length

  return (
    <Accordion type="single" collapsible defaultValue={defaultOpen ? "build" : undefined}>
      <AccordionItem value="build" className="border-border/60">
        <AccordionTrigger className="text-[13px] font-semibold hover:no-underline">
          <span className="flex items-center gap-2">
            Build and output settings
            <span className="text-[11px] font-normal text-muted-foreground">
              {overriddenCount === 0 ? "using defaults" : `${String(overriddenCount)} overridden`}
            </span>
          </span>
        </AccordionTrigger>
        <AccordionContent className="space-y-5 pt-1">
          <RootDirectoryInput
            value={value.root_dir}
            onChange={(root_dir) => {
              set({ root_dir })
            }}
          />

          {isLoading || !defaults ? (
            <div className="space-y-3">
              <Skeleton className="h-16 rounded-lg" />
              <Skeleton className="h-16 rounded-lg" />
            </div>
          ) : (
            <>
              <OverrideField
                id="install-command"
                label="Install command"
                inheritedValue={defaults.install_command}
                value={value.install_command}
                onChange={(install_command) => {
                  set({ install_command })
                }}
              />
              <OverrideField
                id="build-command"
                label="Build command"
                inheritedValue={defaults.build_command}
                value={value.build_command}
                editable={defaults.build_editable}
                onChange={(build_command) => {
                  set({ build_command })
                }}
              />
              <OverrideField
                id="output-dir"
                label="Output directory"
                inheritedValue={defaults.output_dir}
                value={value.output_dir}
                editable={defaults.output_editable}
                lockedReason={
                  defaults.output_editable
                    ? undefined
                    : "OpenNext chooses where its deployable output lands, so this cannot be changed."
                }
                onChange={(output_dir) => {
                  set({ output_dir })
                }}
              />
            </>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
