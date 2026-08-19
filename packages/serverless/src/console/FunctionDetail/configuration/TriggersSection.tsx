import { useState, type ReactNode } from "react"

import { Webhook, Workflow } from "lucide-react"
import { toast } from "sonner"

import { Button, EmptyState, Skeleton, css } from "@datadack/common-ui"

import { useDeleteTrigger, useFunctionTriggers, usePutTrigger } from "../../../data/queries"
import { useServerlessContext } from "../../../data/transport"
import type { FunctionEntity, Trigger } from "../../../data/types"
import { ConfirmDialog } from "../../ConfirmDialog"
import { errorMessage } from "../errorMessage"
import type { FunctionDetailLabels } from "../labels"
import { toPutTriggerInput, type ScheduleDraft } from "./schedule"
import { SectionShell } from "./SectionShell"
import { TriggerDialog } from "./TriggerDialog"
import { TriggerFlow } from "./TriggerFlow"
import { TriggerInspector } from "./TriggerInspector"

const flowStack = css`
  display: flex;
  flex-direction: column;
  gap: 12px;
`

const loadingSkeleton = css`
  height: 96px;
  border-radius: 0.75rem;
`

/* The schedule in words. Not monospaced — it is a sentence, not an expression,
   and the raw form stays available in the title attribute for anyone who wants
   to see exactly what was stored. */

const emptyHint = css`
  margin: 8px 0 0;
  text-align: center;
  font-size: 13px;
  color: var(--muted-foreground);
`

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
  // Which source the two panels below the canvas are describing. Undefined
  // until the first render with data, when the first trigger takes it.
  const [selectedId, setSelectedId] = useState<string>()
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

  const triggers = data ?? []
  // A selection that no longer exists (the trigger was just removed) falls back
  // to the first source rather than blanking the panels.
  const selected = triggers.find((trigger) => trigger.id === selectedId) ?? triggers[0]

  let body: ReactNode
  if (isLoading) {
    body = <Skeleton className={loadingSkeleton} />
  } else if (triggers.length === 0) {
    body = (
      <>
        <EmptyState icon={Webhook} title={config.triggersEmpty} />
        {writable && <p className={emptyHint}>{copy.emptyHint}</p>}
      </>
    )
  } else {
    body = (
      <div className={flowStack}>
        <TriggerFlow
          fn={fn}
          triggers={triggers}
          labels={labels}
          selectedId={selected?.id}
          onSelect={(trigger) => {
            setSelectedId(trigger.id)
          }}
        />
        <TriggerInspector
          trigger={selected}
          functionName={fn.name}
          labels={labels}
          onRemove={writable ? setRemoving : undefined}
        />
      </div>
    )
  }

  return (
    <SectionShell
      title={config.nav.triggers}
      icon={Workflow}
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
