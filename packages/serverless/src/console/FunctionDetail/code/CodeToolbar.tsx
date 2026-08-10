import { Maximize2, Minimize2, Rocket, Save, Undo2 } from "lucide-react"

import {
  Button,
  css,
  cx,
  fontMono,
  formatBytes,
  media,
  mix,
  timeAgo,
} from "@datadack/common-ui"

import type { FunctionCode } from "../../../data/types"
import type { FunctionDetailLabels } from "../labels"

const bar = css`
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  border-bottom: 1px solid ${mix("--border", 60)};
  padding: 8px 12px;
`

const trafficLights = css`
  display: none;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;

  ${media.sm} {
    display: flex;
  }
`

const trafficLight = css`
  width: 10px;
  height: 10px;
  border-radius: 9999px;
`

const trafficLightRed = css`
  background: ${mix("--destructive", 60)};
`

const trafficLightYellow = css`
  background: ${mix("--status-warning", 60)};
`

const trafficLightGreen = css`
  background: ${mix("--status-success", 60)};
`

const meta = css`
  color: var(--muted-foreground);
  font-family: ${fontMono};
  font-size: 11px;
  white-space: nowrap;
`

const draftChip = css`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 9999px;
  padding: 2px 10px;
  font-family: ${fontMono};
  font-size: 10.5px;
  background: var(--brand-gold-soft);
  color: var(--brand-gold);
  box-shadow: inset 0 0 0 1px ${mix("--brand-gold", 35)};
`

const unsavedNote = css`
  font-size: 11px;
  color: var(--muted-foreground);
`

const spacer = css`
  flex: 1;
`

const actions = css`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
`

export interface CodeToolbarProps {
  code: FunctionCode
  labels: FunctionDetailLabels
  /** How many open buffers differ from what is staged in the draft. */
  unsavedCount: number
  canEdit: boolean
  saving: boolean
  deploying: boolean
  discarding: boolean
  fullscreen: boolean
  onSave: () => void
  onDiscard: () => void
  onDeploy: () => void
  onToggleFullscreen: () => void
}

/**
 * The editor's title bar: what is being edited, whether a draft is staged, and
 * the three actions that move code between the buffer, the draft and a
 * deployed version.
 *
 * Deploy stays enabled whenever a draft or an unsaved buffer exists — it saves
 * first, then publishes — because "save then deploy" as two required clicks is
 * the step people forget and then wonder why nothing changed.
 */
export function CodeToolbar({
  code,
  labels,
  unsavedCount,
  canEdit,
  saving,
  deploying,
  discarding,
  fullscreen,
  onSave,
  onDiscard,
  onDeploy,
  onToggleFullscreen,
}: Readonly<CodeToolbarProps>) {
  const copy = labels.code.toolbar
  const metaLine = [
    code.runtime ?? code.packageType,
    formatBytes(code.sizeBytes),
    code.version ? `v${code.version}` : undefined,
  ]
    .filter(Boolean)
    .join(" · ")

  const hasDraft = code.draft
  const busy = saving || deploying || discarding

  return (
    <div className={bar}>
      <div className={trafficLights} aria-hidden>
        <span className={cx(trafficLight, trafficLightRed)} />
        <span className={cx(trafficLight, trafficLightYellow)} />
        <span className={cx(trafficLight, trafficLightGreen)} />
      </div>

      <span className={meta}>{metaLine}</span>

      {hasDraft && (
        <span className={draftChip}>
          {copy.draft}
          {code.draftUpdatedAt && ` · ${copy.draftSince(timeAgo(code.draftUpdatedAt))}`}
        </span>
      )}
      {unsavedCount > 0 && <span className={unsavedNote}>{copy.unsaved(unsavedCount)}</span>}
      {!canEdit && <span className={unsavedNote}>{copy.readOnly}</span>}

      <span className={spacer} />

      <div className={actions}>
        {canEdit && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={onSave}
              disabled={busy || unsavedCount === 0}
              loading={saving}
            >
              <Save size={14} />
              {saving ? copy.saving : copy.save}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDiscard}
              disabled={busy || (!hasDraft && unsavedCount === 0)}
            >
              <Undo2 size={14} />
              {copy.discard}
            </Button>
            <Button
              variant="gold"
              size="sm"
              onClick={onDeploy}
              disabled={busy || (!hasDraft && unsavedCount === 0)}
              loading={deploying}
            >
              <Rocket size={14} />
              {deploying ? copy.deploying : copy.deploy}
            </Button>
          </>
        )}
        {/* Outside the canEdit gate: a package someone can only read is
            exactly the one worth opening wide to read. */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggleFullscreen}
          title={fullscreen ? copy.exitFullscreen : copy.fullscreen}
          aria-label={fullscreen ? copy.exitFullscreen : copy.fullscreen}
          aria-pressed={fullscreen}
        >
          {fullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </Button>
      </div>
    </div>
  )
}
