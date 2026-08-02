import { useCallback, useMemo, useState } from "react"

import {
  actionsColumn,
  Badge,
  Button,
  DataTable,
  dateColumn,
  EmptyState,
  statusColumn,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { HardDrive, Link2, Plus, RefreshCw, Trash2, Unlink } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { ConfirmDialog, PageHeader, StatGrid } from "@/components/console"
import { VMS_ROUTES } from "@/modules/vms/vms.constants"
import { useInstances } from "@/modules/vms/vms.hooks"
import { useScreen } from "@/services/api/screen"

import { useDeleteDisk, useDetachDisk, useDisks } from "../disks.hooks"
import type { Disk } from "../disks.types"
import { AttachDiskDialog } from "./AttachDiskDialog"
import { CreateDiskSheet } from "./CreateDiskSheet"

export function DisksListPage() {
  useScreen("disks.disks-list")
  const { t } = useTranslation()
  const { data: disks = [], isLoading, isError, refetch, isFetching } = useDisks()
  const { data: instances = [] } = useInstances()
  const { mutate: detachDisk, isPending: isDetaching } = useDetachDisk()
  const { mutate: deleteDisk, isPending: isDeleting } = useDeleteDisk()

  const [createOpen, setCreateOpen] = useState(false)
  const [diskToAttach, setDiskToAttach] = useState<Disk | null>(null)
  const [diskToDetach, setDiskToDetach] = useState<Disk | null>(null)
  const [diskToDelete, setDiskToDelete] = useState<Disk | null>(null)

  const instanceName = useCallback(
    (id: string) => instances.find((i) => i.id === id)?.name,
    [instances],
  )

  const instanceStatus = useCallback(
    (id: string) => instances.find((i) => i.id === id)?.status,
    [instances],
  )

  const stats = useMemo(
    () => [
      { label: t("disks.stats.total"), value: disks.length, loading: isLoading },
      {
        label: t("status.attached"),
        value: disks.filter((d) => d.status === "attached").length,
        color: "success" as const,
        loading: isLoading,
      },
      {
        label: t("status.available"),
        value: disks.filter((d) => d.status === "available").length,
        loading: isLoading,
      },
      {
        label: t("disks.stats.capacity"),
        value: disks.reduce((sum, d) => sum + d.size_gb, 0),
        format: (v: number) => `${(v / 1024).toFixed(1)} TB`,
        loading: isLoading,
      },
    ],
    [disks, isLoading, t],
  )

  const columns = useMemo<ColumnDef<Disk>[]>(
    () => [
      {
        id: "name",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("disks.columns.name")}
          </span>
        ),
        accessorFn: (d) => d.name,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-semibold text-[14px] leading-tight text-foreground">
              {row.original.name}
            </span>
            <span className="text-[11px] font-mono text-muted-foreground mt-0.5">
              DISK-{row.original.tenant_serial}
            </span>
          </div>
        ),
      },
      statusColumn<Disk>({
        header: t("disks.columns.status"),
        accessor: (d) => d.status,
        pulse: (d) => d.status === "attached",
      }),
      {
        id: "type_and_size",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("disks.columns.size")}
          </span>
        ),
        accessorFn: (d) => d.size_gb,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1 w-24">
              <span className="font-mono text-[13px] font-medium">{row.original.size_gb} GB</span>
              <div className="h-1.5 w-full bg-accent/30 rounded-full overflow-hidden">
                <div className="h-full bg-status-info/70" style={{ width: "100%" }} />
              </div>
            </div>
            <Badge variant="outline" className="font-mono text-[10px] uppercase bg-accent/10">
              {row.original.volume_class || row.original.disk_type}
            </Badge>
            {row.original.multi_attach && (
              <Badge
                variant="outline"
                className="text-[10px] bg-accent/20 border-status-info text-status-info"
              >
                Multi-Attach
              </Badge>
            )}
          </div>
        ),
      },
      {
        id: "zone",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("vms.columns.zone")}
          </span>
        ),
        accessorFn: (d) => d.zone,
        cell: ({ row }) => (
          <span className="text-muted-foreground text-[13px]">{row.original.zone}</span>
        ),
        meta: { responsive: "lg" },
      },
      {
        id: "instance",
        header: () => t("disks.columns.instance"),
        enableSorting: false,
        meta: { interactive: true },
        cell: ({ row }) => {
          const name = instanceName(row.original.instance_id)
          if (!row.original.instance_id || !name) {
            return <span className="text-muted-foreground">—</span>
          }
          return (
            <Link
              to={VMS_ROUTES.detail(row.original.instance_id)}
              className="font-mono text-[13px] text-status-info hover:underline"
            >
              {name}
            </Link>
          )
        },
      },
      dateColumn<Disk>({
        header: t("common.created"),
        accessor: (d) => d.created_at,
        responsive: "xl",
      }),
      actionsColumn<Disk>({
        ariaLabel: t("console.table.actions"),
        actions: (disk) => {
          // The boot disk can't be detached while its instance runs;
          // an attached disk (boot or data) can't be deleted at all.
          const bootLocked = disk.is_boot && instanceStatus(disk.instance_id) === "running"
          return [
            ...(disk.status === "available"
              ? [
                  {
                    label: t("disks.actions.attach"),
                    icon: Link2,
                    onAction: (d: Disk) => {
                      setDiskToAttach(d)
                    },
                  },
                ]
              : []),
            ...(disk.status === "attached" && !bootLocked
              ? [
                  {
                    label: t("disks.actions.detach"),
                    icon: Unlink,
                    onAction: (d: Disk) => {
                      setDiskToDetach(d)
                    },
                  },
                ]
              : []),
            ...(disk.status === "attached"
              ? []
              : [
                  {
                    label: t("disks.actions.delete"),
                    icon: Trash2,
                    destructive: true,
                    onAction: (d: Disk) => {
                      setDiskToDelete(d)
                    },
                  },
                ]),
          ]
        },
      }),
    ],
    [instanceName, instanceStatus, t],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={HardDrive}
        breadcrumbs={[{ label: t("console.nav.groups.storage") }, { label: t("disks.title") }]}
        title={t("disks.title")}
        description={t("disks.subtitle")}
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
              onClick={() => {
                setCreateOpen(true)
              }}
            >
              <Plus className="w-4 h-4" />
              {t("disks.create")}
            </Button>
          </>
        }
      />

      <StatGrid stats={stats} />

      <DataTable<Disk>
        data={disks}
        columns={columns}
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        getRowId={(disk) => disk.id}
        empty={
          <EmptyState
            icon={HardDrive}
            title={t("disks.empty")}
            description={t("disks.emptySubtitle")}
            action={{
              label: t("disks.create"),
              onClick: () => {
                setCreateOpen(true)
              },
            }}
          />
        }
        onRefresh={() => void refetch()}
        refreshLabel={t("console.table.refresh")}
        refreshing={isFetching}
      />

      <CreateDiskSheet open={createOpen} onOpenChange={setCreateOpen} />

      <AttachDiskDialog
        disk={diskToAttach}
        onOpenChange={(open) => {
          if (!open) setDiskToAttach(null)
        }}
      />

      <ConfirmDialog
        open={!!diskToDetach}
        onOpenChange={(open) => {
          if (!open) setDiskToDetach(null)
        }}
        title={t("disks.detachConfirm.title")}
        description={t("disks.detachConfirm.description", {
          name: diskToDetach?.name ?? "",
          instance: instanceName(diskToDetach?.instance_id ?? "") ?? "",
        })}
        confirmLabel={t("disks.actions.detach")}
        destructive={false}
        loading={isDetaching}
        onConfirm={() => {
          if (!diskToDetach) return
          detachDisk(diskToDetach.id, {
            onSuccess: () => {
              setDiskToDetach(null)
            },
          })
        }}
      />

      <ConfirmDialog
        open={!!diskToDelete}
        onOpenChange={(open) => {
          if (!open) setDiskToDelete(null)
        }}
        title={t("disks.deleteConfirm.title")}
        description={t("disks.deleteConfirm.description", {
          name: diskToDelete?.name ?? "",
        })}
        confirmLabel={t("disks.actions.delete")}
        loading={isDeleting}
        onConfirm={() => {
          if (!diskToDelete) return
          deleteDisk(diskToDelete.id, {
            onSuccess: () => {
              setDiskToDelete(null)
            },
          })
        }}
      />
    </div>
  )
}
