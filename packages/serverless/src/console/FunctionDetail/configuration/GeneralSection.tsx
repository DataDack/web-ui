import { useState } from "react"

import { toast } from "sonner"

import {
  Input,
  KeyValueGrid,
  Label,
  css,
  cx,
  fontMono,
  media,
  timeAgo,
  type KeyValueItem,
} from "@datadack/common-ui"

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

const fullWidth = css`
  ${media.sm} {
    grid-column: 1 / -1;
  }
`

const monoInput = css`
  font-family: ${fontMono};
  font-size: 13px;
`

/** "" (untouched/cleared input) → undefined; anything else → its number. */
function parseDraftNumber(raw: string): number | undefined {
  const trimmed = raw.trim()
  if (trimmed === "") return undefined
  return Number(trimmed)
}

function inRange(value: number | undefined, min: number, max: number): boolean {
  return value === undefined || (Number.isInteger(value) && value >= min && value <= max)
}

export interface GeneralSectionProps {
  fn: FunctionEntity
  scope?: string
  labels: FunctionDetailLabels
  className?: string
}

/**
 * The Lambda "General configuration" panel: the identity/runtime grid in view
 * mode, and — when the transport can PATCH — an inline form for description,
 * memory, timeout and ephemeral storage. The patch carries only changed keys,
 * and ephemeral storage is never sent as 0 (0 is the backend's reset value,
 * which the UI does not offer).
 */
export function GeneralSection({ fn, scope, labels, className }: Readonly<GeneralSectionProps>) {
  const { capabilities } = useServerlessContext()
  const update = useUpdateFunctionConfig(fn.name, scope)
  const [editing, setEditing] = useState(false)
  const [description, setDescription] = useState("")
  const [memory, setMemory] = useState("")
  const [timeoutSecs, setTimeoutSecs] = useState("")
  const [ephemeral, setEphemeral] = useState("")

  const config = labels.configuration
  const fields = config.fields

  const startEdit = () => {
    setDescription(fn.description ?? "")
    setMemory(fn.memorySize != null ? String(fn.memorySize) : "")
    setTimeoutSecs(fn.timeout != null ? String(fn.timeout) : "")
    setEphemeral(fn.ephemeralStorageMb != null ? String(fn.ephemeralStorageMb) : "")
    setEditing(true)
  }

  const memoryValue = parseDraftNumber(memory)
  const timeoutValue = parseDraftNumber(timeoutSecs)
  const ephemeralValue = parseDraftNumber(ephemeral)

  const memoryValid = inRange(memoryValue, 128, 10240)
  const timeoutValid = inRange(timeoutValue, 1, 900)
  const ephemeralValid = inRange(ephemeralValue, 512, 10240)
  const descriptionValid = description.trim().length <= 256

  const patch: UpdateFunctionConfigInput = {}
  if (description.trim() !== (fn.description ?? "")) patch.description = description.trim()
  if (memoryValue !== undefined && memoryValue !== fn.memorySize) patch.memorySize = memoryValue
  if (timeoutValue !== undefined && timeoutValue !== fn.timeout) patch.timeout = timeoutValue
  if (
    ephemeralValue !== undefined &&
    ephemeralValue !== 0 &&
    ephemeralValue !== fn.ephemeralStorageMb
  ) {
    patch.ephemeralStorageMb = ephemeralValue
  }

  const dirty = Object.keys(patch).length > 0
  const valid = memoryValid && timeoutValid && ephemeralValid && descriptionValid

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

  const items: KeyValueItem[] = [
    { label: fields.runtime, value: fn.runtime ?? fn.runtimeMode, mono: true },
    { label: fields.handler, value: fn.handler, mono: true },
    { label: fields.architecture, value: fn.architecture, mono: true },
    {
      label: fields.memory,
      value: fn.memorySize != null ? `${String(fn.memorySize)} MB` : undefined,
      mono: true,
    },
    {
      label: fields.timeout,
      value: fn.timeout != null ? `${String(fn.timeout)}s` : undefined,
      mono: true,
    },
    { label: fields.packageType, value: fn.packageType, mono: true },
    { label: fields.namespace, value: fn.namespace, mono: true },
    { label: fields.region, value: fn.region, mono: true },
    {
      label: fields.lastModified,
      value: fn.updatedAt ? timeAgo(fn.updatedAt) : undefined,
      mono: true,
    },
    { label: fields.description, value: fn.description === "" ? undefined : fn.description },
  ]
  if (fn.ephemeralStorageMb != null) {
    items.push({
      label: fields.ephemeral,
      value: `${String(fn.ephemeralStorageMb)} MB`,
      mono: true,
    })
  }
  if (fn.imageUri) {
    items.push({ label: fields.imageUri, value: fn.imageUri, mono: true, copyable: true })
  }

  return (
    <SectionShell
      title={config.nav.general}
      editable={capabilities.configEdit}
      editing={editing}
      onEdit={startEdit}
      onCancel={() => {
        setEditing(false)
      }}
      onSave={save}
      saving={update.isPending}
      saveDisabled={!dirty || !valid}
      editLabel={config.edit}
      saveLabel={config.save}
      cancelLabel={config.cancel}
      className={className}
    >
      {editing ? (
        <div className={formGrid}>
          <div className={cx(field, fullWidth)}>
            <Label htmlFor="fn-config-description">{fields.description}</Label>
            <Input
              id="fn-config-description"
              value={description}
              aria-invalid={!descriptionValid || undefined}
              onChange={(event) => {
                setDescription(event.target.value)
              }}
            />
          </div>
          <div className={field}>
            <Label htmlFor="fn-config-memory">{fields.memory}</Label>
            <Input
              id="fn-config-memory"
              type="number"
              min={128}
              max={10240}
              step={64}
              value={memory}
              aria-invalid={!memoryValid || undefined}
              className={monoInput}
              onChange={(event) => {
                setMemory(event.target.value)
              }}
            />
          </div>
          <div className={field}>
            <Label htmlFor="fn-config-timeout">{fields.timeout}</Label>
            <Input
              id="fn-config-timeout"
              type="number"
              min={1}
              max={900}
              value={timeoutSecs}
              aria-invalid={!timeoutValid || undefined}
              className={monoInput}
              onChange={(event) => {
                setTimeoutSecs(event.target.value)
              }}
            />
          </div>
          <div className={field}>
            <Label htmlFor="fn-config-ephemeral">{fields.ephemeral}</Label>
            <Input
              id="fn-config-ephemeral"
              type="number"
              min={512}
              max={10240}
              value={ephemeral}
              aria-invalid={!ephemeralValid || undefined}
              className={monoInput}
              onChange={(event) => {
                setEphemeral(event.target.value)
              }}
            />
          </div>
        </div>
      ) : (
        <KeyValueGrid columns={3} items={items} />
      )}
    </SectionShell>
  )
}
