import { useCallback, useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { GitBranch, RefreshCw, Search, Trash2 } from "lucide-react"
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
import { useAvailabilityZoneMap } from "@/modules/catalog/catalog.hooks"
import { useScreen } from "@/services/api/screen"

import { Badge } from "@datadack/serverless-ui"

import { VPC_ROUTES } from "../vpc.constants"
import { useAllSubnets, useDeleteSubnet, useVPCs } from "../vpc.hooks"
import type { Subnet } from "../vpc.types"
import { formatAvailableIps } from "../vpc.utils"

function VisibilityChip({ isPublic }: Readonly<{ isPublic: boolean }>) {
  const { t } = useTranslation()
  return (
    <Badge
      variant="outline"
      className={
        isPublic
          ? "font-mono text-[11px] text-status-info bg-status-info-bg border-status-info/25"
          : "font-mono text-[11px] text-status-neutral bg-status-neutral-bg border-status-neutral/25"
      }
    >
      {isPublic ? t("vpc.badges.public") : t("vpc.badges.private")}
    </Badge>
  )
}

export function SubnetListPage() {
  useScreen("vpc.subnet-list")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: subnets = [], isLoading, isError, refetch, isFetching } = useAllSubnets()
  const { data: networks = [] } = useVPCs()
  const { mutate: deleteSubnet, isPending: isDeleting } = useDeleteSubnet()
  const azMap = useAvailabilityZoneMap()

  const [query, setQuery] = useState("")
  const [toDelete, setToDelete] = useState<Subnet | null>(null)

  // Resolve a subnet's parent VPC name for display; fall back to the raw id.
  const vpcNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const n of networks) map.set(n.id, n.name)
    return map
  }, [networks])

  // The backend returns `availability_zone_id` (a uuid); resolve it to the
  // zone's display name via the region catalog.
  const azLabel = useCallback(
    (s: Subnet) => (s.availability_zone_id ? azMap.get(s.availability_zone_id)?.name : undefined),
    [azMap],
  )

  const filtered = useMemo(() => {
    if (!query.trim()) return subnets
    const q = query.toLowerCase()
    return subnets.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.id.includes(q) ||
        s.cidr.includes(q) ||
        (azLabel(s) ?? "").toLowerCase().includes(q) ||
        (vpcNames.get(s.network_id) ?? "").toLowerCase().includes(q),
    )
  }, [subnets, query, vpcNames, azLabel])

  const stats = useMemo(
    () => [
      { label: t("vpc.stats.subnets"), value: subnets.length, loading: isLoading },
      {
        label: t("vpc.stats.publicSubnets"),
        value: subnets.filter((s) => s.is_public).length,
        loading: isLoading,
      },
      {
        label: t("vpc.stats.privateSubnets"),
        value: subnets.filter((s) => !s.is_public).length,
        color: "info" as const,
        loading: isLoading,
      },
    ],
    [t, subnets, isLoading],
  )

  const columns = useMemo<ColumnDef<Subnet>[]>(
    () => [
      copyColumn<Subnet>({
        id: "id",
        header: "ID",
        accessor: (s) => `SUBNET-${s.tenant_serial}`,
        responsive: "lg",
      }),
      nameColumn<Subnet>({ header: t("vpc.columns.name"), accessor: (s) => s.name }),
      statusColumn<Subnet>({
        header: t("vpc.columns.state"),
        accessor: (s) => s.status ?? "available",
        pulse: (s) => (s.status ?? "available") === "available",
      }),
      {
        id: "vpc",
        accessorFn: (s: Subnet) => vpcNames.get(s.network_id) ?? s.network_id,
        header: () => t("vpc.columns.vpc"),
        meta: { responsive: "md" },
        cell: ({ row }) => {
          const s = row.original
          const label = vpcNames.get(s.network_id) ?? s.network_id
          return (
            <button
              type="button"
              className="font-mono text-[13px] text-status-info hover:underline"
              onClick={(e) => {
                e.stopPropagation()
                void navigate(VPC_ROUTES.detail(s.network_id))
              }}
            >
              {label}
            </button>
          )
        },
      },
      copyColumn<Subnet>({
        id: "cidr",
        header: t("vpc.columns.ipv4Cidr"),
        accessor: (s) => s.cidr,
      }),
      textColumn<Subnet>({
        id: "availableIps",
        header: t("vpc.columns.availableIps"),
        accessor: (s) => formatAvailableIps(s.cidr, s.available_ips),
        mono: true,
        muted: true,
        responsive: "lg",
      }),
      textColumn<Subnet>({
        id: "zone",
        header: t("vpc.columns.availabilityZone"),
        accessor: (s) => azLabel(s),
        muted: true,
        responsive: "md",
      }),
      {
        id: "visibility",
        accessorFn: (s: Subnet) => (s.is_public ? 1 : 0),
        header: () => t("vpc.columns.visibility"),
        meta: { responsive: "lg" },
        cell: ({ row }) => <VisibilityChip isPublic={row.original.is_public} />,
      },
      dateColumn<Subnet>({
        header: t("common.created"),
        accessor: (s) => s.created_at,
        responsive: "xl",
      }),
      actionsColumn<Subnet>({
        ariaLabel: t("console.table.actions"),
        actions: () => [
          {
            label: t("vpc.actions.delete"),
            icon: Trash2,
            destructive: true,
            onAction: (s: Subnet) => {
              setToDelete(s)
            },
          },
        ],
      }),
    ],
    [t, vpcNames, navigate, azLabel],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={GitBranch}
        breadcrumbs={[
          { label: t("console.nav.groups.networking") },
          { label: t("vpc.subnets.title") },
        ]}
        title={t("vpc.subnets.title")}
        description={t("vpc.subnets.subtitle")}
        actions={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label={t("common.refresh")}
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        }
      />

      <StatGrid stats={stats} />

      <ResourceTable<Subnet>
        data={filtered}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        getRowId={(subnet) => subnet.id}
        onRowClick={(subnet) => void navigate(VPC_ROUTES.detail(subnet.network_id))}
        enableColumnVisibility
        toolbar={
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
              }}
              placeholder={t("vpc.subnets.searchPlaceholder")}
              className="pl-8 h-8 text-[13px]"
            />
          </div>
        }
        emptyState={
          <EmptyState
            icon={GitBranch}
            title={t("vpc.detail.noSubnets")}
            description={t("vpc.subnets.empty")}
          />
        }
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={t("vpc.subnetDeleteConfirm.title")}
        description={t("vpc.subnetDeleteConfirm.description", {
          name: toDelete?.name ?? "",
        })}
        confirmLabel={t("vpc.actions.delete")}
        loading={isDeleting}
        onConfirm={() => {
          if (toDelete) {
            deleteSubnet(toDelete.id, {
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
