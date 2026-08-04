import type { ReactNode } from "react"

import { Webhook } from "lucide-react"

import {
  Badge,
  EmptyState,
  Skeleton,
  StatusBadge,
  css,
  cx,
  fontMono,
  glass1,
  mix,
  timeAgo,
} from "@datadack/common-ui"

import { useFunctionTriggers } from "../../../data/queries"
import type { FunctionEntity, Trigger } from "../../../data/types"
import type { FunctionDetailLabels } from "../labels"
import { SectionShell } from "./SectionShell"

const loadingSkeleton = css`
  height: 96px;
  border-radius: 0.75rem;
`

const list = css`
  overflow: hidden;
  border-radius: 0.75rem;

  & > * + * {
    border-top: 1px solid ${mix("--border", 60)};
  }
`

const row = css`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
`

const typeBadge = css`
  font-family: ${fontMono};
  font-size: 11px;
`

const triggerName = css`
  font-family: ${fontMono};
  font-size: 13px;
  font-weight: 500;
`

const detail = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: ${fontMono};
  font-size: 11px;
  color: var(--muted-foreground);
`

const when = css`
  margin-left: auto;
  font-family: ${fontMono};
  font-size: 11px;
  color: var(--muted-foreground);
`

/** The one line that identifies what fires this trigger. */
function triggerDetail(trigger: Trigger): string | undefined {
  if (trigger.schedule) return trigger.schedule
  if (trigger.intervalSeconds != null) return `${String(trigger.intervalSeconds)}s`
  if (trigger.sourceArn) return trigger.sourceArn
  if (trigger.bucket) {
    return [trigger.bucket, trigger.prefix, trigger.suffix].filter(Boolean).join(" · ")
  }
  return undefined
}

export interface TriggersSectionProps {
  fn: FunctionEntity
  scope?: string
  labels: FunctionDetailLabels
  className?: string
}

/**
 * The event sources wired to this function. Read-only in v1 — trigger CRUD is
 * out of scope, so the section lists what exists and nothing more.
 */
export function TriggersSection({ fn, scope, labels, className }: Readonly<TriggersSectionProps>) {
  const { data, isLoading } = useFunctionTriggers(fn.name, scope)
  const config = labels.configuration

  let body: ReactNode
  if (isLoading) {
    body = <Skeleton className={loadingSkeleton} />
  } else if (!data || data.length === 0) {
    body = <EmptyState icon={Webhook} title={config.triggersEmpty} />
  } else {
    body = (
      <ul className={cx(glass1, list)}>
        {data.map((trigger) => {
          const line = triggerDetail(trigger)
          return (
            <li key={trigger.id} className={row}>
              <Badge variant="outline" className={typeBadge}>
                {trigger.type}
              </Badge>
              <span className={triggerName}>{trigger.name ?? trigger.id}</span>
              {line && <span className={detail}>{line}</span>}
              {trigger.state && <StatusBadge status={trigger.state} />}
              {trigger.createdAt && <span className={when}>{timeAgo(trigger.createdAt)}</span>}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <SectionShell title={config.nav.triggers} className={className}>
      {body}
    </SectionShell>
  )
}
