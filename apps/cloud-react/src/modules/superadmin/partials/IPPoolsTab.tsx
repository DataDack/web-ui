import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Network, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
    actionsColumn,
    ConfirmDialog,
    EmptyState,
    ResourceTable,
    StatGrid,
    textColumn,
} from "@/components/console"
import { Button } from "@/components/ui/button"

import { ActiveBadge } from "../components/ActiveBadge"
import { useAdminAvailabilityZones, useAdminIPPools, useDeleteIPPool } from "../superadmin.hooks"
import type { IpPool } from "../superadmin.types"
import { AddIPPoolDialog } from "./AddIPPoolDialog"

export function IPPoolsTab() {
    const { t } = useTranslation()
    const { data: pools = [], isLoading, isError, refetch, isFetching } = useAdminIPPools()
    const { data: azs = [] } = useAdminAvailabilityZones()
    const { mutate: remove, isPending: isDeleting } = useDeleteIPPool()

    const [addOpen, setAddOpen] = useState(false)
    const [pendingDelete, setPendingDelete] = useState<IpPool | null>(null)

    const azName = useMemo(() => {
        const byId = new Map(azs.map((a) => [a.id, a.code]))
        return (id: string | null) => (id ? (byId.get(id) ?? "—") : "—")
    }, [azs])

    const totals = useMemo(
        () =>
            pools.reduce(
                (acc, p) => ({
                    usable: acc.usable + p.usable_count,
                    available: acc.available + p.available,
                    used: acc.used + p.used,
                }),
                { usable: 0, available: 0, used: 0 }
            ),
        [pools]
    )

    const columns = useMemo<ColumnDef<IpPool>[]>(
        () => [
            textColumn<IpPool>({
                id: "pool",
                header: t("superAdmin.staticIps.pools.columns.pool"),
                accessor: (p) => `${p.name}  ·  ${p.cidr}`,
                mono: true,
            }),
            textColumn<IpPool>({
                id: "region",
                header: t("superAdmin.staticIps.pools.columns.region"),
                accessor: (p) => p.region || "—",
                mono: true,
                responsive: "md",
            }),
            textColumn<IpPool>({
                id: "az",
                header: t("superAdmin.staticIps.pools.columns.az"),
                accessor: (p) => azName(p.availability_zone_id),
                mono: true,
                responsive: "lg",
            }),
            textColumn<IpPool>({
                id: "usable",
                header: t("superAdmin.staticIps.pools.columns.total"),
                accessor: (p) => p.usable_count,
            }),
            textColumn<IpPool>({
                id: "used",
                header: t("superAdmin.staticIps.pools.columns.used"),
                accessor: (p) => p.used,
            }),
            textColumn<IpPool>({
                id: "available",
                header: t("superAdmin.staticIps.pools.columns.available"),
                accessor: (p) => p.available,
            }),
            textColumn<IpPool>({
                id: "gateway",
                header: t("superAdmin.staticIps.pools.columns.gateway"),
                accessor: (p) => p.gateway || "—",
                mono: true,
                responsive: "xl",
            }),
            {
                id: "is_active",
                header: () => t("superAdmin.staticIps.pools.columns.status"),
                enableSorting: false,
                cell: ({ row }) => <ActiveBadge active={row.original.is_active} />,
            },
            actionsColumn<IpPool>({
                ariaLabel: t("console.table.actions"),
                actions: () => [
                    {
                        label: t("superAdmin.staticIps.pools.delete"),
                        icon: Trash2,
                        destructive: true,
                        onAction: (pool) => {
                            setPendingDelete(pool)
                        },
                    },
                ],
            }),
        ],
        [t, azName]
    )

    const stats = [
        {
            label: t("superAdmin.staticIps.stats.total"),
            value: totals.usable,
            color: "default" as const,
        },
        {
            label: t("superAdmin.staticIps.stats.available"),
            value: totals.available,
            color: "success" as const,
        },
        {
            label: t("superAdmin.staticIps.stats.inUse"),
            value: totals.used,
            color: "info" as const,
        },
        {
            label: t("superAdmin.staticIps.stats.pools"),
            value: pools.length,
            color: "default" as const,
        },
    ]

    return (
        <div className="space-y-4">
            <StatGrid stats={stats} />

            <div className="flex items-center justify-end gap-2">
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
                        setAddOpen(true)
                    }}
                >
                    <Plus className="w-4 h-4" />
                    {t("superAdmin.staticIps.pools.add")}
                </Button>
            </div>

            <ResourceTable<IpPool>
                data={pools}
                columns={columns}
                isLoading={isLoading}
                isError={isError}
                onRetry={() => void refetch()}
                getRowId={(p) => p.id}
                emptyState={
                    <EmptyState
                        icon={Network}
                        title={t("superAdmin.staticIps.pools.empty")}
                        description={t("superAdmin.staticIps.pools.emptySubtitle")}
                        action={{
                            label: t("superAdmin.staticIps.pools.add"),
                            onClick: () => {
                                setAddOpen(true)
                            },
                        }}
                    />
                }
            />

            <AddIPPoolDialog open={addOpen} onOpenChange={setAddOpen} />

            <ConfirmDialog
                open={!!pendingDelete}
                onOpenChange={(open) => {
                    if (!open) setPendingDelete(null)
                }}
                title={t("superAdmin.staticIps.pools.confirmDeleteTitle")}
                description={t("superAdmin.staticIps.pools.confirmDeleteBody", {
                    cidr: pendingDelete?.cidr ?? "",
                })}
                confirmLabel={t("superAdmin.staticIps.pools.delete")}
                loading={isDeleting}
                onConfirm={() => {
                    if (!pendingDelete) return
                    remove(
                        { id: pendingDelete.id },
                        {
                            onSuccess: () => {
                                setPendingDelete(null)
                            },
                        }
                    )
                }}
            />
        </div>
    )
}
