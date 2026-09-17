import { useMemo, useState } from "react"

import { actionsColumn, Badge, Button, DataTable, EmptyState } from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Globe, Pencil, Plus, RefreshCw, Scale } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { ActiveBadge } from "../components/ActiveBadge"
import { useAdminAvailabilityZones, useAdminLoadBalancerPrices } from "../superadmin.hooks"
import type { LoadBalancerPrice } from "../superadmin.types"
import { LoadBalancerPriceFormSheet } from "./LoadBalancerPriceFormSheet"

/** Compact numbers the way a rate card reads them: 3000 → 3k, 100000 → 100k. */
function short(value: number) {
  if (value >= 1000 && value % 1000 === 0) return `${String(value / 1000)}k`
  return String(value)
}

/** The dimensions that define one capacity unit, in the order AWS states them.
 *  Rule evaluations only exist on L7 rows, so a zero drops out entirely rather
 *  than reading as "0 rule evaluations included". */
function capacityUnitSummary(p: LoadBalancerPrice) {
  const parts = [
    p.lcu_new_connections_per_sec > 0 ? `${short(p.lcu_new_connections_per_sec)} new/s` : "",
    p.lcu_active_connections_per_min > 0
      ? `${short(p.lcu_active_connections_per_min)} active/min`
      : "",
    p.lcu_processed_gb_per_hour > 0 ? `${String(p.lcu_processed_gb_per_hour)} GB/hr` : "",
    p.lcu_rule_evaluations_per_sec > 0 ? `${short(p.lcu_rule_evaluations_per_sec)} rules/s` : "",
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(" · ") : "—"
}

export function LoadBalancerPricesPage() {
  useScreen("superadmin.lb-prices")
  const { t } = useTranslation()
  const {
    data: prices = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useAdminLoadBalancerPrices()
  const { data: azs = [] } = useAdminAvailabilityZones()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<LoadBalancerPrice | null>(null)

  const azName = useMemo(() => {
    const byId = new Map(azs.map((a) => [a.id, a.code]))
    return (id: string | number) => byId.get(String(id)) ?? String(id)
  }, [azs])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (price: LoadBalancerPrice) => {
    setEditing(price)
    setFormOpen(true)
  }

  const columns = useMemo<ColumnDef<LoadBalancerPrice>[]>(
    () => [
      {
        id: "name",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("superAdmin.lbPrices.fields.name")}
          </span>
        ),
        accessorFn: (p) => p.name,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-semibold text-[14px] leading-tight text-foreground">
              {row.original.name || row.original.sku || "—"}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground truncate">
              {row.original.sku || "—"}
            </div>
          </div>
        ),
      },
      {
        id: "lb_type",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("superAdmin.lbPrices.fields.lbType")}
          </span>
        ),
        accessorFn: (p) => p.lb_type,
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className="font-mono text-[10px] uppercase bg-accent/10 border-accent/30 text-accent-foreground"
          >
            {row.original.lb_type}
          </Badge>
        ),
      },
      {
        id: "capacity_unit",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("superAdmin.lbPrices.fields.capacityUnit")}
          </span>
        ),
        accessorFn: (p) => p.capacity_unit_name,
        cell: ({ row }) => (
          <div className="min-w-0">
            <div className="font-mono text-[12px] text-foreground">
              1 {row.original.capacity_unit_name || "unit"}
            </div>
            <div className="font-mono text-[11px] text-muted-foreground truncate">
              {capacityUnitSummary(row.original)}
            </div>
          </div>
        ),
        meta: { responsive: "lg" },
      },
      {
        id: "availability_zone",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("superAdmin.lbPrices.fields.availabilityZone")}
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
            {t("superAdmin.lbPrices.fields.priceHourly")}
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
        id: "price_per_lcu_hour",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("superAdmin.lbPrices.fields.pricePerCapacityUnit")}
          </span>
        ),
        accessorFn: (p) => p.price_per_lcu_hour,
        cell: ({ row }) => (
          <span className="font-mono text-[13px] text-muted-foreground">
            {row.original.currency} {row.original.price_per_lcu_hour} /{" "}
            {row.original.capacity_unit_name || "unit"}-hr
          </span>
        ),
        meta: { responsive: "md" },
      },
      {
        id: "price_monthly",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">
            {t("superAdmin.lbPrices.fields.priceMonthly")}
          </span>
        ),
        accessorFn: (p) => p.price_monthly,
        cell: ({ row }) => (
          <span className="font-mono text-[13px] text-muted-foreground">
            {row.original.currency} {row.original.price_monthly}
          </span>
        ),
        meta: { responsive: "lg" },
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
        meta: { responsive: "xl" },
      },
      {
        id: "is_active",
        header: () => t("superAdmin.fields.active"),
        enableSorting: false,
        cell: ({ row }) => <ActiveBadge active={row.original.is_active} />,
      },
      actionsColumn<LoadBalancerPrice>({
        ariaLabel: t("console.table.actions"),
        actions: () => [{ label: t("superAdmin.actions.edit"), icon: Pencil, onAction: openEdit }],
      }),
    ],
    [t, azName],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Scale}
        breadcrumbs={[{ label: t("superAdmin.title") }, { label: t("superAdmin.lbPrices.title") }]}
        title={t("superAdmin.lbPrices.title")}
        description={t("superAdmin.lbPrices.formSubtitle")}
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
              {t("superAdmin.lbPrices.add")}
            </Button>
          </>
        }
      />

      <DataTable<LoadBalancerPrice>
        data={prices}
        columns={columns}
        searchable
        searchPlaceholder="Filter load balancer prices…"
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        getRowId={(p) => p.id}
        onRowClick={openEdit}
        empty={
          <EmptyState
            icon={Scale}
            title={t("superAdmin.lbPrices.empty")}
            description={t("superAdmin.lbPrices.emptySubtitle")}
            action={{ label: t("superAdmin.lbPrices.add"), onClick: openCreate }}
          />
        }
      />

      <LoadBalancerPriceFormSheet open={formOpen} onOpenChange={setFormOpen} price={editing} />
    </div>
  )
}
