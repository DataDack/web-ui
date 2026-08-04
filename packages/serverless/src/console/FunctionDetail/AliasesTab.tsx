import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { GitBranch, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  actionsColumn,
  Badge,
  Button,
  DataTable,
  EmptyState,
  css,
  cx,
  fontMono,
  textColumn,
  type RowAction,
} from "@datadack/common-ui"

import { useDeleteAlias, useFunctionAliases, useFunctionVersions } from "../../data/queries"
import { useServerlessContext } from "../../data/transport"
import type { FunctionAlias, FunctionEntity, PutAliasInput } from "../../data/types"
import { ConfirmDialog } from "../ConfirmDialog"
import { AliasDialog } from "./AliasDialog"
import { errorMessage } from "./errorMessage"
import type { FunctionDetailLabels } from "./labels"

const versionBadge = css`
  font-family: ${fontMono};
  font-size: 11px;
`

/** The full traffic split: the primary's share is 100 minus the extra weights. */
function routingText(alias: FunctionAlias): string | null {
  const weights = Object.entries(alias.additionalVersionWeights ?? {})
  if (weights.length === 0) return null
  const total = weights.reduce((sum, [, weight]) => sum + weight, 0)
  return [
    `v${alias.functionVersion} ${String(100 - total)}%`,
    ...weights.map(([version, weight]) => `v${version} ${String(weight)}%`),
  ].join(" · ")
}

interface DialogState {
  mode: "create" | "edit"
  initial?: Partial<PutAliasInput>
}

export interface AliasesTabProps {
  fn: FunctionEntity
  scope?: string
  labels: FunctionDetailLabels
  className?: string
}

/**
 * The function's aliases: stable names over versions, with optional weighted
 * routing. Create/edit go through AliasDialog; deletes interpose a confirm —
 * anything invoking through the alias starts failing the moment it's gone.
 */
export function AliasesTab({ fn, scope, labels, className }: Readonly<AliasesTabProps>) {
  const { capabilities } = useServerlessContext()
  const { data, isLoading } = useFunctionAliases(fn.name, scope)
  const { data: versionData } = useFunctionVersions(fn.name, scope)
  const versions = useMemo(() => (versionData ? [...versionData].reverse() : []), [versionData])
  const deleteAlias = useDeleteAlias(fn.name, scope)

  const [dialog, setDialog] = useState<DialogState | null>(null)
  const [deleting, setDeleting] = useState<FunctionAlias | null>(null)

  const columns = useMemo<ColumnDef<FunctionAlias>[]>(() => {
    const cols: ColumnDef<FunctionAlias>[] = [
      textColumn<FunctionAlias>({
        id: "name",
        header: labels.aliases.columns.name,
        accessor: (alias) => alias.name,
        mono: true,
      }),
      {
        id: "version",
        accessorFn: (alias) => alias.functionVersion,
        header: () => labels.aliases.columns.version,
        cell: ({ row }) => (
          <Badge variant="outline" className={versionBadge}>
            v{row.original.functionVersion}
          </Badge>
        ),
      },
      textColumn<FunctionAlias>({
        id: "routing",
        header: labels.aliases.columns.routing,
        accessor: routingText,
        mono: true,
        muted: true,
        responsive: "md",
      }),
      textColumn<FunctionAlias>({
        id: "description",
        header: labels.aliases.columns.description,
        accessor: (alias) => alias.description,
        muted: true,
        responsive: "lg",
      }),
    ]
    if (capabilities.aliasWrite) {
      cols.push(
        actionsColumn<FunctionAlias>({
          ariaLabel: labels.aliases.rowActions,
          actions: (): RowAction<FunctionAlias>[] => [
            {
              label: labels.aliases.edit,
              icon: Pencil,
              onAction: (alias) => {
                setDialog({
                  mode: "edit",
                  initial: {
                    name: alias.name,
                    functionVersion: alias.functionVersion,
                    description: alias.description,
                    additionalVersionWeights: alias.additionalVersionWeights,
                  },
                })
              },
            },
            {
              label: labels.actions.delete,
              icon: Trash2,
              destructive: true,
              onAction: setDeleting,
            },
          ],
        }),
      )
    }
    return cols
  }, [labels, capabilities.aliasWrite])

  return (
    <div className={cx(className)}>
      <DataTable<FunctionAlias>
        data={data ?? []}
        columns={columns}
        loading={isLoading}
        getRowId={(alias) => alias.name}
        empty={
          <EmptyState
            icon={GitBranch}
            title={labels.aliases.empty}
            description={labels.aliases.emptyHint}
          />
        }
        actions={
          capabilities.aliasWrite ? (
            <Button
              size="sm"
              variant="gold"
              onClick={() => {
                setDialog({ mode: "create" })
              }}
            >
              <Plus size={14} />
              {labels.aliases.create}
            </Button>
          ) : undefined
        }
      />

      <AliasDialog
        open={dialog !== null}
        onOpenChange={(open) => {
          if (!open) setDialog(null)
        }}
        mode={dialog?.mode ?? "create"}
        functionName={fn.name}
        scope={scope}
        labels={labels}
        versions={versions}
        initial={dialog?.initial}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={deleting ? labels.aliases.deleteTitle(deleting.name) : ""}
        description={labels.aliases.deleteDescription}
        confirmLabel={labels.actions.delete}
        cancelLabel={labels.configuration.cancel}
        destructive
        loading={deleteAlias.isPending}
        onConfirm={() => {
          if (!deleting) return
          const aliasName = deleting.name
          deleteAlias.mutate(aliasName, {
            onSuccess: () => {
              toast.success(labels.aliases.deleted(aliasName))
              setDeleting(null)
            },
            onError: (error) => {
              toast.error(errorMessage(error, labels.errors.deleteFailed))
            },
          })
        }}
      />
    </div>
  )
}
