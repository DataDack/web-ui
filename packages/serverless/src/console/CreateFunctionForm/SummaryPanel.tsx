import { Boxes, Cpu, HardDrive, Info, Timer } from "lucide-react"

import { css, cx, fontMono, glass1, mix } from "@datadack/common-ui"

import type { PackageType, RuntimeInfo, StarterTemplate } from "../../data/types"
import { RuntimeIcon } from "../RuntimeIcon"

const panel = css`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const box = css`
  border-radius: 0.75rem;
  border: 1px solid ${mix("--border", 60)};
  padding: 16px;
`

const heading = css`
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 600;
`

const rows = css`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const row = css`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
`

const rowLabel = css`
  flex-shrink: 0;
  font-size: 11px;
  color: var(--muted-foreground);
`

const rowValue = css`
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${fontMono};
  font-size: 11px;
`

const statGrid = css`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
`

const stat = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  border-radius: 0.5rem;
  border: 1px solid ${mix("--border", 60)};
  padding: 10px 8px;
`

const statIcon = css`
  color: var(--muted-foreground);
`

const statValue = css`
  font-family: ${fontMono};
  font-size: 12px;
  font-weight: 600;
`

const statLabel = css`
  font-size: 10px;
  color: var(--muted-foreground);
`

const note = css`
  display: flex;
  align-items: flex-start;
  gap: 8px;
  border-radius: 0.5rem;
  border: 1px solid ${mix("--border", 60)};
  padding: 10px 12px;
  font-size: 11px;
  color: var(--muted-foreground);
`

const noteDanger = css`
  border-color: ${mix("--destructive", 30)};
  background: ${mix("--destructive", 5)};
`

const fileList = css`
  margin: 0;
  padding: 0;
  list-style: none;

  & > li {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: ${fontMono};
    font-size: 11px;
    color: var(--muted-foreground);
  }
  & > li + li {
    margin-top: 4px;
  }
`

const fileIcon = css`
  width: 12px;
  height: 12px;
  flex-shrink: 0;
`

const empty = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px 12px;
  text-align: center;
  font-size: 12px;
  color: var(--muted-foreground);
`

function Row({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className={row}>
      <span className={rowLabel}>{label}</span>
      <span className={rowValue}>{value}</span>
    </div>
  )
}

export interface SummaryPanelProps {
  name: string
  packageType: PackageType
  packageLabel: string
  artifactKey?: string
  imageUri: string
  runtime: RuntimeInfo | undefined
  handler: string
  architecture: string
  memorySize: number
  timeout: number
  envCount: number
  template: StarterTemplate | null
}

/**
 * Live picture of the function being described, beside the form rather than
 * after it — so "128 MB" registers as a choice while the field is still on
 * screen.
 *
 * Deliberately has no submit button: the form's own footer owns that, and a
 * second submit path is a way to submit from a state the form has not checked.
 */
export function SummaryPanel({
  name,
  packageType,
  packageLabel,
  artifactKey,
  imageUri,
  runtime,
  handler,
  architecture,
  memorySize,
  timeout,
  envCount,
  template,
}: Readonly<SummaryPanelProps>) {
  // An image carries its own entrypoint, so runtime/handler are not part of
  // what gets created and showing them would describe a different function.
  const runtimeApplies = packageType !== "image"

  return (
    <div className={panel}>
      <div className={cx(glass1, box)}>
        <h4 className={heading}>Summary</h4>
        {packageType === "blank" && !runtime ? (
          <div className={empty}>
            <Boxes size={20} />
            <p>Pick a runtime to preview the function here.</p>
          </div>
        ) : (
          <div className={rows}>
            <Row label="Name" value={name || "—"} />
            <Row label="Package" value={packageLabel} />
            {packageType === "zip" && <Row label="Artifact" value={artifactKey ?? "not uploaded"} />}
            {packageType === "image" && <Row label="Image" value={imageUri || "—"} />}
            {runtimeApplies && (
              <>
                <Row label="Runtime" value={runtime?.name ?? "—"} />
                <Row label="Handler" value={handler || "—"} />
                <Row label="Architecture" value={architecture} />
              </>
            )}
            <Row
              label="Env"
              value={envCount === 1 ? "1 variable" : `${String(envCount)} variables`}
            />
          </div>
        )}
      </div>

      <div className={statGrid}>
        <div className={stat}>
          <HardDrive size={14} className={statIcon} />
          <span className={statValue}>{memorySize}</span>
          <span className={statLabel}>MB</span>
        </div>
        <div className={stat}>
          <Timer size={14} className={statIcon} />
          <span className={statValue}>{timeout}s</span>
          <span className={statLabel}>timeout</span>
        </div>
        <div className={stat}>
          <Cpu size={14} className={statIcon} />
          <span className={statValue}>{runtimeApplies ? architecture : "image"}</span>
          <span className={statLabel}>arch</span>
        </div>
      </div>

      {/* The starter files are the most concrete thing about a template
          function — worth showing before it exists, not after. */}
      {packageType === "blank" && runtime && template && (
        <div className={cx(glass1, box)}>
          <h4 className={heading}>Starter files</h4>
          <ul className={fileList}>
            {template.files.map((file) => (
              <li key={file.path}>
                <RuntimeIcon family={runtime.family} className={fileIcon} />
                {file.path}
              </li>
            ))}
          </ul>
        </div>
      )}

      {runtimeApplies && runtime && (
        <div className={cx(note, runtime.deprecatedForCreate && noteDanger)}>
          <Info size={14} style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ margin: 0 }}>
            {runtime.deprecatedForCreate
              ? `${runtime.name} can no longer be used for a new function.`
              : `${runtime.name} runs on ${runtime.osRelease} and supports ${runtime.architectures.join(" and ")}.`}
          </p>
        </div>
      )}
    </div>
  )
}
