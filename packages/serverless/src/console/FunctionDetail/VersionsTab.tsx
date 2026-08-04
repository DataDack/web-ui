import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { GitBranch, History } from "lucide-react"

import {
  actionsColumn,
  Badge,
  DataTable,
  EmptyState,
  cx,
  css,
  fontMono,
  formatBytes,
  textColumn,
  timeAgo,
  type DataTableColumnMeta,
} from "@datadack/common-ui"

import { AliasDialog } from "./AliasDialog"
import type { FunctionDetailLabels } from "./labels"
import { useFunctionVersions } from "../../data/queries"
import { useServerlessContext } from "../../data/transport"
import type { FunctionEntity, FunctionVersion } from "../../data/types"

const versionBadge = css`
  font-family: ${fontMono};
  font-size: 11px;
`

const dash = css`
  color: var(--muted-foreground);
`

const dateCell = css`
  font-family: ${fontMono};
  font-size: 12px;
  color: var(--muted-foreground);
  white-space: nowrap;
`

export interface VersionsTabProps {
  fn: FunctionEntity
  scope?: string
  labels: FunctionDetailLabels
  className?: string
}

/**
 * The published versions, newest first. Each row can seed a new alias when the
 * transport supports alias writes; everything else is read-only history.
 */
export function VersionsTab({ fn, scope, labels, className }: Readonly<VersionsTabProps>) {
  const { capabilities } = useServerlessContext()
  const { data, isLoading } = useFunctionVersions(fn.name, scope)
  const versions = useMemo(() => (data ? [...data].reverse() : []), [data])
  const [aliasFromVersion, setAliasFromVersion] = useState<string | null>(null)

  // AliasDialog reseeds its draft on [open, initial]; a per-render object
  // literal would re-fire that effect on any parent re-render (background
  // refetch, label identity change) and wipe the user's in-progress input.
  const aliasInitial = useMemo(
    () => (aliasFromVersion ? { functionVersion: aliasFromVersion } : undefined),
    [aliasFromVersion],
  )

  const columns = useMemo<ColumnDef<FunctionVersion>[]>(() => {
    const cols: ColumnDef<FunctionVersion>[] = [
      {
        id: "version",
        accessorFn: (version) => version.version,
        header: () => labels.versions.columns.version,
        cell: ({ row }) => (
          <Badge variant="outline" className={versionBadge}>
            v{row.original.version}
          </Badge>
        ),
      },
      textColumn<FunctionVersion>({
        id: "description",
        header: labels.versions.columns.description,
        accessor: (version) => version.description,
        muted: true,
      }),
      {
        id: "date",
        accessorFn: (version) => version.createdAt ?? "",
        header: () => labels.versions.columns.date,
        meta: { responsive: "md" } satisfies DataTableColumnMeta,
        cell: ({ row }) => {
          const iso = row.original.createdAt
          if (!iso) return <span className={dash}>—</span>
          return (
            <span className={dateCell} title={new Date(iso).toLocaleString()}>
              {timeAgo(iso)}
            </span>
          )
        },
      },
      textColumn<FunctionVersion>({
        id: "codeSize",
        header: labels.versions.columns.codeSize,
        accessor: (version) =>
          version.codeArtifact?.sizeBytes != null
            ? formatBytes(version.codeArtifact.sizeBytes)
            : undefined,
        mono: true,
        muted: true,
      }),
      textColumn<FunctionVersion>({
        id: "sha",
        header: labels.versions.columns.sha,
        accessor: (version) => version.codeSha256?.slice(0, 12),
        mono: true,
        muted: true,
        responsive: "lg",
      }),
    ]
    if (capabilities.aliasWrite) {
      cols.push(
        actionsColumn<FunctionVersion>({
          ariaLabel: labels.versions.rowActions,
          actions: () => [
            {
              label: labels.versions.createAlias,
              icon: GitBranch,
              onAction: (version) => {
                setAliasFromVersion(version.version)
              },
            },
          ],
        }),
      )
    }
    return cols
  }, [labels, capabilities.aliasWrite])

  return (
    <div className={cx(className)}>
      <DataTable<FunctionVersion>
        data={versions}
        columns={columns}
        loading={isLoading}
        getRowId={(version) => version.version}
        empty={<EmptyState icon={History} title={labels.versions.empty} />}
      />

      <AliasDialog
        open={aliasFromVersion !== null}
        onOpenChange={(open) => {
          if (!open) setAliasFromVersion(null)
        }}
        mode="create"
        functionName={fn.name}
        scope={scope}
        labels={labels}
        versions={versions}
        initial={aliasInitial}
      />
    </div>
  )
}
