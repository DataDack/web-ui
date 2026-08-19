import { useEffect, useState } from "react"

import { Settings2 } from "lucide-react"
import { toast } from "sonner"

import { Input, Button, Label, css, cx, fontMono, media } from "@datadack/common-ui"

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
  const [description, setDescription] = useState(fn.description ?? "")
  const [handler, setHandler] = useState(fn.handler ?? "")
  const [memory, setMemory] = useState(fn.memorySize != null ? String(fn.memorySize) : "")
  const [timeoutSecs, setTimeoutSecs] = useState(fn.timeout != null ? String(fn.timeout) : "")
  const [ephemeral, setEphemeral] = useState(
    fn.ephemeralStorageMb != null ? String(fn.ephemeralStorageMb) : "",
  )

  const config = labels.configuration
  const fields = config.fields

  useEffect(() => {
    setDescription(fn.description ?? "")
    setHandler(fn.handler ?? "")
    setMemory(fn.memorySize != null ? String(fn.memorySize) : "")
    setTimeoutSecs(fn.timeout != null ? String(fn.timeout) : "")
    setEphemeral(fn.ephemeralStorageMb != null ? String(fn.ephemeralStorageMb) : "")
  }, [fn.description, fn.ephemeralStorageMb, fn.handler, fn.memorySize, fn.timeout])

  const memoryValue = parseDraftNumber(memory)
  const timeoutValue = parseDraftNumber(timeoutSecs)
  const ephemeralValue = parseDraftNumber(ephemeral)

  const memoryValid = inRange(memoryValue, 128, 10240)
  const timeoutValid = inRange(timeoutValue, 1, 900)
  const ephemeralValid = inRange(ephemeralValue, 512, 10240)
  const descriptionValid = description.trim().length <= 256

  const patch: UpdateFunctionConfigInput = {}
  if (description.trim() !== (fn.description ?? "")) patch.description = description.trim()
  if (handler.trim() !== (fn.handler ?? "")) patch.handler = handler.trim()
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
      },
      onError: (error) => {
        toast.error(errorMessage(error, labels.errors.saveFailed))
      },
    })
  }

  return (
    <SectionShell
      title={config.nav.general}
      icon={Settings2}
      actions={
        capabilities.configEdit ? (
          <Button
            variant="gold"
            size="sm"
            loading={update.isPending}
            disabled={!dirty || !valid || update.isPending}
            onClick={save}
          >
            {config.save}
          </Button>
        ) : undefined
      }
      className={className}
    >
      <div className={formGrid}>
        <div className={field}>
          <Label htmlFor="fn-config-runtime">{fields.runtime}</Label>
          <Input
            id="fn-config-runtime"
            value={fn.runtime ?? fn.runtimeMode ?? ""}
            disabled
            className={monoInput}
          />
        </div>
        <div className={field}>
          <Label htmlFor="fn-config-architecture">{fields.architecture}</Label>
          <Input
            id="fn-config-architecture"
            value={fn.architecture ?? ""}
            disabled
            className={monoInput}
          />
        </div>
        <div className={cx(field, fullWidth)}>
          <Label htmlFor="fn-config-handler">{fields.handler}</Label>
          <Input
            id="fn-config-handler"
            value={handler}
            disabled={!capabilities.configEdit}
            className={monoInput}
            onChange={(event) => {
              setHandler(event.target.value)
            }}
          />
        </div>
        <div className={cx(field, fullWidth)}>
          <Label htmlFor="fn-config-description">{fields.description}</Label>
          <Input
            id="fn-config-description"
            value={description}
            disabled={!capabilities.configEdit}
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
            disabled={!capabilities.configEdit}
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
            disabled={!capabilities.configEdit}
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
            disabled={!capabilities.configEdit}
            aria-invalid={!ephemeralValid || undefined}
            className={monoInput}
            onChange={(event) => {
              setEphemeral(event.target.value)
            }}
          />
        </div>
      </div>
    </SectionShell>
  )
}
