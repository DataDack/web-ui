import { useState } from "react"

import { toast } from "sonner"

import { Input, KeyValueGrid, Label, css, fontMono, media } from "@datadack/common-ui"

import { useUpdateFunctionConfig } from "../../../data/queries"
import { useServerlessContext } from "../../../data/transport"
import type { FunctionEntity, UpdateFunctionConfigInput } from "../../../data/types"
import { errorMessage } from "../errorMessage"
import type { FunctionDetailLabels } from "../labels"
import { SectionShell } from "./SectionShell"

const formGrid = css`
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1fr);

  ${media.sm} {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`

const field = css`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const monoInput = css`
  font-family: ${fontMono};
  font-size: 13px;
`

function parseDraftNumber(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (trimmed === "") return undefined
  return Number(trimmed)
}

function inRange(value: number | undefined, min: number, max: number): boolean {
  return value === undefined || (Number.isInteger(value) && value >= min && value <= max)
}

export interface AsyncSectionProps {
  fn: FunctionEntity
  scope?: string
  labels: FunctionDetailLabels
  className?: string
}

/**
 * Asynchronous invocation settings, with Lambda's bounds: event age 60–21600
 * seconds, 0–2 retries. Applies to newly-enqueued async jobs only — queued
 * events carry their own copies.
 */
export function AsyncSection({ fn, scope, labels, className }: Readonly<AsyncSectionProps>) {
  const { capabilities } = useServerlessContext()
  const update = useUpdateFunctionConfig(fn.name, scope)
  const [editing, setEditing] = useState(false)
  const [maxAge, setMaxAge] = useState("")
  const [retries, setRetries] = useState("")

  const config = labels.configuration
  const fields = config.fields

  const startEdit = () => {
    setMaxAge(fn.maxEventAgeSeconds != null ? String(fn.maxEventAgeSeconds) : "")
    setRetries(fn.maxRetryAttempts != null ? String(fn.maxRetryAttempts) : "")
    setEditing(true)
  }

  const maxAgeValue = parseDraftNumber(maxAge)
  const retriesValue = parseDraftNumber(retries)
  const maxAgeValid = inRange(maxAgeValue, 60, 21600)
  const retriesValid = inRange(retriesValue, 0, 2)

  const patch: UpdateFunctionConfigInput = {}
  if (maxAgeValue !== undefined && maxAgeValue !== fn.maxEventAgeSeconds) {
    patch.maxEventAgeSeconds = maxAgeValue
  }
  if (retriesValue !== undefined && retriesValue !== fn.maxRetryAttempts) {
    patch.maxRetryAttempts = retriesValue
  }

  const dirty = Object.keys(patch).length > 0

  const save = () => {
    update.mutate(patch, {
      onSuccess: () => {
        toast.success(config.saved)
        setEditing(false)
      },
      onError: (error) => {
        toast.error(errorMessage(error, labels.errors.saveFailed))
      },
    })
  }

  return (
    <SectionShell
      title={config.nav.async}
      editable={capabilities.configEdit}
      editing={editing}
      onEdit={startEdit}
      onCancel={() => {
        setEditing(false)
      }}
      onSave={save}
      saving={update.isPending}
      saveDisabled={!dirty || !maxAgeValid || !retriesValid}
      editLabel={config.edit}
      saveLabel={config.save}
      cancelLabel={config.cancel}
      className={className}
    >
      {editing ? (
        <div className={formGrid}>
          <div className={field}>
            <Label htmlFor="fn-config-max-age">{fields.maxEventAge}</Label>
            <Input
              id="fn-config-max-age"
              type="number"
              min={60}
              max={21600}
              value={maxAge}
              aria-invalid={!maxAgeValid || undefined}
              className={monoInput}
              onChange={(event) => {
                setMaxAge(event.target.value)
              }}
            />
          </div>
          <div className={field}>
            <Label htmlFor="fn-config-retries">{fields.retryAttempts}</Label>
            <Input
              id="fn-config-retries"
              type="number"
              min={0}
              max={2}
              value={retries}
              aria-invalid={!retriesValid || undefined}
              className={monoInput}
              onChange={(event) => {
                setRetries(event.target.value)
              }}
            />
          </div>
        </div>
      ) : (
        <KeyValueGrid
          columns={2}
          items={[
            {
              label: fields.maxEventAge,
              value:
                fn.maxEventAgeSeconds != null ? `${String(fn.maxEventAgeSeconds)}s` : undefined,
              mono: true,
            },
            {
              label: fields.retryAttempts,
              value: fn.maxRetryAttempts != null ? String(fn.maxRetryAttempts) : undefined,
              mono: true,
            },
          ]}
        />
      )}
    </SectionShell>
  )
}
