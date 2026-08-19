import { useState, type ReactNode } from "react"

import { Tags } from "lucide-react"
import { toast } from "sonner"

import { TagList, css } from "@datadack/common-ui"

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

function rowsToMap(rows: EnvRow[]): Record<string, string> {
  return Object.fromEntries(
    rows.filter((entry) => entry.key.trim() !== "").map((entry) => [entry.key.trim(), entry.value]),
  )
}

function canonical(map: Record<string, string>): string {
  return JSON.stringify(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)))
}

export interface TagsSectionProps {
  fn: FunctionEntity
  scope?: string
  labels: FunctionDetailLabels
  className?: string
}

/**
 * Tags are the function's labels (there is no separate tag store): chips in
 * view mode, key/value rows in edit mode, and the PATCH's `labels` is a
 * wholesale replacement.
 */
export function TagsSection({ fn, scope, labels, className }: Readonly<TagsSectionProps>) {
  const { capabilities } = useServerlessContext()
  const update = useUpdateFunctionConfig(fn.name, scope)
  const [editing, setEditing] = useState(false)
  const [rows, setRows] = useState<EnvRow[]>([{ key: "", value: "" }])

  const config = labels.configuration
  const tags = fn.labels ?? {}

  const startEdit = () => {
    setRows([
      ...Object.entries(tags).map(([key, value]) => ({ key, value })),
      { key: "", value: "" },
    ])
    setEditing(true)
  }

  const draft = rowsToMap(rows)
  const dirty = canonical(draft) !== canonical(tags)

  const save = () => {
    update.mutate(
      { labels: draft },
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
  } else if (Object.keys(tags).length === 0) {
    body = <p className={emptyLine}>{config.tagsEmpty}</p>
  } else {
    body = <TagList tags={tags} />
  }

  return (
    <SectionShell
      title={config.nav.tags}
      icon={Tags}
      description={config.tagsHint}
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
