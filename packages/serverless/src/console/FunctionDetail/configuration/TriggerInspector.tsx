import { Trash2 } from "lucide-react"

import { Button, CopyButton, css, cx, fontMono, mix } from "@datadack/common-ui"

import type { FunctionDetailLabels } from "../labels"
import { samplePayload } from "./triggerPayload"
import type { Trigger } from "../../../data/types"

const grid = css`
  display: grid;
  gap: 12px;
  grid-template-columns: minmax(0, 1fr);

  @media (min-width: 900px) {
    grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr);
  }
`

const panel = css`
  display: flex;
  min-width: 0;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid ${mix("--border", 55)};
  border-radius: 0.625rem;
`

const panelHead = css`
  display: flex;
  min-height: 34px;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid ${mix("--border", 45)};
  padding: 6px 12px;
`

const panelTitle = css`
  flex: 1;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${mix("--muted-foreground", 75)};
`

const sourceChip = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  border-radius: 0.25rem;
  padding: 1px 7px;
  background: ${mix("--brand-gold", 10)};
  font-family: ${fontMono};
  font-size: 10.5px;
  color: var(--brand-gold);
`

const payloadPre = css`
  margin: 0;
  max-height: 300px;
  overflow: auto;
  padding: 10px 12px;
  font-family: ${fontMono};
  font-size: 11.5px;
  line-height: 1.65;
  white-space: pre;
  color: var(--foreground);
`

const fieldList = css`
  display: flex;
  flex-direction: column;
  padding: 4px 0;
`

const field = css`
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 7px 12px;
`

const fieldKey = css`
  font-size: 9.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${mix("--muted-foreground", 70)};
`

const fieldValue = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${fontMono};
  font-size: 12px;
  color: var(--foreground);
`

const emptyValue = css`
  color: ${mix("--muted-foreground", 70)};
`

const removeButton = css`
  height: 24px;
  gap: 4px;
  padding: 0 8px;
  font-size: 11px;
`

const emptyNote = css`
  margin: 0;
  padding: 16px 12px;
  font-size: 12px;
  color: var(--muted-foreground);
`

export interface TriggerInspectorProps {
  /** The selected source; absent renders the prompt to pick one. */
  trigger?: Trigger
  functionName: string
  labels: FunctionDetailLabels
  /** Renders Remove on the configuration panel. Omit for a read-only console. */
  onRemove?: (trigger: Trigger) => void
  className?: string
}

/**
 * What the selected trigger sends, and what it was configured with.
 *
 * The payload is generated rather than recorded — see `samplePayload`. It is
 * here because "what will my handler actually receive" is the question a
 * trigger raises and nothing else on the page answers.
 */
export function TriggerInspector({
  trigger,
  functionName,
  labels,
  onRemove,
  className,
}: Readonly<TriggerInspectorProps>) {
  const flow = labels.configuration.triggers.flow

  if (!trigger) {
    return (
      <div className={cx(grid, className)}>
        <div className={panel}>
          <div className={panelHead}>
            <span className={panelTitle}>{flow.payloadPreview}</span>
          </div>
          <p className={emptyNote}>{flow.selectHint}</p>
        </div>
        <div className={panel}>
          <div className={panelHead}>
            <span className={panelTitle}>{flow.configuration}</span>
          </div>
          <p className={emptyNote}>{flow.selectHint}</p>
        </div>
      </div>
    )
  }

  const payload = samplePayload(trigger, functionName)

  // Only the keys this trigger actually carries: an s3 trigger has no schedule
  // and a cron has no bucket, and rendering both as "—" pads the panel with
  // fields that could never apply to it.
  const fields: { key: string; value?: string }[] = [
    { key: flow.fields.type, value: trigger.type },
    { key: flow.fields.name, value: trigger.name },
    { key: flow.fields.bucket, value: trigger.bucket },
    { key: flow.fields.prefix, value: trigger.prefix },
    { key: flow.fields.suffix, value: trigger.suffix },
    { key: flow.fields.schedule, value: trigger.schedule },
    {
      key: flow.fields.interval,
      value: trigger.intervalSeconds ? `${String(trigger.intervalSeconds)}s` : undefined,
    },
    { key: flow.fields.qualifier, value: trigger.qualifier },
    { key: flow.fields.state, value: trigger.state },
  ].filter((entry) => entry.value !== undefined && entry.value !== "")

  return (
    <div className={cx(grid, className)}>
      <div className={panel}>
        <div className={panelHead}>
          <span className={panelTitle}>{flow.payloadPreview}</span>
          <span className={sourceChip}>{trigger.name ?? trigger.id}</span>
          <CopyButton value={payload} label={flow.copyPayload} mono={false} />
        </div>
        <pre className={payloadPre}>{payload}</pre>
      </div>

      <div className={panel}>
        <div className={panelHead}>
          <span className={panelTitle}>{flow.configuration}</span>
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              className={removeButton}
              onClick={() => {
                onRemove(trigger)
              }}
            >
              <Trash2 size={12} />
              {labels.configuration.triggers.delete}
            </Button>
          )}
        </div>
        <div className={fieldList}>
          {fields.map((entry) => (
            <div className={field} key={entry.key}>
              <span className={fieldKey}>{entry.key}</span>
              <span className={fieldValue}>{entry.value}</span>
            </div>
          ))}
          <div className={field}>
            <span className={fieldKey}>{flow.fields.id}</span>
            <span className={cx(fieldValue, emptyValue)}>{trigger.id}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
