import {
  Code2,
  Maximize2,
  Minimize2,
  PanelBottom,
  PanelRight,
  Rocket,
  Save,
  Undo2,
} from "lucide-react"

import { Button, css, cx, fontMono, formatBytes, mix, timeAgo } from "@datadack/common-ui"

import type { FunctionCode } from "../../../data/types"
import type { FunctionDetailLabels } from "../labels"

const bar = css`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  border-bottom: 1px solid ${mix("--border", 60)};
  padding: 10px 12px;
  background: var(--glass-1-bg);
`

const workspaceMark = css`
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
`

const workspaceIcon = css`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  border-radius: 0.375rem;
  color: var(--brand-gold);
  background: ${mix("--brand-gold", 9)};
  box-shadow: inset 0 0 0 1px ${mix("--brand-gold", 25)};
`

const workspaceIconGlyph = css`
  width: 14px;
  height: 14px;
`

const workspaceCopy = css`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
`

const workspaceName = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${fontMono};
  font-size: 12px;
  font-weight: 600;
  color: var(--foreground);
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

const iconButton = css`
  width: 30px;
  height: 30px;
`

/* The panel toggles read as pressed rather than as three identical ghosts. */
const iconButtonOn = css`
  color: var(--brand-gold);
  background: ${mix("--brand-gold", 10)};
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
  /** Right-hand deployment panel and bottom output panel, each open or not. */
  railOpen: boolean
  dockOpen: boolean
  onSave: () => void
  onDiscard: () => void
  onDeploy: () => void
  onToggleFullscreen: () => void
  onToggleRail: () => void
  onToggleDock: () => void
}

/**
 * The editor's title bar: what is being edited, whether a draft is staged, and
 * the three actions that move code between the buffer, the draft and a
 * deployed version. Zoom is not among them — it lives in the traffic lights,
 * where a Mac window puts it.
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
  railOpen,
  dockOpen,
  onSave,
  onDiscard,
  onDeploy,
  onToggleFullscreen,
  onToggleRail,
  onToggleDock,
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
      <div className={workspaceMark}>
        <span className={workspaceIcon} aria-hidden>
          <Code2 className={workspaceIconGlyph} />
        </span>
        <span className={workspaceCopy}>
          <span className={workspaceName}>{code.functionName}</span>
          <span className={meta}>{metaLine}</span>
        </span>
      </div>

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
        <Button
          variant="ghost"
          size="icon"
          className={cx(iconButton, dockOpen && iconButtonOn)}
          onClick={onToggleDock}
          title={dockOpen ? copy.hideDock : copy.showDock}
          aria-label={dockOpen ? copy.hideDock : copy.showDock}
          aria-pressed={dockOpen}
        >
          <PanelBottom size={14} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cx(iconButton, railOpen && iconButtonOn)}
          onClick={onToggleRail}
          title={railOpen ? copy.hideRail : copy.showRail}
          aria-label={railOpen ? copy.hideRail : copy.showRail}
          aria-pressed={railOpen}
        >
          <PanelRight size={14} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={iconButton}
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
