import { useState, type ReactNode } from "react"

import { toast } from "sonner"

import { KeyValueGrid, css } from "@datadack/common-ui"

import { useUpdateFunctionConfig } from "../../../data/queries"
import { useServerlessContext } from "../../../data/transport"
import type { FunctionEntity } from "../../../data/types"
import { EnvEditor, type EnvRow } from "../../CreateFunctionForm/EnvEditor"
import { errorMessage } from "../errorMessage"
import type { FunctionDetailLabels } from "../labels"
import { SectionShell } from "./SectionShell"

const emptyLine = css`
  margin: 0;
  font-size: 13px;
  color: var(--muted-foreground);
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
  const [editing, setEditing] = useState(false)
  const [rows, setRows] = useState<EnvRow[]>([{ key: "", value: "" }])

  const config = labels.configuration
  const entries = Object.entries(fn.env ?? {})

  const startEdit = () => {
    setRows([
      ...entries.map(([key, value]) => ({ key, value })),
      // The editor's contract: always one blank row at the end.
      { key: "", value: "" },
    ])
    setEditing(true)
  }

  const draft = rowsToMap(rows)
  const dirty = canonical(draft) !== canonical(fn.env ?? {})

  const save = () => {
    update.mutate(
      { env: draft },
      {
        onSuccess: () => {
          toast.success(config.saved)
          setEditing(false)
        },
        onError: (error) => {
          toast.error(errorMessage(error, labels.errors.saveFailed))
        },
      },
    )
  }

  let body: ReactNode
  if (editing) {
    body = (
      <EnvEditor
        rows={rows}
        onChange={setRows}
        addLabel={config.envAdd}
        hint={config.envHint}
        removeLabel={config.envRemove}
      />
    )
  } else if (entries.length === 0) {
    body = <p className={emptyLine}>{config.envEmpty}</p>
  } else {
    body = (
      <KeyValueGrid
        columns={3}
        items={entries.map(([key, value]) => ({ label: key, value, mono: true }))}
      />
    )
  }

  return (
    <SectionShell
      title={config.nav.env}
      editable={capabilities.configEdit}
      editing={editing}
      onEdit={startEdit}
      onCancel={() => {
        setEditing(false)
      }}
      onSave={save}
      saving={update.isPending}
      saveDisabled={!dirty}
      editLabel={config.edit}
      saveLabel={config.save}
      cancelLabel={config.cancel}
      className={className}
    >
      {body}
    </SectionShell>
  )
}
