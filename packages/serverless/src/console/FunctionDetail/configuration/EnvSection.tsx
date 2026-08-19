import { useEffect, useState } from "react"

import { Braces } from "lucide-react"
import { toast } from "sonner"

import { Button, css } from "@datadack/common-ui"

import { useUpdateFunctionConfig } from "../../../data/queries"
import { useServerlessContext } from "../../../data/transport"
import type { FunctionEntity } from "../../../data/types"
import { EnvEditor, type EnvRow } from "../../CreateFunctionForm/EnvEditor"
import { errorMessage } from "../errorMessage"
import type { FunctionDetailLabels } from "../labels"
import { SectionShell } from "./SectionShell"

const editor = css`
  min-height: 180px;
`

/** Rows → the env map, dropping blank keys (the create-form convention). */
function rowsToMap(rows: EnvRow[]): Record<string, string> {
  return Object.fromEntries(
    rows.filter((entry) => entry.key.trim() !== "").map((entry) => [entry.key.trim(), entry.value]),
  )
}

/** Order-independent identity, so reordering rows alone never enables Save. */
function canonical(map: Record<string, string>): string {
  return JSON.stringify(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)))
}

export interface EnvSectionProps {
  fn: FunctionEntity
  scope?: string
  labels: FunctionDetailLabels
  className?: string
}

/**
 * Environment variables: a mono grid in view mode, the create-form's EnvEditor
 * in edit mode. The PATCH's `env` is a wholesale replacement — saving an empty
 * editor sends `{}` and clears everything, which is exactly what it shows.
 */
export function EnvSection({ fn, scope, labels, className }: Readonly<EnvSectionProps>) {
  const { capabilities } = useServerlessContext()
  const update = useUpdateFunctionConfig(fn.name, scope)
  const [rows, setRows] = useState<EnvRow[]>(() => [
    ...Object.entries(fn.env ?? {}).map(([key, value]) => ({ key, value })),
    { key: "", value: "" },
  ])

  const config = labels.configuration
  useEffect(() => {
    setRows([
      ...Object.entries(fn.env ?? {}).map(([key, value]) => ({ key, value })),
      { key: "", value: "" },
    ])
  }, [fn.env])

  const draft = rowsToMap(rows)
  const dirty = canonical(draft) !== canonical(fn.env ?? {})

  const save = () => {
    update.mutate(
      { env: draft },
      {
        onSuccess: () => {
          toast.success(config.saved)
        },
        onError: (error) => {
          toast.error(errorMessage(error, labels.errors.saveFailed))
        },
      },
    )
  }

  return (
    <SectionShell
      title={config.nav.env}
      icon={Braces}
      actions={
        capabilities.configEdit ? (
          <Button
            type="button"
            variant="gold"
            size="sm"
            loading={update.isPending}
            disabled={!dirty || update.isPending}
            onClick={save}
          >
            {config.save}
          </Button>
        ) : undefined
      }
      className={className}
    >
      <div className={editor}>
        <EnvEditor
          rows={rows}
          onChange={setRows}
          addLabel={config.envAdd}
          hint={config.envHint}
          removeLabel={config.envRemove}
          importedLabel={config.envImported}
          skippedLabel={config.envSkipped}
          undoLabel={config.envUndo}
        />
      </div>
    </SectionShell>
  )
}
