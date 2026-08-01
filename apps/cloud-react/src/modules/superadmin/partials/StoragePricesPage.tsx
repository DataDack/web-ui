import { useMemo, useState } from "react"
import { useScreen } from "@/services/api/screen"

import type { ColumnDef } from "@tanstack/react-table"
import { HardDrive, Pencil, Plus, RefreshCw, Globe } from "lucide-react"
import { useTranslation } from "react-i18next"

import { actionsColumn, EmptyState, PageHeader, ResourceTable } from "@/components/console"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

import { ActiveBadge } from "../components/ActiveBadge"
import { useAdminAvailabilityZones, useAdminStoragePrices } from "../superadmin.hooks"
import type { StoragePrice } from "../superadmin.types"
import { StoragePriceFormSheet } from "./StoragePriceFormSheet"

export function StoragePricesPage() {
    useScreen("superadmin.storage-prices")
	const { t } = useTranslation()
	const { data: prices = [], isLoading, isError, refetch, isFetching } = useAdminStoragePrices()
	const { data: azs = [] } = useAdminAvailabilityZones()

	const [formOpen, setFormOpen] = useState(false)
	const [editing, setEditing] = useState<StoragePrice | null>(null)
	// "all" by default so deactivated prices are visible and can be re-activated.
	const [status, setStatus] = useState<"all" | "active" | "inactive">("all")

	const counts = useMemo(
		() => ({
			all: prices.length,
			active: prices.filter((p) => p.is_active).length,
			inactive: prices.filter((p) => !p.is_active).length,
		}),
		[prices]
	)

	const visiblePrices = useMemo(() => {
		if (status === "active") return prices.filter((p) => p.is_active)
		if (status === "inactive") return prices.filter((p) => !p.is_active)
		return prices
	}, [prices, status])

	const azName = useMemo(() => {
		const byId = new Map(azs.map((a) => [String(a.id), a.code]))
		return (id: string | number) => byId.get(String(id)) ?? String(id)
	}, [azs])

	const openCreate = () => {
		setEditing(null)
		setFormOpen(true)
	}
	const openEdit = (price: StoragePrice) => {
		setEditing(price)
		setFormOpen(true)
	}

	const columns = useMemo<ColumnDef<StoragePrice>[]>(
		() => [
			{
				id: "name",
				header: () => (
					<span className="text-xs font-semibold uppercase tracking-wider">
						Name / SKU
					</span>
				),
				accessorFn: (p) => p.name,
				cell: ({ row }) => (
					<div className="min-w-0">
						<div className="font-semibold text-[13px] text-foreground">
							{row.original.name || row.original.storage_type.toUpperCase()}
						</div>
						<div className="font-mono text-[11px] text-muted-foreground truncate">
							{row.original.sku || "—"}
						</div>
					</div>
				),
			},
			{
				id: "storage_type",
				header: () => (
					<span className="text-xs font-semibold uppercase tracking-wider">
						{t("superAdmin.storagePrices.fields.storageType")}
					</span>
				),
				accessorFn: (p) => p.storage_type,
				cell: ({ row }) => (
					<Badge
						variant="outline"
						className="font-mono text-[10px] uppercase bg-accent/10 border-accent/30 text-accent-foreground"
					>
						{row.original.storage_type}
					</Badge>
				),
			},
			{
				id: "volume",
				header: () => (
					<span className="text-xs font-semibold uppercase tracking-wider">Volume</span>
				),
				accessorFn: (p) => p.volume_type,
				cell: ({ row }) => (
					<span className="font-mono text-[12px] text-muted-foreground">
						{row.original.volume_type} · {row.original.replication_type}
					</span>
				),
				meta: { responsive: "md" },
			},
			{
				id: "availability_zone",
				header: () => (
					<span className="text-xs font-semibold uppercase tracking-wider">
						{t("superAdmin.storagePrices.fields.availabilityZone")}
					</span>
				),
				accessorFn: (p) => p.availability_zone_id,
				cell: ({ row }) => (
					<span className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
						<Globe className="size-3.5" />
						{azName(row.original.availability_zone_id)}
					</span>
				),
				meta: { responsive: "md" },
			},
			{
				id: "limits",
				header: () => (
					<span className="text-xs font-semibold uppercase tracking-wider">Limits</span>
				),
				accessorFn: (p) => p.max_size_gb,
				cell: ({ row }) => (
					<span className="font-mono text-[12px] text-muted-foreground">
						{row.original.min_size_gb}-{row.original.max_size_gb || "∞"} GB ·{" "}
						{row.original.max_iops} IOPS
					</span>
				),
				meta: { responsive: "xl" },
			},
			{
				id: "price_per_gb_month",
				header: () => (
					<span className="text-xs font-semibold uppercase tracking-wider">
						{t("superAdmin.storagePrices.fields.pricePerGbMonth")}
					</span>
				),
				accessorFn: (p) => p.price_per_gb_month,
				cell: ({ row }) => (
					<span className="font-mono text-[13px] text-foreground">
						{row.original.currency}{" "}
						<span className="font-semibold">{row.original.price_per_gb_month}</span>
					</span>
				),
			},
			{
				id: "price_per_iops",
				header: () => (
					<span className="text-xs font-semibold uppercase tracking-wider">
						IOPS / throughput
					</span>
				),
				accessorFn: (p) => p.price_per_iops,
				cell: ({ row }) => (
					<span className="font-mono text-[13px] text-muted-foreground">
						{row.original.currency} {row.original.price_per_iops} /{" "}
						{row.original.price_per_throughput_mbps}
					</span>
				),
				meta: { responsive: "lg" },
			},
			{
				id: "snapshot",
				header: () => (
					<span className="text-xs font-semibold uppercase tracking-wider">Snapshot</span>
				),
				accessorFn: (p) => p.snapshot_price_per_gb_month,
				cell: ({ row }) => (
					<span className="font-mono text-[13px] text-muted-foreground">
						{row.original.currency} {row.original.snapshot_price_per_gb_month}
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
			actionsColumn<StoragePrice>({
				ariaLabel: t("console.table.actions"),
				actions: () => [
					{ label: t("superAdmin.actions.edit"), icon: Pencil, onAction: openEdit },
				],
			}),
		],
		[t, azName]
	)

	return (
		<div className="space-y-5">
			<PageHeader
				icon={HardDrive}
				breadcrumbs={[
					{ label: t("superAdmin.title") },
					{ label: t("superAdmin.storagePrices.title") },
				]}
				title={t("superAdmin.storagePrices.title")}
				description={t("superAdmin.storagePrices.formSubtitle")}
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
							{t("superAdmin.storagePrices.add")}
						</Button>
					</>
				}
			/>

			<div className="flex items-center gap-1 rounded-lg border border-border bg-muted/40 p-1 w-fit">
				{(["all", "active", "inactive"] as const).map((key) => (
					<button
						key={key}
						type="button"
						onClick={() => setStatus(key)}
						className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
							status === key
								? "bg-background text-foreground shadow-sm"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						{t(`superAdmin.filter.${key}`, {
							defaultValue: key.charAt(0).toUpperCase() + key.slice(1),
						})}
						<span className="font-mono text-[11px] text-muted-foreground">
							{counts[key]}
						</span>
					</button>
				))}
			</div>

			<ResourceTable<StoragePrice>
				data={visiblePrices}
				columns={columns}
				isLoading={isLoading}
				isError={isError}
				onRetry={() => void refetch()}
				getRowId={(p) => p.id}
				onRowClick={openEdit}
				emptyState={
					<EmptyState
						icon={HardDrive}
						title={t("superAdmin.storagePrices.empty")}
						description={t("superAdmin.storagePrices.emptySubtitle")}
						action={{ label: t("superAdmin.storagePrices.add"), onClick: openCreate }}
					/>
				}
			/>

			<StoragePriceFormSheet open={formOpen} onOpenChange={setFormOpen} price={editing} />
		</div>
	)
}
