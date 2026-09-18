import { useMemo, useState } from "react"

import {
  actionsColumn,
  DataTable,
  dateColumn,
  EmptyState,
  Input,
  nameColumn,
  statusColumn,
  Switch,
  textColumn,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { AlertTriangle, Router as RouterIcon, Search, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { ConfirmDialog, StatGrid } from "@/components/console"

import { VPC_ROUTES } from "../../vpc.constants"
import { useDeleteRouter, useRouters, useUpdateRouter, useVPCs } from "../../vpc.hooks"
import type { Router } from "../../vpc.types"

export function RoutersTab() {
  const { t } = useTranslation()
  const { data: routers = [], isLoading, isError, refetch } = useRouters()
  const { data: vpcs = [] } = useVPCs()
  const { mutate: deleteRouter, isPending: isDeleting } = useDeleteRouter()
  const { mutate: updateRouter, isPending: isUpdating } = useUpdateRouter()

  const [query, setQuery] = useState("")
  const [toDelete, setToDelete] = useState<Router | null>(null)

  const vpcNames = useMemo(() => new Map(vpcs.map((v) => [v.id, v.name])), [vpcs])

  const filtered = useMemo(() => {
    if (!query.trim()) return routers
    const q = query.toLowerCase()
    return routers.filter(
      (r) => r.name.toLowerCase().includes(q) || r.region.toLowerCase().includes(q),
    )
  }, [routers, query])

  const stats = useMemo(
    () => [
      { label: t("routers.stats.total"), value: routers.length, loading: isLoading },
      {
        label: t("routers.stats.available"),
        value: routers.filter((r) => r.status === "available").length,
        color: "info" as const,
        loading: isLoading,
      },
      {
        label: t("routers.stats.degraded"),
        value: routers.filter((r) => r.status === "degraded" || r.status === "failed").length,
        color: "warning" as const,
        loading: isLoading,
      },
    ],
    [t, routers, isLoading],
  )

  const columns = useMemo<ColumnDef<Router>[]>(
    () => [
      nameColumn<Router>({ header: t("routers.columns.name"), accessor: (r) => r.name }),
      statusColumn<Router>({
        header: t("routers.columns.status"),
        accessor: (r) => r.status,
        pulse: (r) => r.status === "pending" || r.status === "deleting",
      }),
      textColumn<Router>({
        id: "region",
        header: t("routers.columns.region"),
        accessor: (r) => r.region,
        mono: true,
      }),
      {
        id: "vpc",
        accessorFn: (r: Router) => vpcNames.get(r.network_id) ?? r.network_id,
        header: () => t("routers.columns.vpc"),
        meta: { responsive: "md", interactive: true },
        cell: ({ row }) => {
          const r = row.original
          if (!r.network_id) return <span className="text-muted-foreground">—</span>
          return (
            <Link
              to={VPC_ROUTES.detail(r.network_id)}
              className="font-mono text-[13px] text-status-info hover:underline"
            >
              {vpcNames.get(r.network_id) ?? r.network_id}
            </Link>
          )
        },
      },
      {
        id: "snat",
        header: () => t("routers.snat.label"),
        cell: ({ row }) => (
          <Switch
            aria-label={t("routers.snat.toggle", { name: row.original.name })}
            checked={row.original.enable_snat}
            disabled={
              isUpdating || row.original.role !== "sdn" || row.original.status === "deleting"
            }
            onCheckedChange={(enableSNAT) => {
              updateRouter({ id: row.original.id, enableSNAT })
            }}
          />
        ),
      },
      textColumn<Router>({
        id: "error",
        header: t("routers.columns.error"),
        accessor: (r) => r.provision_error ?? "",
        responsive: "lg",
      }),
      dateColumn<Router>({
        header: t("common.created"),
        accessor: (r) => r.created_at,
        responsive: "lg",
      }),
      actionsColumn<Router>({
        ariaLabel: t("console.table.actions"),
        actions: () => [
          {
            label: t("routers.actions.delete"),
            icon: Trash2,
            destructive: true,
            onAction: (row) => {
              setToDelete(row)
            },
          },
        ],
      }),
    ],
    [t, vpcNames, isUpdating, updateRouter],
  )

  return (
    <div className="space-y-5">
      <StatGrid stats={stats} className="grid-cols-3" />
      {routers
        .filter((router) => router.provision_error)
        .map((router) => (
          <div
            key={router.id}
            role="status"
            className="flex items-start gap-3 rounded-lg border border-status-warning/30 bg-status-warning/5 p-4"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-warning" />
            <div className="min-w-0 text-sm">
              <p className="font-medium">{router.name}: routing needs attention</p>
              <p className="mt-1 break-words text-muted-foreground">{router.provision_error}</p>
            </div>
          </div>
        ))}

      <DataTable<Router>
        data={filtered}
        columns={columns}
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        getRowId={(r) => r.id}
        columnToolbar
        toolbar={
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
              }}
              aria-label={t("routers.searchPlaceholder")}
              placeholder={t("routers.searchPlaceholder")}
              className="pl-8 h-8 text-[13px]"
            />
          </div>
        }
        empty={
          <EmptyState
            icon={RouterIcon}
            title={t("routers.empty")}
            description={t("routers.emptySubtitle")}
          />
        }
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={t("routers.deleteConfirm.title")}
        description={t("routers.deleteConfirm.description", { name: toDelete?.name ?? "" })}
        confirmLabel={t("routers.actions.delete")}
        loading={isDeleting}
        onConfirm={() => {
          if (toDelete) {
            deleteRouter(toDelete.id, {
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
