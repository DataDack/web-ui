import { Clock, Code2, FolderOpen, Repeat, Timer, Webhook, type LucideIcon } from "lucide-react"

import { css, cx, fontMono, mix, StatusBadge } from "@datadack/common-ui"

import type { FunctionEntity, Trigger } from "../../../data/types"
import type { FunctionDetailLabels } from "../labels"

/** The glyph for a trigger type. Unknown types keep the generic hook. */
function iconFor(type: string): LucideIcon {
  switch (type) {
    case "s3":
      return FolderOpen
    case "cron":
      return Clock
    case "rate":
      return Repeat
    case "once":
      return Timer
    default:
      return Webhook
  }
}

const canvas = css`
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-radius: 0.75rem;
  border: 1px solid ${mix("--border", 55)};
  padding: 16px;

  /* Side by side only once there is room for a column of cards, an arrow and
     the function node; below that the arrow is meaningless and it stacks. */
  @media (min-width: 900px) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 64px minmax(0, 1fr);
    align-items: start;
    gap: 0;
  }
`

const columnHead = css`
  margin: 0 0 10px;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: ${mix("--muted-foreground", 75)};
`

const sources = css`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 8px;
`

const card = css`
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 8px;
  border: 1px solid ${mix("--border", 55)};
  border-radius: 0.5rem;
  background: transparent;
  padding: 10px 12px;
  text-align: left;
  cursor: pointer;

  &:hover {
    border-color: ${mix("--brand-gold", 45)};
  }
`

const cardSelected = css`
  border-color: var(--brand-gold);
  box-shadow: inset 2px 0 0 var(--brand-gold);
`

const cardHead = css`
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
`

const cardIcon = css`
  display: flex;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 0.375rem;
  border: 1px solid ${mix("--brand-gold", 25)};
  color: var(--brand-gold);
`

const cardCopy = css`
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
`

const cardName = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${fontMono};
  font-size: 13px;
  color: var(--foreground);
`

const cardSub = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${fontMono};
  font-size: 10.5px;
  color: var(--brand-gold);
`

const cardFacts = css`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  border-top: 1px solid ${mix("--border", 40)};
  padding-top: 8px;
`

const factKey = css`
  display: block;
  font-size: 9.5px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${mix("--muted-foreground", 70)};
`

const factValue = css`
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${fontMono};
  font-size: 11px;
  color: var(--foreground);
`

/* The wire. A centre line with a dot at the function end — enough to read as a
   flow without pretending to be a routed graph, which would need real edge
   geometry the data does not justify. */
const wire = css`
  display: none;

  @media (min-width: 900px) {
    position: relative;
    display: block;
    align-self: stretch;
    min-height: 48px;

    &::before {
      content: "";
      position: absolute;
      top: 50%;
      left: 0;
      right: 8px;
      border-top: 1px dashed ${mix("--border", 90)};
    }

    &::after {
      content: "";
      position: absolute;
      top: 50%;
      right: 4px;
      width: 7px;
      height: 7px;
      transform: translateY(-50%);
      border-radius: 9999px;
      background: var(--brand-gold);
    }
  }
`

const targetColumn = css`
  display: flex;
  min-width: 0;
  flex-direction: column;
`

const node = css`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  border: 1px solid ${mix("--brand-gold", 40)};
  border-radius: 0.625rem;
  padding: 18px 16px;
  text-align: center;
`

const nodeIcon = css`
  display: flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  border: 1px solid ${mix("--brand-gold", 30)};
  color: var(--brand-gold);
`

const nodeName = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
  font-family: ${fontMono};
  font-size: 15px;
  font-weight: 600;
  color: var(--foreground);
`

const nodeBadges = css`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-family: ${fontMono};
  font-size: 11px;
  color: var(--brand-gold);
`

const nodeFacts = css`
  display: grid;
  width: 100%;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  border-top: 1px solid ${mix("--border", 40)};
  padding-top: 10px;
  text-align: left;
`

export interface TriggerFlowProps {
  fn: FunctionEntity
  triggers: readonly Trigger[]
  labels: FunctionDetailLabels
  selectedId?: string
  onSelect: (trigger: Trigger) => void
  className?: string
}

/**
 * The triggers section's canvas: every source that can invoke this function on
 * the left, the function itself on the right, one wire between them.
 *
 * A list would say the same things, but not the one thing this says at a
 * glance — that these are inputs to a single target. Selecting a card drives
 * the payload and configuration panels below it.
 */
export function TriggerFlow({
  fn,
  triggers,
  labels,
  selectedId,
  onSelect,
  className,
}: Readonly<TriggerFlowProps>) {
  const copy = labels.configuration.triggers
  const flow = copy.flow

  return (
    <div className={cx(canvas, className)}>
      <div>
        <p className={columnHead}>{flow.sources(triggers.length)}</p>
        <div className={sources}>
          {triggers.map((trigger) => {
            const Icon = iconFor(trigger.type)
            const subtitle =
              trigger.type === "s3"
                ? (trigger.bucket ?? trigger.type)
                : (trigger.schedule ?? trigger.type)
            return (
              <button
                key={trigger.id}
                type="button"
                className={cx(card, trigger.id === selectedId && cardSelected)}
                aria-pressed={trigger.id === selectedId}
                onClick={() => {
                  onSelect(trigger)
                }}
              >
                <span className={cardHead}>
                  <span className={cardIcon} aria-hidden>
                    <Icon size={13} />
                  </span>
                  <span className={cardCopy}>
                    <span className={cardName}>{trigger.name ?? trigger.id}</span>
                    <span className={cardSub}>{subtitle}</span>
                  </span>
                </span>
                <span className={cardFacts}>
                  <span>
                    <span className={factKey}>{flow.lastTriggered}</span>
                    <span className={factValue}>
                      {trigger.lastFireAt ? new Date(trigger.lastFireAt).toLocaleString() : "—"}
                    </span>
                  </span>
                  <span>
                    <span className={factKey}>{flow.nextRun}</span>
                    <span className={factValue}>
                      {trigger.nextFireAt ? new Date(trigger.nextFireAt).toLocaleString() : "—"}
                    </span>
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className={wire} aria-hidden />

      <div className={targetColumn}>
        <p className={columnHead}>{flow.target}</p>
        <div className={node}>
          <span className={nodeIcon} aria-hidden>
            <Code2 size={16} />
          </span>
          <span className={nodeName}>{fn.name}</span>
          <span className={nodeBadges}>
            {fn.version?.version && <span>v{fn.version.version}</span>}
            <StatusBadge status={fn.state} pulse={fn.state.toLowerCase() === "active"} />
          </span>
          <span className={nodeFacts}>
            <span>
              <span className={factKey}>{flow.memory}</span>
              <span className={factValue}>
                {fn.memorySize != null ? `${String(fn.memorySize)} MB` : "—"}
              </span>
            </span>
            <span>
              <span className={factKey}>{flow.timeout}</span>
              <span className={factValue}>
                {fn.timeout != null ? `${String(fn.timeout)}s` : "—"}
              </span>
            </span>
          </span>
        </div>
      </div>
    </div>
  )
}
