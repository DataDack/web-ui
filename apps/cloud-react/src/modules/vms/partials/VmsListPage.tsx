import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import {
  Cpu,
  Globe,
  HardDrive,
  Monitor,
  Play,
  Plus,
  RefreshCw,
  RotateCw,
  Search,
  Server,
  Shield,
  Square,
  Trash2,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import {
  actionsColumn,
  ConfirmDialog,
  dateColumn,
  EmptyState,
  PageHeader,
  ResourceTable,
  StatGrid,
  statusColumn,
} from "@/components/console"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { OSIcon } from "@/modules/catalog/os-icons"
import { useScreen } from "@/services/api/screen"

import { Badge } from "@datadack/serverless-ui"

import { VMS_ROUTES, vmDisplayStatus } from "../vms.constants"
import { useDeleteInstance, useInstanceAction, useInstances } from "../vms.hooks"
import type { Instance } from "../vms.types"

export function VmsListPage() {
  useScreen("vms.vms-list")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: instances = [], isLoading, isError, refetch, isFetching } = useInstances()
  const { mutate: runAction } = useInstanceAction()
  const { mutate: deleteInstance, isPending: isDeleting } = useDeleteInstance()

  const [query, setQuery] = useState("")
  const [toDelete, setToDelete] = useState<Instance[]>([])

  const filtered = useMemo(() => {
    if (!query.trim()) return instances
    const q = query.toLowerCase()
    return instances.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.private_ip.includes(q) ||
        i.public_ip.includes(q) ||
        i.machine_type.includes(q) ||
        i.zone.includes(q),
    )
  }, [instances, query])

  const stats = useMemo(
    () => [
      { label: t("vms.stats.total"), value: instances.length, loading: isLoading },
      {
        // Provisioning is real now: running means the guest is up and
        // reachable, while pending/starting are still in flight.
        label: t("status.running"),
        value: instances.filter(
          (i) => i.status === "pending" || i.status === "starting" || i.status === "running",
        ).length,
        color: "info" as const,
        loading: isLoading,
      },
      {
        label: t("status.stopped"),
        value: instances.filter((i) => i.status === "stopped").length,
        loading: isLoading,
      },
      {
        label: t("status.error"),
        value: instances.filter((i) => i.status === "error").length,
        color: "danger" as const,
        loading: isLoading,
      },
    ],
    [instances, isLoading, t],
  )

  const columns = useMemo<ColumnDef<Instance>[]>(
    () => [
      {
        id: "name",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("vms.columns.name")}
          </span>
        ),
        accessorFn: (i) => i.name,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <OSIcon
              osFamily={row.original.os_family}
              iconUrl={row.original.os_icon_url}
              className="size-6 shrink-0"
            />
            <div className="flex flex-col">
              <span className="font-semibold text-[14px] leading-tight text-foreground">
                {row.original.name}
              </span>
              <span className="text-[11px] font-mono text-muted-foreground mt-0.5">
                VM-{row.original.tenant_serial}
              </span>
            </div>
          </div>
        ),
      },
      statusColumn<Instance>({
        header: t("vms.columns.status"),
        accessor: (i) => vmDisplayStatus(i.status),
        pulse: (i) => i.status === "running",
      }),
      {
        id: "location",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("vms.columns.zone")}
          </span>
        ),
        accessorFn: (i) => i.zone,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="flex items-center gap-1.5 font-medium text-[13px] text-foreground">
              <Globe className="size-3.5 text-muted-foreground" />
              {row.original.region}
            </span>
            <span className="text-[11px] text-muted-foreground ml-5">{row.original.zone}</span>
          </div>
        ),
        meta: { responsive: "md" },
      },
      {
        id: "specs",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("vms.columns.machineType")}
          </span>
        ),
        accessorFn: (i) => i.machine_type,
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <Badge
              variant="outline"
              className="w-fit font-mono text-[11px] bg-accent/20 border-accent/40 text-accent-foreground"
            >
              {row.original.machine_type}
            </Badge>
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
              <span className="flex items-center gap-1">
                <Cpu className="size-3" /> {row.original.cpu_count}
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <Monitor className="size-3" /> {row.original.memory_gb}GB
              </span>
            </div>
          </div>
        ),
        meta: { responsive: "lg" },
      },
      {
        id: "networking",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">Networking</span>
        ),
        accessorFn: (i) => i.private_ip,
        cell: ({ row }) => (
          <div className="flex flex-col gap-1 font-mono text-[11px]">
            {row.original.public_ip ? (
              <div className="flex items-center gap-1.5 text-status-info">
                <Globe className="size-3" />
                <span>{row.original.public_ip}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Globe className="size-3 opacity-50" />
                <span className="opacity-50">No Public IP</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Shield className={row.original.private_ip ? "size-3" : "size-3 opacity-50"} />
              <span className={row.original.private_ip ? undefined : "opacity-50"}>
                {row.original.private_ip || "No Private IP"}
              </span>
            </div>
          </div>
        ),
        meta: { responsive: "xl" },
      },
      {
        id: "details",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("vms.columns.details", "Details")}
          </span>
        ),
        accessorFn: (i) => i.disk_size_gb,
        cell: ({ row }) => (
          <div className="flex flex-col gap-1 font-mono text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5 text-foreground">
              <HardDrive className="size-3" />
              {row.original.disk_size_gb ? `${String(row.original.disk_size_gb)} GB` : "—"}
            </span>
            <span className="flex items-center gap-1.5">
              <OSIcon
                osFamily={row.original.os_family}
                iconUrl={row.original.os_icon_url}
                className="size-3 shrink-0"
              />
              {row.original.os}
            </span>
            <span className="flex items-center gap-1.5">
              <Cpu className="size-3" />
              {row.original.architecture}
            </span>
          </div>
        ),
        meta: { responsive: "lg" },
      },
      dateColumn<Instance>({
        header: t("common.created"),
        accessor: (i) => i.created_at,
        responsive: "xl",
      }),
      actionsColumn<Instance>({
        ariaLabel: t("console.table.actions"),
        actions: (instance) => [
          ...(instance.status === "stopped"
            ? [
                {
                  label: t("vms.actions.start"),
                  icon: Play,
                  onAction: (i: Instance) => {
                    runAction({ id: i.id, action: "start" })
                  },
                },
              ]
            : []),
          ...(instance.status === "running"
            ? [
                {
                  label: t("vms.actions.stop"),
                  icon: Square,
                  onAction: (i: Instance) => {
                    runAction({ id: i.id, action: "stop" })
                  },
                },
                {
                  label: t("vms.actions.restart"),
                  icon: RotateCw,
                  onAction: (i: Instance) => {
                    runAction({ id: i.id, action: "restart" })
                  },
                },
              ]
            : []),
          {
            label: t("vms.actions.terminate"),
            icon: Trash2,
            destructive: true,
            onAction: (i: Instance) => {
              setToDelete([i])
            },
          },
        ],
      }),
    ],
    [runAction, t],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Server}
        breadcrumbs={[{ label: t("console.nav.groups.compute") }, { label: t("vms.title") }]}
        title={t("vms.title")}
        description={t("vms.subtitle")}
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
            <Button className="gap-2" onClick={() => void navigate(VMS_ROUTES.CREATE)}>
              <Plus className="w-4 h-4" />
              {t("vms.create")}
            </Button>
          </>
        }
      />

      <StatGrid stats={stats} />

      <ResourceTable<Instance>
        data={filtered}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        getRowId={(instance) => instance.id}
        onRowClick={(instance) => void navigate(VMS_ROUTES.detail(instance.id))}
        enableSelection
        enableColumnVisibility
        toolbar={
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
              }}
              placeholder={t("vms.searchPlaceholder")}
              className="pl-8 h-8 text-[13px]"
            />
          </div>
        }
        bulkActions={(rows) => [
          {
            label: t("vms.actions.stop"),
            icon: Square,
            onAction: () => {
              for (const row of rows) {
                if (row.status === "running") {
                  runAction({ id: row.id, action: "stop" })
                }
              }
            },
          },
          {
            label: t("vms.actions.terminate"),
            icon: Trash2,
            destructive: true,
            onAction: () => {
              setToDelete(rows)
            },
          },
        ]}
        emptyState={
          <EmptyState
            icon={Server}
            title={t("vms.empty")}
            description={t("vms.emptySubtitle")}
            action={{
              label: t("vms.create"),
              onClick: () => void navigate(VMS_ROUTES.CREATE),
            }}
          />
        }
      />

      <ConfirmDialog
        open={toDelete.length > 0}
        onOpenChange={(open) => {
          if (!open) setToDelete([])
        }}
        title={t("vms.terminateConfirm.title", { count: toDelete.length })}
        description={
          <>
            {t("vms.terminateConfirm.description", {
              count: toDelete.length,
              name: toDelete[0]?.name ?? "",
            })}
            {toDelete.some((i) => i.termination_protection) && (
              <span className="mt-2 block font-medium text-destructive">
                {t("vms.terminateConfirm.protectionWarning", {
                  count: toDelete.filter((i) => i.termination_protection).length,
                  name: toDelete.find((i) => i.termination_protection)?.name ?? "",
                })}
              </span>
            )}
          </>
        }
        confirmLabel={t("vms.actions.terminate")}
        loading={isDeleting}
        onConfirm={() => {
          for (const instance of toDelete) {
            deleteInstance(instance.id)
          }
          setToDelete([])
        }}
      />
    </div>
  )
}
