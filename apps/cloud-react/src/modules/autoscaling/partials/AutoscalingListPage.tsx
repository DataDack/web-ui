import { useMemo, useState } from "react"
import { useScreen } from "@/services/api/screen"

import type { ColumnDef } from "@tanstack/react-table"
import { Activity, Plus, RefreshCw, Trash2 } from "lucide-react"
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
import { Globe, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

import { ASG_ROUTES } from "../autoscaling.constants"
import { useASGs, useDeleteASG } from "../autoscaling.hooks"
import type { AutoScalingGroup } from "../autoscaling.types"
import { CreateAsgSheet } from "./CreateAsgSheet"

export function AutoscalingListPage() {
    useScreen("autoscaling.autoscaling-list")
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { data: asgs = [], isLoading, isError, refetch, isFetching } = useASGs()
    const { mutate: deleteASG, isPending: isDeleting } = useDeleteASG()

    const [createOpen, setCreateOpen] = useState(false)
    const [toDelete, setToDelete] = useState<AutoScalingGroup | null>(null)

    const stats = useMemo(
        () => [
            { label: t("autoscaling.stats.groups"), value: asgs.length, loading: isLoading },
            {
                label: t("autoscaling.stats.desired"),
                value: asgs.reduce((sum, a) => sum + a.desired_capacity, 0),
                color: "success" as const,
                loading: isLoading,
            },
            {
                label: t("autoscaling.stats.maxCapacity"),
                value: asgs.reduce((sum, a) => sum + a.max_size, 0),
                loading: isLoading,
            },
        ],
        [asgs, isLoading, t]
    )

    const columns = useMemo<ColumnDef<AutoScalingGroup>[]>(
        () => [
            {
                id: "name",
                header: () => <span className="text-xs font-semibold uppercase tracking-wider">{t("autoscaling.columns.name")}</span>,
                accessorFn: (g) => g.name,
                cell: ({ row }) => (
                    <div className="flex flex-col">
                        <span className="font-semibold text-[14px] leading-tight text-foreground flex items-center gap-2">
                            <Users className="size-4 text-muted-foreground" />
                            {row.original.name}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground mt-0.5 ml-6">
                            ASG-{row.original.tenant_serial}
                        </span>
                    </div>
                ),
            },
            statusColumn<AutoScalingGroup>({
                header: t("autoscaling.columns.status"),
                accessor: (a) => a.status,
                pulse: (a) => a.status === "active",
            }),
            {
                id: "capacity",
                header: () => <span className="text-xs font-semibold uppercase tracking-wider">{t("autoscaling.columns.capacity")}</span>,
                accessorFn: (a) => a.desired_capacity,
                cell: ({ row }) => {
                    const { min_size, desired_capacity, max_size } = row.original
                    // Mock capacity bar visually representing desired relative to max
                    const percentage = max_size > 0 ? (desired_capacity / max_size) * 100 : 0
                    return (
                        <div className="flex flex-col gap-1.5 w-32">
                            <div className="flex justify-between items-center text-[11px] font-mono text-muted-foreground">
                                <span>{min_size} Min</span>
                                <span className="text-foreground font-medium">{desired_capacity} Curr</span>
                                <span>{max_size} Max</span>
                            </div>
                            <div className="h-1.5 w-full bg-accent/30 rounded-full overflow-hidden">
                                <div className="h-full bg-status-info/70" style={{ width: `${percentage}%` }} />
                            </div>
                        </div>
                    )
                },
            },
            {
                id: "location",
                header: () => <span className="text-xs font-semibold uppercase tracking-wider">{t("loadBalancers.columns.region")}</span>,
                accessorFn: (a) => a.region,
                cell: ({ row }) => (
                    <span className="flex items-center gap-1.5 font-medium text-[13px] text-foreground">
                        <Globe className="size-3.5 text-muted-foreground" />
                        {row.original.region}
                    </span>
                ),
                meta: { responsive: "lg" },
            },
            dateColumn<AutoScalingGroup>({
                header: t("common.created"),
                accessor: (a) => a.created_at,
                responsive: "xl",
            }),
            actionsColumn<AutoScalingGroup>({
                ariaLabel: t("console.table.actions"),
                actions: () => [
                    {
                        label: t("autoscaling.actions.delete"),
                        icon: Trash2,
                        destructive: true,
                        onAction: (asg: AutoScalingGroup) => {
                            setToDelete(asg)
                        },
                    },
                ],
            }),
        ],
        [t]
    )

    return (
        <div className="space-y-5">
            <PageHeader
                icon={Activity}
                breadcrumbs={[
                    { label: t("console.nav.groups.compute") },
                    { label: t("autoscaling.title") },
                ]}
                title={t("autoscaling.title")}
                description={t("autoscaling.subtitle")}
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
                            {t("autoscaling.create")}
                        </Button>
                    </>
                }
            />

            <StatGrid stats={stats} className="lg:grid-cols-3" />

            <ResourceTable<AutoScalingGroup>
                data={asgs}
                columns={columns}
                isLoading={isLoading}
                isError={isError}
                onRetry={() => void refetch()}
                getRowId={(asg) => asg.id}
                onRowClick={(asg) => void navigate(ASG_ROUTES.detail(asg.id))}
                emptyState={
                    <EmptyState
                        icon={Activity}
                        title={t("autoscaling.empty")}
                        description={t("autoscaling.emptySubtitle")}
                        action={{
                            label: t("autoscaling.create"),
                            onClick: () => {
                                setCreateOpen(true)
                            },
                        }}
                    />
                }
            />

            <CreateAsgSheet open={createOpen} onOpenChange={setCreateOpen} />

            <ConfirmDialog
                open={!!toDelete}
                onOpenChange={(open) => {
                    if (!open) setToDelete(null)
                }}
                title={t("autoscaling.deleteConfirm.title")}
                description={t("autoscaling.deleteConfirm.description", {
                    name: toDelete?.name ?? "",
                })}
                confirmLabel={t("autoscaling.actions.delete")}
                loading={isDeleting}
                onConfirm={() => {
                    if (!toDelete) return
                    deleteASG(toDelete.id, {
                        onSuccess: () => {
                            setToDelete(null)
                        },
                    })
                }}
            />
        </div>
    )
}
