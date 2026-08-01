import { useMemo } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Cpu, Plus, RefreshCw, Monitor, Globe, Pencil } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { actionsColumn, EmptyState, PageHeader, ResourceTable } from "@/components/console"
import { Button } from "@/components/ui/button"
import { useScreen } from "@/services/api/screen"

import { Badge } from "@datadack/serverless-ui"

import { ActiveBadge } from "../components/ActiveBadge"
import { useAdminAvailabilityZones, useAdminVMPrices } from "../superadmin.hooks"
import type { VMPrice } from "../superadmin.types"

export function VMPricesPage() {
  useScreen("superadmin.v-m-prices")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: prices = [], isLoading, isError, refetch, isFetching } = useAdminVMPrices()
  const { data: azs = [] } = useAdminAvailabilityZones()

  const azName = useMemo(() => {
    const byId = new Map(azs.map((a) => [a.id, a.code]))
    return (id: string | number) => byId.get(String(id)) ?? String(id)
  }, [azs])

  const openCreate = () => void navigate("/admin/vm-prices/new")
  const openEdit = (price: VMPrice) => void navigate(`/admin/vm-prices/${price.id}/edit`)

  const columns = useMemo<ColumnDef<VMPrice>[]>(
    () => [
      {
        id: "name",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("superAdmin.vmPrices.fields.name")}
          </span>
        ),
        accessorFn: (p) => p.name,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-semibold text-[14px] leading-tight text-foreground">
              {row.original.display_name || row.original.name}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground truncate">
              {row.original.sku || row.original.name}
            </div>
          </div>
        ),
      },
      {
        id: "family",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("superAdmin.vmPrices.fields.family")}
          </span>
        ),
        accessorFn: (p) => p.family,
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className="font-mono text-[10px] uppercase bg-accent/10 border-accent/30 text-accent-foreground"
          >
            {row.original.family}
          </Badge>
        ),
        meta: { responsive: "md" },
      },
      {
        id: "generation",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">Generation</span>
        ),
        accessorFn: (p) => p.generation,
        cell: ({ row }) => (
          <span className="font-mono text-[12px] text-muted-foreground">
            {row.original.generation || "—"} / {row.original.architecture}
          </span>
        ),
        meta: { responsive: "xl" },
      },
      {
        id: "flavor",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("superAdmin.vmPrices.fields.flavor")}
          </span>
        ),
        accessorFn: (p) => p.vcpus,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono bg-surface-container/30 px-2 py-1 rounded-md w-fit border border-border-glass">
            <span className="flex items-center gap-1">
              <Cpu className="size-3 text-status-info" /> {row.original.vcpus} vCPU
            </span>
            <span className="text-border-glass">|</span>
            <span className="flex items-center gap-1">
              <Monitor className="size-3 text-brand-gold" /> {row.original.ram_gb} GB
            </span>
          </div>
        ),
        meta: { responsive: "lg" },
      },
      {
        id: "limits",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">Limits</span>
        ),
        accessorFn: (p) => p.max_nics,
        cell: ({ row }) => (
          <span className="font-mono text-[12px] text-muted-foreground">
            {row.original.bandwidth_gbps} Gbps · {row.original.max_nics} NIC ·{" "}
            {row.original.max_data_disks} disks
          </span>
        ),
        meta: { responsive: "xl" },
      },
      {
        id: "availability_zone",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("superAdmin.vmPrices.fields.availabilityZone")}
          </span>
        ),
        accessorFn: (p) => p.availability_zone_id,
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
            <Globe className="size-3.5" />
            {azName(row.original.availability_zone_id)}
          </span>
        ),
        meta: { responsive: "xl" },
      },
      {
        id: "price_hourly",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("superAdmin.vmPrices.fields.priceHourly")}
          </span>
        ),
        accessorFn: (p) => p.price_hourly,
        cell: ({ row }) => (
          <span className="font-mono text-[13px]">
            {row.original.currency}{" "}
            <span className="font-semibold">{row.original.price_hourly}</span>
          </span>
        ),
      },
      {
        id: "price_monthly",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">Monthly / reserved</span>
        ),
        accessorFn: (p) => p.price_monthly,
        cell: ({ row }) => (
          <span className="font-mono text-[13px] text-muted-foreground">
            {row.original.currency} {row.original.price_monthly}
            {row.original.price_reserved_monthly > 0
              ? ` / ${row.original.price_reserved_monthly}`
              : ""}
          </span>
        ),
        meta: { responsive: "md" },
      },
      {
        id: "billing",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">Billing</span>
        ),
        accessorFn: (p) => p.billing_unit,
        cell: ({ row }) => (
          <span className="font-mono text-[12px] text-muted-foreground">
            {row.original.billing_unit} · {row.original.billing_increment_seconds}s
          </span>
        ),
        meta: { responsive: "lg" },
      },
      {
        id: "is_active",
        header: () => t("superAdmin.fields.active"),
        enableSorting: false,
        cell: ({ row }) => <ActiveBadge active={row.original.is_active} />,
      },
      actionsColumn<VMPrice>({
        ariaLabel: t("console.table.actions"),
        actions: () => [{ label: t("superAdmin.actions.edit"), icon: Pencil, onAction: openEdit }],
      }),
    ],
    [t, azName],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Cpu}
        breadcrumbs={[{ label: t("superAdmin.title") }, { label: t("superAdmin.vmPrices.title") }]}
        title={t("superAdmin.vmPrices.title")}
        description={t("superAdmin.vmPrices.formSubtitle")}
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
            <Button className="gap-2" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              {t("superAdmin.vmPrices.add")}
            </Button>
          </>
        }
      />

      <ResourceTable<VMPrice>
        data={prices}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        getRowId={(p) => p.id}
        onRowClick={openEdit}
        emptyState={
          <EmptyState
            icon={Cpu}
            title={t("superAdmin.vmPrices.empty")}
            description={t("superAdmin.vmPrices.emptySubtitle")}
            action={{ label: t("superAdmin.vmPrices.add"), onClick: openCreate }}
          />
        }
      />
    </div>
  )
}
