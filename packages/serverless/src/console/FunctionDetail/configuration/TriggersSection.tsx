import { useState, type ReactNode } from "react"

import { Trash2, Webhook } from "lucide-react"
import { toast } from "sonner"

import {
  Badge,
  Button,
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

import { useDeleteTrigger, useFunctionTriggers, usePutTrigger } from "../../../data/queries"
import { useServerlessContext } from "../../../data/transport"
import type { FunctionEntity, Trigger } from "../../../data/types"
import { ConfirmDialog } from "../../ConfirmDialog"
import { errorMessage } from "../errorMessage"
import type { FunctionDetailLabels } from "../labels"
import { summarizeTrigger, toPutTriggerInput, type ScheduleDraft } from "./schedule"
import { summaryText } from "./scheduleText"
import { SectionShell } from "./SectionShell"
import { TriggerDialog } from "./TriggerDialog"

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

/* The schedule in words. Not monospaced — it is a sentence, not an expression,
   and the raw form stays available in the title attribute for anyone who wants
   to see exactly what was stored. */
const detail = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--muted-foreground);
`

const when = css`
  margin-left: auto;
  font-family: ${fontMono};
  font-size: 11px;
  color: var(--muted-foreground);
`

const removeButton = css`
  color: var(--muted-foreground);

  &:hover {
    color: var(--destructive);
  }
`

const emptyHint = css`
  margin: 8px 0 0;
  text-align: center;
  font-size: 13px;
  color: var(--muted-foreground);
`

/**
 * How long until a fire time, as a bare duration ("4m", "2h", "3d"), or null
 * when there is no live one to show.
 *
 * `timeAgo` from the kit cannot do this — it clamps to the past, so a schedule
 * four minutes out renders "0s ago". A zero `time.Time` is filtered here too:
 * Go's `omitempty` does not omit a struct, so an s3 trigger and a completed
 * `@once` both arrive carrying "0001-01-01T00:00:00Z".
 */
function timeUntilFire(iso?: string): { due: boolean; relative: string } | null {
  if (!iso || iso.startsWith("0001-")) return null
  const target = new Date(iso).getTime()
  if (Number.isNaN(target)) return null

  const seconds = Math.floor((target - Date.now()) / 1000)
  if (seconds <= 0) return { due: true, relative: "" }
  if (seconds < 60) return { due: false, relative: `${String(seconds)}s` }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return { due: false, relative: `${String(minutes)}m` }
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return { due: false, relative: `${String(hours)}h` }
  return { due: false, relative: `${String(Math.floor(hours / 24))}d` }
}

/** The raw wire value, for the row's tooltip. */
function rawSchedule(trigger: Trigger): string | undefined {
  if (trigger.intervalSeconds != null && trigger.intervalSeconds > 0) {
    return `${String(trigger.intervalSeconds)}s`
  }
  return trigger.schedule
}

/** The one line that identifies what fires a non-scheduled trigger. */
function sourceDetail(trigger: Trigger): string | undefined {
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
 * The event sources wired to this function.
 *
 * Add and remove, never edit: the control plane's PutTrigger mints a new id on
 * every call rather than upserting, so an "edit" would quietly leave the old
 * schedule running alongside the new one.
 *
 * Only `cron` and `rate` can be created here, because they are the only types
 * the platform can actually fire on its own. An `s3` trigger needs something
 * outside the console posting to /v1/events/s3, and `queue`/`stream` are
 * refused by the control plane outright — nothing polls an event source yet.
 * Rows of other types still list (showing their bucket or ARN in place of a
 * schedule) and can still be removed; they just cannot be created here.
 */
export function TriggersSection({ fn, scope, labels, className }: Readonly<TriggersSectionProps>) {
  const { capabilities } = useServerlessContext()
  const { data, isLoading } = useFunctionTriggers(fn.name, scope)
  const add = usePutTrigger(fn.name, scope)
  const remove = useDeleteTrigger(fn.name, scope)

  const [adding, setAdding] = useState(false)
  // The trigger pending removal, or null. Holding the row (not a boolean) is
  // what lets the confirm name what it is about to unschedule.
  const [removing, setRemoving] = useState<Trigger | null>(null)

  const config = labels.configuration
  const copy = config.triggers
  const writable = capabilities.triggerWrite

  const submit = (draft: ScheduleDraft, name: string) => {
    const input = toPutTriggerInput(fn.name, draft, name)
    // The dialog disables its submit while the draft is invalid, so a null here
    // would be a bug rather than user input — bail rather than post a
    // half-built schedule.
    if (!input) return
    add.mutate(input, {
      onSuccess: (created) => {
        toast.success(copy.created(created.name ?? created.id))
        setAdding(false)
      },
      onError: (error) => {
        toast.error(errorMessage(error, copy.createFailed))
      },
    })
  }

  const confirmRemove = () => {
    if (!removing) return
    const target = removing
    remove.mutate(target.id, {
      onSuccess: () => {
        toast.success(copy.deleted(target.name ?? target.id))
        setRemoving(null)
      },
      onError: (error) => {
        toast.error(errorMessage(error, labels.errors.deleteFailed))
      },
    })
  }

  let body: ReactNode
  if (isLoading) {
    body = <Skeleton className={loadingSkeleton} />
  } else if (!data || data.length === 0) {
    body = (
      <>
        <EmptyState icon={Webhook} title={config.triggersEmpty} />
        {writable && <p className={emptyHint}>{copy.emptyHint}</p>}
      </>
    )
  } else {
    body = (
      <ul className={cx(glass1, list)}>
        {data.map((trigger) => {
          const summary = summarizeTrigger(trigger)
          const line = summary ? summaryText(summary, copy.summary) : sourceDetail(trigger)
          const fire = timeUntilFire(trigger.nextFireAt)
          let next: string | undefined
          if (fire) next = fire.due ? copy.nextRunDue : copy.nextRunIn(fire.relative)
          return (
            <li key={trigger.id} className={row}>
              <Badge variant="outline" className={typeBadge}>
                {trigger.type}
              </Badge>
              <span className={triggerName}>{trigger.name ?? trigger.id}</span>
              {line && (
                <span className={detail} title={rawSchedule(trigger)}>
                  {line}
                </span>
              )}
              {trigger.state && <StatusBadge status={trigger.state} />}
              <span className={when}>
                {next ?? (trigger.createdAt ? timeAgo(trigger.createdAt) : "")}
              </span>
              {writable && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={removeButton}
                  aria-label={`${copy.delete} ${trigger.name ?? trigger.id}`}
                  onClick={() => {
                    setRemoving(trigger)
                  }}
                >
                  <Trash2 size={14} />
                </Button>
              )}
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <SectionShell
      title={config.nav.triggers}
      className={className}
      actions={
        writable && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAdding(true)
            }}
          >
            {copy.add}
          </Button>
        )
      }
    >
      {body}

      {writable && (
        <TriggerDialog
          open={adding}
          functionName={fn.name}
          labels={labels}
          saving={add.isPending}
          onOpenChange={setAdding}
          onSubmit={submit}
        />
      )}

      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open) setRemoving(null)
        }}
        title={copy.deleteTitle(removing?.name ?? removing?.id ?? "")}
        description={copy.deleteDescription}
        confirmLabel={copy.deleteConfirm}
        cancelLabel={copy.cancel}
        loading={remove.isPending}
        onConfirm={confirmRemove}
      />
    </SectionShell>
  )
}
