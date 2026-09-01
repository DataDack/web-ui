import { Badge, cn } from "@datadack/common-ui"
import { useTranslation } from "react-i18next"

import { FieldRow, SegmentedControl, type SegmentedOption } from "@/components/console"

interface BuildEnvironmentFieldProps {
  /** Every major the platform accepts, served by GET /projects/defaults. */
  versions: string[]
  /** What an empty value inherits — the platform default, not a guess. */
  inheritedVersion: string
  /**
   * The image the runtime container is built FROM, already resolved by the
   * server for this project type and the chosen version.
   */
  runtimeImage: string
  value: string
  onChange: (version: string) => void
}

/**
 * The build and runtime environment: one Node major, used twice.
 *
 * It is a segmented control rather than a text input or a searchable select
 * because the answer is one of three short values — the version is interpolated
 * into `actions/setup-node` and into an image tag, so a free-text field could
 * only produce a build that fails on a tag that was never published.
 *
 * Choosing the inherited version stores EMPTY, not that number. Every field in
 * this section works that way: pinning today's default would mean a project
 * created this week never sees the platform move, and there would be no way to
 * tell "I want 22" from "I never had an opinion".
 *
 * The runtime image is displayed, not derived. Whether the choice reaches the
 * runtime at all is a platform rule — an OpenNext bundle is a Node server on
 * this major, a static build is served by Caddy whatever compiled it — and
 * re-deciding that here is how the console starts describing a container the
 * builder is not building.
 */
export function BuildEnvironmentField({
  versions,
  inheritedVersion,
  runtimeImage,
  value,
  onChange,
}: Readonly<BuildEnvironmentFieldProps>) {
  const { t } = useTranslation()
  const chosen = value || inheritedVersion
  const overridden = value !== ""

  // A version the platform has since retired can still be on an older project.
  // It is offered back rather than dropped: a segmented control with nothing
  // selected reads as "no environment", and the first arrow key would silently
  // move the project onto a major nobody chose.
  const offered = versions.includes(chosen) ? versions : [chosen, ...versions]

  const options: SegmentedOption<string>[] = offered.map((version) => ({
    value: version,
    label: `Node ${version}${versions.includes(version) ? "" : " (retired)"}`,
  }))

  return (
    <FieldRow
      label={t("managedApps.buildSettingsSection.buildAndRuntimeEnvironment")}
      description={
        <>
          Node {chosen} runs the install and build commands. The container that serves the result is
          built from <code className="font-mono">{runtimeImage}</code>.
        </>
      }
      aside={
        <Badge
          variant="outline"
          className={cn(
            "font-mono text-[10px] tracking-wide uppercase",
            overridden ? "border-status-info/30 text-status-info" : "text-muted-foreground",
          )}
        >
          {overridden ? "Overridden" : "Default"}
        </Badge>
      }
    >
      <SegmentedControl
        ariaLabel="Build and runtime environment"
        showLabels
        value={chosen}
        options={options}
        onChange={(version) => {
          // Back to inheritance when the platform default is picked again.
          onChange(version === inheritedVersion ? "" : version)
        }}
      />
    </FieldRow>
  )
}
