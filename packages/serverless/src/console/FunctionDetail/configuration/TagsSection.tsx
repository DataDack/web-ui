import { useState, type ReactNode } from "react"

import { Tags } from "lucide-react"
import { toast } from "sonner"

import { TagList, css } from "@datadack/common-ui"

import { SectionShell } from "./SectionShell"
import { useDeleteFunctionTags, useFunctionTags, usePutFunctionTags } from "../../../data/queries"
import { useServerlessContext } from "../../../data/transport"
import type { FunctionEntity } from "../../../data/types"
import { EnvEditor, type EnvRow } from "../../CreateFunctionForm/EnvEditor"
import { errorMessage } from "../errorMessage"
import type { FunctionDetailLabels } from "../labels"

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
 * A function's tags: chips in view mode, key/value rows in edit mode.
 *
 * These are the LAMBDA tags, in their own store. This section used to write to
 * the function's `labels` on the reasoning that "there is no separate tag
 * store" — true when it was written, and false since the tag API landed. The
 * result was a console editing a different field from the one Terraform and the
 * AWS SDKs read, under the same name.
 *
 * Labels are the OpenFaaS surface and stay where they are. Nothing here touches
 * them.
 *
 * Saving is a MERGE plus explicit deletes rather than a wholesale replace,
 * because the underlying API merges: a removed row has to be deleted by key or
 * it survives the save. That is also why the two calls are ordered — delete
 * first, then put, so a rename (drop `a`, add `b`) cannot delete what it just
 * wrote.
 */
export function TagsSection({ fn, scope, labels, className }: Readonly<TagsSectionProps>) {
  const { capabilities, transport } = useServerlessContext()
  const stored = useFunctionTags(fn.name, scope)
  const put = usePutFunctionTags(fn.name, scope)
  const remove = useDeleteFunctionTags(fn.name, scope)
  const [editing, setEditing] = useState(false)
  const [rows, setRows] = useState<EnvRow[]>([{ key: "", value: "" }])

  const config = labels.configuration
  const tags = stored.data ?? {}
  // A host that has not wired the tag transport gets a read-only section rather
  // than one that appears to save and does not.
  const canEdit = capabilities.configEdit && Boolean(transport.putTags)

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
    const removed = Object.keys(tags).filter((key) => !(key in draft))

    void (async () => {
      try {
        // Deletes first: a rename drops one key and adds another, and putting
        // before deleting would remove the key that was just written.
        if (removed.length > 0) {
          await remove.mutateAsync(removed)
        }
        if (Object.keys(draft).length > 0) {
          await put.mutateAsync(draft)
        }
        toast.success(config.saved)
        setEditing(false)
      } catch (error: unknown) {
        toast.error(errorMessage(error, labels.errors.saveFailed))
      }
    })()
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
      editable={canEdit}
      editing={editing}
      onEdit={startEdit}
      onCancel={() => {
        setEditing(false)
      }}
      onSave={save}
      saving={put.isPending || remove.isPending}
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
