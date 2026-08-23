import { useMemo, useState } from "react"

import { actionsColumn, Button, DataTable, EmptyState, textColumn } from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Network, Pencil, Plus, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { ActiveBadge } from "../components/ActiveBadge"
import { useAdminStaticIPPrices } from "../superadmin.hooks"
import type { StaticIPPrice } from "../superadmin.types"
import { StaticIPPriceFormSheet } from "./StaticIPPriceFormSheet"

/**
 * Trailing zeros on a derived hourly rate are noise — 0.409589 is meaningful,
 * 200.000000 is not. Kept at full precision otherwise, because this is the
 * number the billing engine actually multiplies by.
 */
function formatPrice(value: number): string {
  return String(Number(value.toFixed(6)))
}

/**
 * Static IP pricing lives with the other price tables rather than on the
 * inventory page: an operator setting a rate is doing billing work, not
 * capacity work, and the two were competing for the same screen.
 */
export function StaticIPPricesPage() {
  useScreen("superadmin.static-ip-prices")
  const { t } = useTranslation()
  const { data: prices = [], isLoading, isError, refetch, isFetching } = useAdminStaticIPPrices()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<StaticIPPrice | null>(null)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }
  const openEdit = (price: StaticIPPrice) => {
    setEditing(price)
    setFormOpen(true)
  }

  const columns = useMemo<ColumnDef<StaticIPPrice>[]>(
    () => [
      textColumn<StaticIPPrice>({
        id: "name",
        header: "Name / SKU",
        accessor: (p) => p.name || p.sku || "—",
      }),
      textColumn<StaticIPPrice>({
        id: "ip_version",
        header: t("superAdmin.staticIPPriceFormSheet.ipVersion"),
        accessor: (p) => p.ip_version.toUpperCase(),
        mono: true,
        responsive: "md",
      }),
      textColumn<StaticIPPrice>({
        id: "address_type",
        header: t("superAdmin.staticIPPriceFormSheet.addressType"),
        accessor: (p) => p.address_type,
        responsive: "md",
      }),
      // The rate the billing engine multiplies by, so it leads and stays exact.
      textColumn<StaticIPPrice>({
        id: "price_hourly",
        header: t("superAdmin.staticIpPrices.fields.priceHourly"),
        accessor: (p) => `${p.currency} ${formatPrice(p.price_hourly)}`,
        mono: true,
      }),
      textColumn<StaticIPPrice>({
        id: "price_idle_hourly",
        header: t("superAdmin.staticIPPriceFormSheet.idleHourly"),
        accessor: (p) => `${p.currency} ${formatPrice(p.price_idle_hourly)}`,
        mono: true,
      }),
      textColumn<StaticIPPrice>({
        id: "price_monthly",
        header: t("superAdmin.staticIpPrices.fields.priceMonthly"),
        accessor: (p) => `${p.currency} ${formatPrice(p.price_monthly)}`,
        mono: true,
      }),
      textColumn<StaticIPPrice>({
        id: "setup_fee",
        header: t("superAdmin.staticIPPriceFormSheet.setupFee"),
        accessor: (p) => `${p.currency} ${formatPrice(p.setup_fee)}`,
        mono: true,
        responsive: "xl",
      }),
      textColumn<StaticIPPrice>({
        id: "billing",
        header: t("superAdmin.staticIPPriceFormSheet.billingUnit"),
        accessor: (p) => p.billing_unit,
        responsive: "xl",
      }),
      {
        id: "is_active",
        header: () => t("superAdmin.fields.active"),
        enableSorting: false,
        cell: ({ row }) => <ActiveBadge active={row.original.is_active} />,
      },
      actionsColumn<StaticIPPrice>({
        ariaLabel: t("console.table.actions"),
        actions: () => [{ label: t("superAdmin.actions.edit"), icon: Pencil, onAction: openEdit }],
      }),
    ],
    [t],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Network}
        breadcrumbs={[
          { label: t("superAdmin.title") },
          { label: t("superAdmin.staticIpPrices.title") },
        ]}
        title={t("superAdmin.staticIpPrices.title")}
        description={t("superAdmin.staticIpPrices.formSubtitle")}
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
              {t("superAdmin.staticIpPrices.add")}
            </Button>
          </>
        }
      />

      <DataTable<StaticIPPrice>
        data={prices}
        columns={columns}
        searchable
        searchPlaceholder="Filter static IP prices…"
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        getRowId={(p) => p.id}
        onRowClick={openEdit}
        empty={
          <EmptyState
            icon={Network}
            title={t("superAdmin.staticIpPrices.empty")}
            description={t("superAdmin.staticIpPrices.emptySubtitle")}
            action={{ label: t("superAdmin.staticIpPrices.add"), onClick: openCreate }}
          />
        }
        onRefresh={() => void refetch()}
        refreshLabel={t("console.table.refresh")}
        refreshing={isFetching}
      />

      <StaticIPPriceFormSheet open={formOpen} onOpenChange={setFormOpen} price={editing} />
    </div>
  )
}
