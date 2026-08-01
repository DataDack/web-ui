import { useEffect, useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Globe, RefreshCw, Search } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
	copyColumn,
	dateColumn,
	EmptyState,
	ResourceTable,
	textColumn,
} from "@/components/console"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { useAdminStaticIPAllocations } from "../superadmin.hooks"
import type { StaticIPAllocation } from "../superadmin.types"

/** First non-empty value, else "" (so textColumn renders a muted dash). */
function firstNonEmpty(...values: (string | undefined)[]): string {
	for (const v of values) {
		if (v && v.trim() !== "") return v
	}
	return ""
}

function vmLabel(a: StaticIPAllocation): string {
	if (a.instance_name) return a.instance_name
	if (a.instance_id) return a.instance_id.slice(0, 8)
	return ""
}

function accountLabel(a: StaticIPAllocation): string {
	if (a.account_name) {
		return a.account_number ? `${a.account_name} (${a.account_number})` : a.account_name
	}
	return firstNonEmpty(a.account_number, String(a.account_id))
}

/** Reserved (allocated, unattached) vs in-use (attached to a VM). */
function AllocationStatus({ status }: Readonly<{ status: string }>) {
	const { t } = useTranslation()
	const associated = status === "associated"
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium",
				associated
					? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
					: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
			)}
		>
			<span
				className={cn(
					"size-1.5 rounded-full",
					associated ? "bg-emerald-500" : "bg-amber-500"
				)}
			/>
			{associated
				? t("superAdmin.staticIps.inUse.associated")
				: t("superAdmin.staticIps.inUse.reserved")}
		</span>
	)
}

export function IPsInUseTab() {
	const { t } = useTranslation()
	const [query, setQuery] = useState("")
	const [debounced, setDebounced] = useState("")

	useEffect(() => {
		const id = setTimeout(() => {
			setDebounced(query.trim())
		}, 250)
		return () => {
			clearTimeout(id)
		}
	}, [query])

	const {
		data: allocations = [],
		isLoading,
		isError,
		refetch,
		isFetching,
	} = useAdminStaticIPAllocations(debounced)

	const columns = useMemo<ColumnDef<StaticIPAllocation>[]>(
		() => [
			copyColumn<StaticIPAllocation>({
				id: "ip",
				header: t("superAdmin.staticIps.inUse.columns.ip"),
				accessor: (a) => a.ip_address,
			}),
			{
				id: "status",
				header: () => t("superAdmin.staticIps.inUse.columns.status"),
				enableSorting: false,
				cell: ({ row }) => <AllocationStatus status={row.original.status} />,
			},
			textColumn<StaticIPAllocation>({
				id: "vm",
				header: t("superAdmin.staticIps.inUse.columns.vm"),
				accessor: (a) => vmLabel(a),
			}),
			textColumn<StaticIPAllocation>({
				id: "account",
				header: t("superAdmin.staticIps.inUse.columns.account"),
				accessor: (a) => accountLabel(a),
				responsive: "md",
			}),
			textColumn<StaticIPAllocation>({
				id: "org",
				header: t("superAdmin.staticIps.inUse.columns.org"),
				accessor: (a) => a.organization_name,
				responsive: "lg",
			}),
			textColumn<StaticIPAllocation>({
				id: "user",
				header: t("superAdmin.staticIps.inUse.columns.user"),
				accessor: (a) => firstNonEmpty(a.user_name, a.user_email),
				responsive: "lg",
			}),
			textColumn<StaticIPAllocation>({
				id: "pool",
				header: t("superAdmin.staticIps.inUse.columns.pool"),
				accessor: (a) => a.pool_cidr,
				mono: true,
				responsive: "xl",
			}),
			dateColumn<StaticIPAllocation>({
				id: "assigned",
				header: t("superAdmin.staticIps.inUse.columns.assigned"),
				accessor: (a) => a.created_at,
				responsive: "md",
			}),
		],
		[t]
	)

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-2">
				<div className="relative flex-1 max-w-sm">
					<Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						value={query}
						onChange={(e) => {
							setQuery(e.target.value)
						}}
						placeholder={t("superAdmin.staticIps.inUse.searchPlaceholder")}
						className="pl-8"
					/>
				</div>
				<Button
					variant="ghost"
					size="icon"
					onClick={() => void refetch()}
					disabled={isFetching}
					aria-label={t("common.refresh")}
				>
					<RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
				</Button>
			</div>

			<ResourceTable<StaticIPAllocation>
				data={allocations}
				columns={columns}
				isLoading={isLoading}
				isError={isError}
				onRetry={() => void refetch()}
				getRowId={(a) => a.id}
				emptyState={
					<EmptyState
						icon={Globe}
						title={t("superAdmin.staticIps.inUse.empty")}
						description={t("superAdmin.staticIps.inUse.emptySubtitle")}
					/>
				}
			/>
		</div>
	)
}
