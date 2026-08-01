import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Lock, Plus, RefreshCw, Search, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import {
  actionsColumn,
  ConfirmDialog,
  copyColumn,
  dateColumn,
  EmptyState,
  nameColumn,
  PageHeader,
  ResourceTable,
  StatGrid,
  statusColumn,
  textColumn,
} from "@/components/console"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useScreen } from "@/services/api/screen"

import { Badge } from "@datadack/serverless-ui"

import { VPC_ROUTES } from "../vpc.constants"
import { useAllSecurityGroups, useDeleteSecurityGroup, useVPCs } from "../vpc.hooks"
import type { SecurityGroup } from "../vpc.types"

export function SecurityGroupsListPage() {
  useScreen("vpc.security-groups")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: groups = [], isLoading, isError, refetch, isFetching } = useAllSecurityGroups()
  const { data: networks = [] } = useVPCs()
  const { mutate: deleteGroup, isPending: isDeleting } = useDeleteSecurityGroup()

  const [query, setQuery] = useState("")
  const [toDelete, setToDelete] = useState<SecurityGroup | null>(null)

  // Resolve a group's parent VPC name for display; fall back to the raw id.
  const vpcNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const n of networks) map.set(n.id, n.name)
    return map
  }, [networks])

  const filtered = useMemo(() => {
    if (!query.trim()) return groups
    const q = query.toLowerCase()
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        `sg-${g.tenant_serial}`.includes(q) ||
        g.description.toLowerCase().includes(q) ||
        (vpcNames.get(g.network_id) ?? "").toLowerCase().includes(q),
    )
  }, [groups, query, vpcNames])

  const stats = useMemo(
    () => [
      { label: t("vpc.stats.securityGroups"), value: groups.length, loading: isLoading },
      {
        label: t("vpc.stats.sgVpcScoped"),
        value: groups.filter((g) => g.network_id).length,
        loading: isLoading,
      },
      {
        label: t("vpc.stats.sgAccountWide"),
        value: groups.filter((g) => !g.network_id).length,
        color: "info" as const,
        loading: isLoading,
      },
    ],
    [t, groups, isLoading],
  )

  const columns = useMemo<ColumnDef<SecurityGroup>[]>(
    () => [
      copyColumn<SecurityGroup>({
        id: "id",
        header: "ID",
        accessor: (g) => `SG-${g.tenant_serial}`,
        responsive: "lg",
      }),
      nameColumn<SecurityGroup>({
        header: t("vpc.columns.name"),
        accessor: (g) => g.name,
      }),
      statusColumn<SecurityGroup>({
        header: t("vpc.columns.status"),
        accessor: (g) => g.status,
        pulse: (g) => g.status === "available",
      }),
      {
        id: "vpc",
        accessorFn: (g: SecurityGroup) =>
          g.network_id ? (vpcNames.get(g.network_id) ?? g.network_id) : "",
        header: () => t("vpc.columns.vpc"),
        meta: { responsive: "md" },
        cell: ({ row }) => {
          const g = row.original
          if (!g.network_id) {
            return (
              <Badge
                variant="outline"
                className="font-mono text-[11px] text-status-neutral bg-status-neutral-bg border-status-neutral/25"
              >
                {t("vpc.sgList.accountWide")}
              </Badge>
            )
          }
          return (
            <button
              type="button"
              className="font-mono text-[13px] text-status-info hover:underline"
              onClick={(e) => {
                e.stopPropagation()
                void navigate(VPC_ROUTES.detail(g.network_id))
              }}
            >
              {vpcNames.get(g.network_id) ?? g.network_id}
            </button>
          )
        },
      },
      textColumn<SecurityGroup>({
        id: "description",
        header: t("vpc.columns.description"),
        accessor: (g) => g.description,
        muted: true,
        responsive: "lg",
      }),
      dateColumn<SecurityGroup>({
        header: t("common.created"),
        accessor: (g) => g.created_at,
        responsive: "xl",
      }),
      actionsColumn<SecurityGroup>({
        ariaLabel: t("console.table.actions"),
        actions: () => [
          {
            label: t("vpc.actions.delete"),
            icon: Trash2,
            destructive: true,
            onAction: (g: SecurityGroup) => {
              setToDelete(g)
            },
          },
        ],
      }),
    ],
    [t, vpcNames, navigate],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Lock}
        breadcrumbs={[
          { label: t("console.nav.groups.networking") },
          { label: t("vpc.sgList.title") },
        ]}
        title={t("vpc.sgList.title")}
        description={t("vpc.sgList.subtitle")}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void refetch()}
              disabled={isFetching}
              aria-label={t("common.refresh")}
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button
              className="gap-2"
              onClick={() => void navigate(VPC_ROUTES.SECURITY_GROUPS_CREATE)}
            >
              <Plus className="w-4 h-4" />
              {t("vpc.sgForm.create")}
            </Button>
          </>
        }
      />

      <StatGrid stats={stats} />

      <ResourceTable<SecurityGroup>
        data={filtered}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        getRowId={(group) => group.id}
        onRowClick={(group) => void navigate(VPC_ROUTES.securityGroup(group.id))}
        enableColumnVisibility
        toolbar={
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
              }}
              placeholder={t("vpc.sgList.searchPlaceholder")}
              className="pl-8 h-8 text-[13px]"
            />
          </div>
        }
        emptyState={
          <EmptyState
            icon={Lock}
            title={t("vpc.detail.noSecurityGroups")}
            description={t("vpc.detail.noSecurityGroupsDescription")}
            action={{
              label: t("vpc.sgForm.create"),
              onClick: () => void navigate(VPC_ROUTES.SECURITY_GROUPS_CREATE),
            }}
          />
        }
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={t("vpc.sgDeleteConfirm.title")}
        description={t("vpc.sgDeleteConfirm.description", { name: toDelete?.name ?? "" })}
        confirmLabel={t("vpc.actions.delete")}
        loading={isDeleting}
        onConfirm={() => {
          if (toDelete) {
            deleteGroup(toDelete.id, {
              onSuccess: () => {
                setToDelete(null)
              },
            })
          }
        }}
      />
    </div>
  )
}
