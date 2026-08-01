import { useMemo } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import {
    Box,
    CreditCard,
    Database,
    GitBranch,
    Globe,
    HardDrive,
    Layers,
    type LucideIcon,
    Network,
    Scale,
    Server,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import {
    copyColumn,
    dateColumn,
    EmptyState,
    ResourceTable,
    type StatCardProps,
    StatGrid,
    statusColumn,
    textColumn,
} from "@/components/console"

import { useResourceGroupResources$ } from "../resource-groups.hooks"
import type { GroupResource } from "../resource-groups.types"

// Icon per console resource type — mirrors the global-search palette so a VM, a
// disk or a VPC reads the same wherever it appears. Unknown registry types fall
// back to a generic box.
const TYPE_ICON: Record<string, LucideIcon> = {
    vm: Server,
    disk: HardDrive,
    "load-balancer": Scale,
    vpc: Network,
    subnet: GitBranch,
    "static-ip": Globe,
    database: Database,
    invoice: CreditCard,
}

// Human label per type; unknown types render their raw backend string.
const TYPE_LABEL: Record<string, string> = {
    vm: "Virtual Machine",
    disk: "Disk",
    "load-balancer": "Load Balancer",
    vpc: "VPC Network",
    subnet: "Subnet",
    "static-ip": "Static IP",
    database: "Database",
}

// Status buckets for the at-a-glance stat cards. Anything not explicitly healthy
// or failing is treated as pending/transitional.
const HEALTHY = new Set([
    "running", "active", "available", "optimal", "in_use", "succeeded",
    "attached", "assigned", "healthy", "operational", "connected", "paid",
])
const FAILING = new Set(["error", "failed", "outage", "overdue", "unpaid", "degraded"])

function typeLabel(type: string): string {
    return TYPE_LABEL[type] ?? type
}

export function ResourceGroupResourcesTab({ groupId }: Readonly<{ groupId: string }>) {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { data: resources = [], isLoading, isError, refetch } = useResourceGroupResources$(groupId)

    const stats = useMemo<StatCardProps[]>(() => {
        const healthy = resources.filter((r) => r.status && HEALTHY.has(r.status)).length
        const failing = resources.filter((r) => r.status && FAILING.has(r.status)).length
        return [
            {
                label: t("resourceGroups.resources.stats.total"),
                value: resources.length,
                icon: Layers,
                loading: isLoading,
            },
            {
                label: t("resourceGroups.resources.stats.healthy"),
                value: healthy,
                color: "success",
                loading: isLoading,
            },
            {
                label: t("resourceGroups.resources.stats.pending"),
                value: resources.length - healthy - failing,
                loading: isLoading,
            },
            {
                label: t("resourceGroups.resources.stats.attention"),
                value: failing,
                color: "danger",
                loading: isLoading,
            },
        ]
    }, [resources, isLoading, t])

    const columns = useMemo<ColumnDef<GroupResource>[]>(
        () => [
            copyColumn<GroupResource>({
                id: "id",
                header: t("resourceGroups.resources.columns.id"),
                accessor: (r) => r.resourceId,
                responsive: "md",
            }),
            {
                id: "name",
                accessorFn: (r) => r.name,
                header: () => t("resourceGroups.resources.columns.name"),
                cell: ({ row }) => {
                    const r = row.original
                    const Icon = TYPE_ICON[r.type] ?? Box
                    return (
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="size-7 rounded-lg glass-1 flex items-center justify-center shrink-0">
                                <Icon className="size-3.5 text-muted-foreground" />
                            </div>
                            <span className="font-mono text-[13px] font-medium text-foreground truncate">
                                {r.name}
                            </span>
                        </div>
                    )
                },
            },
            textColumn<GroupResource>({
                id: "type",
                header: t("resourceGroups.resources.columns.type"),
                accessor: (r) => typeLabel(r.type),
                muted: true,
                responsive: "lg",
            }),
            statusColumn<GroupResource>({
                header: t("resourceGroups.resources.columns.status"),
                accessor: (r) => r.status ?? "",
                pulse: (r) => !!r.status && HEALTHY.has(r.status),
            }),
            textColumn<GroupResource>({
                id: "region",
                header: t("resourceGroups.resources.columns.region"),
                accessor: (r) => r.region,
                mono: true,
                muted: true,
                responsive: "lg",
            }),
            textColumn<GroupResource>({
                id: "details",
                header: t("resourceGroups.resources.columns.details"),
                accessor: (r) => r.meta.join(" · "),
                muted: true,
                responsive: "xl",
            }),
            dateColumn<GroupResource>({
                id: "updated",
                header: t("resourceGroups.resources.columns.updated"),
                accessor: (r) => r.updatedAt ?? "",
                responsive: "xl",
            }),
        ],
        [t]
    )

    return (
        <div className="space-y-5">
            <StatGrid stats={stats} />
            <ResourceTable
                data={resources}
                columns={columns}
                isLoading={isLoading}
                isError={isError}
                onRetry={() => void refetch()}
                getRowId={(r) => r.key}
                onRowClick={(r) => {
                    if (r.path) void navigate(r.path)
                }}
                initialSorting={[{ id: "updated", desc: true }]}
                emptyState={
                    <EmptyState
                        icon={Layers}
                        title={t("resourceGroups.resources.empty")}
                        description={t("resourceGroups.resources.emptySubtitle")}
                    />
                }
            />
        </div>
    )
}
