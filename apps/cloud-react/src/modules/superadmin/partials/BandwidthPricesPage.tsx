import { useMemo, useState } from "react"

import { actionsColumn, Button, DataTable, EmptyState, textColumn } from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Gauge, Pencil, Plus, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { ActiveBadge } from "../components/ActiveBadge"
import { useAdminAvailabilityZones, useAdminBandwidthPrices } from "../superadmin.hooks"
import type { BandwidthPrice } from "../superadmin.types"
import { BandwidthPriceFormSheet } from "./BandwidthPriceFormSheet"

export function BandwidthPricesPage() {
  useScreen("superadmin.bandwidth-prices")
  const { t } = useTranslation()
  const { data: prices = [], isLoading, isError, refetch, isFetching } = useAdminBandwidthPrices()
  const { data: azs = [] } = useAdminAvailabilityZones()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<BandwidthPrice | null>(null)

  const azName = useMemo(() => {
    const byId = new Map(azs.map((a) => [a.id, a.code]))
    return (id: string | number) => byId.get(String(id)) ?? String(id)
  }, [azs])

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (price: BandwidthPrice) => {
    setEditing(price)
    setFormOpen(true)
  }

  const columns = useMemo<ColumnDef<BandwidthPrice>[]>(
    () => [
      textColumn<BandwidthPrice>({
        id: "name",
        header: "Name / SKU",
        accessor: (p) => p.name || p.sku || "—",
      }),
      textColumn<BandwidthPrice>({
        id: "availability_zone",
        header: t("superAdmin.bandwidthPrices.fields.availabilityZone"),
        accessor: (p) => azName(p.availability_zone_id),
        mono: true,
      }),
      textColumn<BandwidthPrice>({
        id: "direction",
        header: t("superAdmin.bandwidthPrices.fields.direction"),
        accessor: (p) => p.direction,
        responsive: "md",
      }),
      textColumn<BandwidthPrice>({
        id: "included_gb",
        header: t("superAdmin.bandwidthPrices.fields.includedGb"),
        accessor: (p) => `${String(p.included_gb)} GB`,
      }),
      textColumn<BandwidthPrice>({
        id: "price_per_gb",
        header: t("superAdmin.bandwidthPrices.fields.pricePerGb"),
        accessor: (p) => `${p.currency} ${String(p.price_per_gb)}`,
      }),
      textColumn<BandwidthPrice>({
        id: "billing",
        header: "Billing",
        accessor: (p) => p.billing_unit,
        responsive: "xl",
      }),
      {
        id: "is_active",
        header: () => t("superAdmin.fields.active"),
        enableSorting: false,
        cell: ({ row }) => <ActiveBadge active={row.original.is_active} />,
      },
      actionsColumn<BandwidthPrice>({
        ariaLabel: t("console.table.actions"),
        actions: () => [{ label: t("superAdmin.actions.edit"), icon: Pencil, onAction: openEdit }],
      }),
    ],
    [t, azName],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Gauge}
        breadcrumbs={[
          { label: t("superAdmin.title") },
          { label: t("superAdmin.bandwidthPrices.title") },
        ]}
        title={t("superAdmin.bandwidthPrices.title")}
        description={t("superAdmin.bandwidthPrices.formSubtitle")}
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
              {t("superAdmin.bandwidthPrices.add")}
            </Button>
          </>
        }
      />

      <DataTable<BandwidthPrice>
        data={prices}
        columns={columns}
        searchable
        searchPlaceholder="Filter bandwidth prices…"
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        getRowId={(p) => p.id}
        onRowClick={openEdit}
        empty={
          <EmptyState
            icon={Gauge}
            title={t("superAdmin.bandwidthPrices.empty")}
            description={t("superAdmin.bandwidthPrices.emptySubtitle")}
            action={{ label: t("superAdmin.bandwidthPrices.add"), onClick: openCreate }}
          />
        }
        onRefresh={() => void refetch()}
        refreshLabel={t("console.table.refresh")}
        refreshing={isFetching}
      />

      <BandwidthPriceFormSheet open={formOpen} onOpenChange={setFormOpen} price={editing} />
    </div>
  )
}
