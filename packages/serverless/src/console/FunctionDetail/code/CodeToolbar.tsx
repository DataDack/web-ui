import { Maximize2, Minimize2, Rocket, Save, Undo2 } from "lucide-react"

import { Button, css, cx, fontMono, formatBytes, mix, timeAgo } from "@datadack/common-ui"

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

/* 12px lights on an 8px rhythm — macOS's own metrics, which is what makes the
   cluster read as a window chrome rather than three status dots. The extra 2px
   over a plain dot is also what lets a glyph fit inside the zoom light. */
const trafficLight = css`
  width: 12px;
  height: 12px;
  border-radius: 9999px;
`

const trafficLightRed = css`
  background: ${mix("--destructive", 60)};
`

const trafficLightYellow = css`
  background: ${mix("--status-warning", 60)};
`

/**
 * The zoom light — the real control, not decoration. Its siblings stay dim and
 * inert because close and minimise have no meaning for a panel that is always
 * open, but zoom does, and on a Mac that is the button people already reach for.
 *
 * The glyph is transparent at rest: a traffic light that always shows its icon
 * looks like a busy toolbar, while one that reveals it on approach looks like a
 * window. Colour, not opacity, so the dot itself never fades with it.
 */
const zoomLight = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: none;
  cursor: pointer;
  background: ${mix("--status-success", 60)};
  color: transparent;
  outline: none;
  transition:
    background 150ms cubic-bezier(0.4, 0, 0.2, 1),
    color 150ms cubic-bezier(0.4, 0, 0.2, 1);

  &:focus-visible {
    box-shadow: 0 0 0 3px ${mix("--ring", 50)};
  }

  &:active {
    background: ${mix("--status-success", 80)};
  }
`

const trafficLights = css`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;

  /* macOS reveals the glyphs when the cursor nears the cluster, not when it
     lands on one light — so hovering any of the three arms zoom. Keyboard users
     get the same reveal from focus, which is the only way they ever see it.

     Keyed on the data attribute rather than on the zoomLight class: cx() merges
     emotion classes into a fresh hash, so the element never carries zoomLight's
     own class name and a selector built from it would match nothing. */
  &:hover [data-zoom],
  & [data-zoom]:focus-visible {
    background: var(--status-success);
    color: color-mix(in oklab, var(--status-success) 30%, black);
  }
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
      {/* Not aria-hidden as a group any more: it holds a real button, and an
          aria-hidden ancestor would hide a focusable child from assistive tech
          while leaving it in the tab order. The two inert lights carry it. */}
      <div className={trafficLights}>
        <span className={cx(trafficLight, trafficLightRed)} aria-hidden />
        <span className={cx(trafficLight, trafficLightYellow)} aria-hidden />
        {/* Outside the canEdit gate: a package someone can only read is
            exactly the one worth opening wide to read. */}
        <button
          type="button"
          data-zoom
          className={cx(trafficLight, zoomLight)}
          onClick={onToggleFullscreen}
          title={fullscreen ? copy.exitFullscreen : copy.fullscreen}
          aria-label={fullscreen ? copy.exitFullscreen : copy.fullscreen}
          aria-pressed={fullscreen}
        >
          {fullscreen ? (
            <Minimize2 size={8} strokeWidth={3} />
          ) : (
            <Maximize2 size={8} strokeWidth={3} />
          )}
        </button>
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
      </div>
    </div>
  )
}
