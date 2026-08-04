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

function validCount(value: number | undefined): boolean {
  return value === undefined || (Number.isInteger(value) && value >= 0)
}

export interface ConcurrencySectionProps {
  fn: FunctionEntity
  scope?: string
  labels: FunctionDetailLabels
  className?: string
}

/**
 * Reserved and provisioned concurrency. 0 is a real value here — reserved 0
 * clears the reservation gate — so the patch keys off "changed", not "truthy".
 */
export function ConcurrencySection({
  fn,
  scope,
  labels,
  className,
}: Readonly<ConcurrencySectionProps>) {
  const { capabilities } = useServerlessContext()
  const update = useUpdateFunctionConfig(fn.name, scope)
  const [editing, setEditing] = useState(false)
  const [reserved, setReserved] = useState("")
  const [provisioned, setProvisioned] = useState("")

  const config = labels.configuration
  const fields = config.fields

  const startEdit = () => {
    setReserved(fn.reservedConcurrency != null ? String(fn.reservedConcurrency) : "")
    setProvisioned(fn.provisionedConcurrency != null ? String(fn.provisionedConcurrency) : "")
    setEditing(true)
  }

  const reservedValue = parseDraftNumber(reserved)
  const provisionedValue = parseDraftNumber(provisioned)
  const reservedValid = validCount(reservedValue)
  const provisionedValid = validCount(provisionedValue)

  const patch: UpdateFunctionConfigInput = {}
  if (reservedValue !== undefined && reservedValue !== fn.reservedConcurrency) {
    patch.reservedConcurrency = reservedValue
  }
  if (provisionedValue !== undefined && provisionedValue !== fn.provisionedConcurrency) {
    patch.provisionedConcurrency = provisionedValue
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
      title={config.nav.concurrency}
      editable={capabilities.configEdit}
      editing={editing}
      onEdit={startEdit}
      onCancel={() => {
        setEditing(false)
      }}
      onSave={save}
      saving={update.isPending}
      saveDisabled={!dirty || !reservedValid || !provisionedValid}
      editLabel={config.edit}
      saveLabel={config.save}
      cancelLabel={config.cancel}
      className={className}
    >
      {editing ? (
        <div className={formGrid}>
          <div className={field}>
            <Label htmlFor="fn-config-reserved">{fields.reserved}</Label>
            <Input
              id="fn-config-reserved"
              type="number"
              min={0}
              value={reserved}
              aria-invalid={!reservedValid || undefined}
              className={monoInput}
              onChange={(event) => {
                setReserved(event.target.value)
              }}
            />
          </div>
          <div className={field}>
            <Label htmlFor="fn-config-provisioned">{fields.provisioned}</Label>
            <Input
              id="fn-config-provisioned"
              type="number"
              min={0}
              value={provisioned}
              aria-invalid={!provisionedValid || undefined}
              className={monoInput}
              onChange={(event) => {
                setProvisioned(event.target.value)
              }}
            />
          </div>
        </div>
      ) : (
        <KeyValueGrid
          columns={2}
          items={[
            {
              label: fields.reserved,
              value:
                fn.reservedConcurrency != null
                  ? String(fn.reservedConcurrency)
                  : config.unreserved,
              mono: true,
            },
            {
              label: fields.provisioned,
              value:
                fn.provisionedConcurrency != null
                  ? String(fn.provisionedConcurrency)
                  : config.unreserved,
              mono: true,
            },
          ]}
        />
      )}
    </SectionShell>
  )
}
