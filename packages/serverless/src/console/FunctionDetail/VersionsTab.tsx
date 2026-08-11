import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { GitBranch, History, Plus } from "lucide-react"

import {
  actionsColumn,
  Badge,
  Button,
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
import { CreateVersionDialog } from "./CreateVersionDialog"
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

const toolbar = css`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
`

const hint = css`
  margin: 0;
  font-size: 13px;
  color: var(--muted-foreground);
  max-width: 46rem;
`

const versionCell = css`
  display: flex;
  align-items: center;
  gap: 8px;
`

const workingBadge = css`
  font-size: 11px;
`

export interface VersionsTabProps {
  fn: FunctionEntity
  scope?: string
  labels: FunctionDetailLabels
  className?: string
}

/**
 * The versions, newest first.
 *
 * The newest row is the WORKING version: deploys overwrite it in place rather
 * than adding a row, so the list only grows when someone uses "create version".
 * That distinction is the whole reason the tab has a toolbar — without it the
 * list looks like a deploy history that has stopped recording, so the badge and
 * the hint say which row is live and what the button does.
 */
export function VersionsTab({ fn, scope, labels, className }: Readonly<VersionsTabProps>) {
  const { capabilities } = useServerlessContext()
  const { data, isLoading } = useFunctionVersions(fn.name, scope)
  const versions = useMemo(() => (data ? [...data].reverse() : []), [data])
  const [aliasFromVersion, setAliasFromVersion] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  // Newest-first, so [0] is the version deploys currently land on. Falling back
  // to the function's own version keeps the badge right on the first render,
  // before the list query resolves.
  const workingVersion = versions[0]?.version ?? fn.version?.version
  const nextVersion = String(Number(workingVersion ?? "0") + 1)

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
          <span className={versionCell}>
            <Badge variant="outline" className={versionBadge}>
              v{row.original.version}
            </Badge>
            {row.original.version === workingVersion && (
              <Badge variant="secondary" className={workingBadge}>
                {labels.versions.workingBadge}
              </Badge>
            )}
          </span>
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
  }, [labels, capabilities.aliasWrite, workingVersion])

  return (
    <div className={cx(className)}>
      {capabilities.versionWrite && (
        <div className={toolbar}>
          <p className={hint}>{labels.versions.workingHint}</p>
          <Button
            size="sm"
            onClick={() => {
              setCreating(true)
            }}
          >
            <Plus />
            {labels.versions.create}
          </Button>
        </div>
      )}

      <DataTable<FunctionVersion>
        data={versions}
        columns={columns}
        loading={isLoading}
        getRowId={(version) => version.version}
        empty={<EmptyState icon={History} title={labels.versions.empty} />}
      />

      <CreateVersionDialog
        open={creating}
        onOpenChange={setCreating}
        functionName={fn.name}
        scope={scope}
        labels={labels}
        nextVersion={nextVersion}
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
