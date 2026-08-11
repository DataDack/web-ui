import { useMemo, useState, type ReactNode } from "react"

import { Layers as LayersIcon, X } from "lucide-react"
import { toast } from "sonner"

import {
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  css,
  cx,
  fontMono,
} from "@datadack/common-ui"

import { SectionShell } from "./SectionShell"
import { useLayers, useUpdateFunctionConfig } from "../../../data/queries"
import { useServerlessContext } from "../../../data/transport"
import type { FunctionEntity, LayerRef } from "../../../data/types"
import { errorMessage } from "../errorMessage"
import type { FunctionDetailLabels } from "../labels"

const emptyLine = css`
  margin: 0;
  font-size: 13px;
  color: var(--muted-foreground);
`

const list = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const row = css`
  display: flex;
  align-items: center;
  gap: 10px;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  padding: 8px 10px;
`

const layerName = css`
  font-family: ${fontMono};
  font-size: 13px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const versionBadge = css`
  font-family: ${fontMono};
  font-size: 11px;
`

const spacer = css`
  margin-left: auto;
`

const addRow = css`
  display: flex;
  align-items: center;
  gap: 8px;
`

/** A layer ref's identity, for dedupe and for React keys. */
function refKey(ref: LayerRef): string {
  return `${ref.name}:${String(ref.version)}`
}

export interface LayersSectionProps {
  fn: FunctionEntity
  scope?: string
  labels: FunctionDetailLabels
  className?: string
}

/**
 * The layers attached to a function.
 *
 * Layers used to be settable only in a deploy body, which no console screen
 * sends — so a published layer could not be attached to anything from the UI at
 * all. The configuration patch takes them now, and this is the surface for it.
 *
 * The patch replaces the whole set, so the editor works on a local draft and
 * sends it wholesale rather than diffing add/remove.
 */
export function LayersSection({ fn, scope, labels, className }: Readonly<LayersSectionProps>) {
  const { capabilities } = useServerlessContext()
  const update = useUpdateFunctionConfig(fn.name, scope)
  const { data: catalogue } = useLayers(scope)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<LayerRef[]>([])

  const config = labels.configuration
  const attached = useMemo(() => fn.layers ?? [], [fn.layers])

  // Only what is not already attached, and only what this function's runtime
  // and architecture can actually load — the control plane refuses the rest, so
  // offering them would just be a rejected save.
  const available = useMemo(() => {
    const taken = new Set(draft.map(refKey))
    return (catalogue ?? []).filter((layer) => {
      if (taken.has(`${layer.name}:${String(layer.version)}`)) return false
      const runtimes = layer.compatibleRuntimes ?? []
      if (runtimes.length > 0 && fn.runtime && !runtimes.includes(fn.runtime)) return false
      const arches = layer.compatibleArchitectures ?? []
      if (arches.length > 0 && fn.architecture && !arches.includes(fn.architecture)) return false
      return true
    })
  }, [catalogue, draft, fn.runtime, fn.architecture])

  const startEdit = () => {
    setDraft([...attached])
    setEditing(true)
  }

  const dirty =
    draft.length !== attached.length ||
    draft.some((ref, index) => {
      const current = attached[index]
      return current === undefined || refKey(ref) !== refKey(current)
    })

  const save = () => {
    update.mutate(
      // Sent as bare {name, version}: an arn from the catalogue would be an
      // extra key the control plane decodes strictly and rejects.
      { layers: draft.map((ref) => ({ name: ref.name, version: ref.version })) },
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

  const rows = editing ? draft : attached

  let body: ReactNode
  if (rows.length === 0 && !editing) {
    body = <p className={emptyLine}>{config.layers.empty}</p>
  } else {
    body = (
      <div className={list}>
        {rows.map((ref, index) => (
          <div key={refKey(ref)} className={row}>
            <LayersIcon size={14} />
            <span className={layerName}>{ref.name}</span>
            <Badge variant="outline" className={versionBadge}>
              v{ref.version}
            </Badge>
            {editing && (
              <Button
                variant="ghost"
                size="icon"
                className={spacer}
                aria-label={config.layers.remove(ref.name)}
                onClick={() => {
                  setDraft(draft.filter((_, i) => i !== index))
                }}
              >
                <X />
              </Button>
            )}
          </div>
        ))}
        {editing && (
          <div className={addRow}>
            <Select
              // Reset to the placeholder after each pick, so the control reads
              // as "add another" rather than as the current selection.
              value=""
              onValueChange={(value) => {
                // The items are keyed "<name> <version>". A layer name cannot
                // contain a space, so the last field is the version and
                // everything before it is the name.
                const separator = value.lastIndexOf(" ")
                if (separator <= 0) return
                setDraft([
                  ...draft,
                  { name: value.slice(0, separator), version: Number(value.slice(separator + 1)) },
                ])
              }}
            >
              <SelectTrigger aria-label={config.layers.add}>
                <SelectValue
                  placeholder={
                    available.length === 0 ? config.layers.noneAvailable : config.layers.add
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {available.map((layer) => (
                  <SelectItem
                    key={`${layer.name}:${String(layer.version)}`}
                    value={`${layer.name} ${String(layer.version)}`}
                  >
                    {layer.name} v{layer.version}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    )
  }

  return (
    <SectionShell
      title={config.nav.layers}
      description={config.layers.hint}
      editable={capabilities.layerAttach}
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
      className={cx(className)}
    >
      {body}
    </SectionShell>
  )
}
