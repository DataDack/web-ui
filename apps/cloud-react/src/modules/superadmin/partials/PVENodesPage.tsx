import { useMemo, useState } from "react"

import { actionsColumn, Button, DataTable, EmptyState, statusColumn } from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Pencil,
  Plus,
  RefreshCw,
  Server,
  Cpu,
  Monitor,
  HardDrive,
  Globe,
  Trash2,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { ConfirmDialog, PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import {
  useAdminAvailabilityZones,
  useAdminPVENodes,
  useDeletePVENode,
  useRefreshPVENodes,
} from "../superadmin.hooks"
import type { PVENode } from "../superadmin.types"

export function PVENodesPage() {
  useScreen("superadmin.p-v-e-nodes")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: nodes = [], isLoading, isError, refetch, isFetching } = useAdminPVENodes()
  const { data: azs = [] } = useAdminAvailabilityZones()
  const refreshMetrics = useRefreshPVENodes()
  const { mutate: removeNode, isPending: isDeleting } = useDeletePVENode()

  const [deleting, setDeleting] = useState<PVENode | null>(null)

  const azName = useMemo(() => {
    const byId = new Map(azs.map((a) => [a.id, a.code]))
    return (id: string) => byId.get(id) ?? id
  }, [azs])

  const openCreate = () => void navigate("/admin/pve-nodes/new")
  const openEdit = (node: PVENode) => void navigate(`/admin/pve-nodes/${node.id}/edit`)

  const columns = useMemo<ColumnDef<PVENode>[]>(
    () => [
      {
        id: "name",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("superAdmin.pveNodes.fields.name")}
          </span>
        ),
        accessorFn: (n) => n.name,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-semibold text-[14px] leading-tight text-foreground flex items-center gap-2">
              <Server className="size-4 text-muted-foreground" />
              {row.original.name}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground mt-0.5 ml-6">
              IP: {row.original.ip_address}
            </span>
          </div>
        ),
      },
      {
        id: "availability_zone",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("superAdmin.pveNodes.fields.availabilityZone")}
          </span>
        ),
        accessorFn: (n) => n.availability_zone_id,
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5 font-medium text-[13px] text-foreground">
            <Globe className="size-3.5 text-muted-foreground" />
            {azName(row.original.availability_zone_id)}
          </span>
        ),
        meta: { responsive: "lg" },
      },
      {
        id: "cpu",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            <Cpu className="size-3.5 inline mr-1" />
            {t("superAdmin.pveNodes.fields.cpu")}
          </span>
        ),
        accessorFn: (n) => n.cpu_used,
        cell: ({ row }) => {
          const { cpu_used: cpuUsed, cpu_total: cpuTotal } = row.original
          const percentage = cpuTotal > 0 ? (cpuUsed / cpuTotal) * 100 : 0
          const isHigh = percentage > 85
          return (
            <div className="flex flex-col gap-1 w-24">
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span>{cpuUsed}</span>
                <span className="text-muted-foreground">/ {cpuTotal}</span>
              </div>
              <div className="h-1.5 w-full bg-accent/30 rounded-full overflow-hidden">
                <div
                  className={`h-full ${isHigh ? "bg-destructive/80" : "bg-status-info/70"}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        },
        meta: { responsive: "lg" },
      },
      {
        id: "ram",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            <Monitor className="size-3.5 inline mr-1" />
            {t("superAdmin.pveNodes.fields.ram")}
          </span>
        ),
        accessorFn: (n) => n.ram_used_mb,
        cell: ({ row }) => {
          const { ram_used_mb: ramUsedMb, ram_total_mb: ramTotalMb } = row.original
          const percentage = ramTotalMb > 0 ? (ramUsedMb / ramTotalMb) * 100 : 0
          const isHigh = percentage > 85
          return (
            <div className="flex flex-col gap-1 w-24">
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span>{(ramUsedMb / 1024).toFixed(1)}GB</span>
                <span className="text-muted-foreground">/ {(ramTotalMb / 1024).toFixed(1)}GB</span>
              </div>
              <div className="h-1.5 w-full bg-accent/30 rounded-full overflow-hidden">
                <div
                  className={`h-full ${isHigh ? "bg-destructive/80" : "bg-status-success/70"}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        },
        meta: { responsive: "xl" },
      },
      {
        id: "storage",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            <HardDrive className="size-3.5 inline mr-1" />
            {t("superAdmin.pveNodes.fields.storage")}
          </span>
        ),
        accessorFn: (n) => n.storage_used_gb,
        cell: ({ row }) => {
          const { storage_used_gb: storageUsedGb, storage_total_gb: storageTotalGb } = row.original
          const percentage = storageTotalGb > 0 ? (storageUsedGb / storageTotalGb) * 100 : 0
          const isHigh = percentage > 85
          return (
            <div className="flex flex-col gap-1 w-24">
              <div className="flex justify-between items-center text-[11px] font-mono">
                <span>{storageUsedGb}GB</span>
                <span className="text-muted-foreground">/ {storageTotalGb}GB</span>
              </div>
              <div className="h-1.5 w-full bg-accent/30 rounded-full overflow-hidden">
                <div
                  className={`h-full ${isHigh ? "bg-destructive/80" : "bg-brand-gold/70"}`}
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )
        },
        meta: { responsive: "xl" },
      },
      statusColumn<PVENode>({
        header: t("superAdmin.pveNodes.fields.status"),
        accessor: (n) => n.status,
      }),
      actionsColumn<PVENode>({
        ariaLabel: t("console.table.actions"),
        actions: () => [
          { label: t("superAdmin.actions.edit"), icon: Pencil, onAction: openEdit },
          {
            label: t("superAdmin.actions.delete"),
            icon: Trash2,
            destructive: true,
            onAction: (node: PVENode) => {
              setDeleting(node)
            },
          },
        ],
      }),
    ],
    [t, azName],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Server}
        breadcrumbs={[{ label: t("superAdmin.title") }, { label: t("superAdmin.pveNodes.title") }]}
        title={t("superAdmin.pveNodes.title")}
        description={t("superAdmin.pveNodes.formSubtitle")}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                refreshMetrics.mutate()
              }}
              disabled={refreshMetrics.isPending || isFetching}
              aria-label={t("common.refresh")}
              loading={refreshMetrics.isPending}
            >
              <RefreshCw
                className={`w-4 h-4 ${isFetching || refreshMetrics.isPending ? "animate-spin" : ""}`}
              />
            </Button>
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              {t("superAdmin.pveNodes.add")}
            </Button>
          </>
        }
      />

      <DataTable<PVENode>
        data={nodes}
        columns={columns}
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        getRowId={(n) => n.id}
        onRowClick={openEdit}
        empty={
          <EmptyState
            icon={Server}
            title={t("superAdmin.pveNodes.empty")}
            description={t("superAdmin.pveNodes.emptySubtitle")}
            action={{ label: t("superAdmin.pveNodes.add"), onClick: openCreate }}
          />
        }
        onRefresh={() => void refetch()}
        refreshLabel={t("console.table.refresh")}
        refreshing={isFetching}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={t("superAdmin.pveNodes.deleteTitle")}
        description={t("superAdmin.pveNodes.deleteConfirm", { name: deleting?.name ?? "" })}
        confirmLabel={t("superAdmin.actions.delete")}
        loading={isDeleting}
        onConfirm={() => {
          if (!deleting) return
          removeNode(
            { id: deleting.id },
            {
              onSuccess: () => {
                setDeleting(null)
              },
            },
          )
        }}
      />
    </div>
  )
}
