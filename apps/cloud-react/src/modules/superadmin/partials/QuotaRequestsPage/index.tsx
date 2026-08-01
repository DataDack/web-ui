import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { ArrowRight, Check, Gauge, RefreshCw, X } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
    actionsColumn,
    dateColumn,
    EmptyState,
    PageHeader,
    ResourceTable,
    StatGrid,
    type RowAction,
    type StatCardProps,
} from "@/components/console"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useScreen } from "@/services/api/screen"

import { ApproveDialog } from "./ApproveDialog"
import { RejectDialog } from "./RejectDialog"
import { RequestDetailSheet } from "./RequestDetailSheet"
import { RequestStatusPill } from "./RequestStatusPill"
import { QUOTA_REQUESTS_PAGE_SIZE } from "../../superadmin.api"
import { useAdminQuotaRequestCount, useAdminQuotaRequests } from "../../superadmin.hooks"
import type { AdminQuotaRequest, QuotaRequestStatus } from "../../superadmin.types"

type StatusFilter = QuotaRequestStatus | "all"

const STATUSES: QuotaRequestStatus[] = ["pending", "approved", "rejected"]

// Two-line cell: primary line + muted secondary (account/number, name/email…).
function StackedCell({ primary, secondary }: Readonly<{ primary: string; secondary: string }>) {
    return (
        <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium text-foreground">{primary || "—"}</span>
            {secondary && (
                <span className="truncate font-mono text-[11px] text-muted-foreground">
                    {secondary}
                </span>
            )}
        </div>
    )
}

// Super-admin review queue for quota increase requests (backend apps/quotas).
// The table is filtered and paged server-side; the stat tiles read the
// platform-wide per-status totals (meta.total off limit=1 probes), so they
// stay accurate regardless of the filter or how many pages the queue spans.
export function QuotaRequestsPage() {
    useScreen("superadmin.quota-requests")
    const { t } = useTranslation()

    const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending")
    const [page, setPage] = useState(1)
    const [detail, setDetail] = useState<AdminQuotaRequest | null>(null)
    const [approveTarget, setApproveTarget] = useState<AdminQuotaRequest | null>(null)
    const [rejectTarget, setRejectTarget] = useState<AdminQuotaRequest | null>(null)

    const {
        data: list,
        isLoading,
        isError,
        refetch,
        isFetching,
    } = useAdminQuotaRequests(statusFilter === "all" ? "" : statusFilter, page)
    const requests = list?.rows ?? []
    const total = list?.total ?? 0

    const pendingCount = useAdminQuotaRequestCount("pending")
    const approvedCount = useAdminQuotaRequestCount("approved")
    const rejectedCount = useAdminQuotaRequestCount("rejected")

    const stats = useMemo<StatCardProps[]>(
        () => [
            {
                label: t("superAdmin.quotaRequests.stats.pending"),
                value: pendingCount.data ?? 0,
                color: "warning",
                loading: pendingCount.isLoading,
            },
            {
                label: t("superAdmin.quotaRequests.stats.approved"),
                value: approvedCount.data ?? 0,
                color: "success",
                icon: Check,
                loading: approvedCount.isLoading,
            },
            {
                label: t("superAdmin.quotaRequests.stats.rejected"),
                value: rejectedCount.data ?? 0,
                color: "danger",
                icon: X,
                loading: rejectedCount.isLoading,
            },
        ],
        [
            pendingCount.data,
            pendingCount.isLoading,
            approvedCount.data,
            approvedCount.isLoading,
            rejectedCount.data,
            rejectedCount.isLoading,
            t,
        ]
    )

    const columns = useMemo<ColumnDef<AdminQuotaRequest>[]>(() => {
        const buildActions = (row: AdminQuotaRequest): RowAction<AdminQuotaRequest>[] => {
            if (row.status !== "pending") return []
            return [
                {
                    label: t("superAdmin.quotaRequests.approve"),
                    icon: Check,
                    onAction: setApproveTarget,
                },
                {
                    label: t("superAdmin.quotaRequests.reject"),
                    icon: X,
                    destructive: true,
                    onAction: setRejectTarget,
                },
            ]
        }
        return [
            {
                id: "account",
                accessorFn: (row) => row.account_name,
                header: () => t("superAdmin.quotaRequests.columns.account"),
                cell: ({ row }) => (
                    <StackedCell
                        primary={row.original.account_name}
                        secondary={row.original.account_number}
                    />
                ),
            },
            {
                id: "requester",
                accessorFn: (row) => row.requested_by_email,
                header: () => t("superAdmin.quotaRequests.columns.requester"),
                meta: { responsive: "lg" },
                cell: ({ row }) => (
                    <StackedCell
                        primary={row.original.requested_by_name}
                        secondary={row.original.requested_by_email}
                    />
                ),
            },
            {
                id: "quota",
                accessorFn: (row) => row.quota_code,
                header: () => t("superAdmin.quotaRequests.columns.quota"),
                cell: ({ row }) => (
                    <StackedCell
                        primary={row.original.quota_name}
                        secondary={row.original.quota_code}
                    />
                ),
            },
            {
                id: "change",
                accessorFn: (row) => row.requested_limit,
                header: () => t("superAdmin.quotaRequests.columns.change"),
                cell: ({ row }) => (
                    <span className="flex items-center gap-1 font-mono text-[13px] tabular-nums text-foreground whitespace-nowrap">
                        {row.original.current_limit}
                        <ArrowRight className="size-3 text-muted-foreground" />
                        <span className="font-medium">{row.original.requested_limit}</span>
                    </span>
                ),
            },
            {
                id: "justification",
                accessorFn: (row) => row.justification,
                header: () => t("superAdmin.quotaRequests.columns.justification"),
                enableSorting: false,
                meta: { responsive: "lg" },
                cell: ({ row }) => (
                    <span
                        className="block max-w-[280px] text-[13px] text-muted-foreground line-clamp-2"
                        title={row.original.justification}
                    >
                        {row.original.justification || "—"}
                    </span>
                ),
            },
            dateColumn<AdminQuotaRequest>({
                id: "age",
                header: t("superAdmin.quotaRequests.columns.age"),
                accessor: (row) => row.created_at,
                responsive: "md",
            }),
            {
                id: "status",
                accessorFn: (row) => row.status,
                header: () => t("superAdmin.quotaRequests.columns.status"),
                cell: ({ row }) => <RequestStatusPill status={row.original.status} />,
            },
            actionsColumn<AdminQuotaRequest>({
                ariaLabel: t("console.table.actions"),
                actions: buildActions,
            }),
        ]
    }, [t])

    const toolbar = (
        <Select
            value={statusFilter}
            onValueChange={(v) => {
                setStatusFilter(v as StatusFilter)
                // Each filter is its own server-side result set; restart it at page 1.
                setPage(1)
            }}
        >
            <SelectTrigger className="w-44">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">{t("superAdmin.quotaRequests.filters.all")}</SelectItem>
                {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                        {t(`governance.quotas.status.${s}`, { defaultValue: s })}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )

    return (
        <div className="space-y-5">
            <PageHeader
                icon={Gauge}
                breadcrumbs={[
                    { label: t("superAdmin.title") },
                    { label: t("superAdmin.quotaRequests.title") },
                ]}
                title={t("superAdmin.quotaRequests.title")}
                description={t("superAdmin.quotaRequests.subtitle")}
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

            <StatGrid stats={stats} className="lg:grid-cols-3" />

            <ResourceTable<AdminQuotaRequest>
                data={requests}
                columns={columns}
                pagination={{
                    page,
                    pageSize: QUOTA_REQUESTS_PAGE_SIZE,
                    total,
                    onPageChange: setPage,
                }}
                isLoading={isLoading}
                isError={isError}
                onRetry={() => void refetch()}
                getRowId={(row) => row.id}
                onRowClick={setDetail}
                toolbar={toolbar}
                emptyState={
                    <EmptyState
                        icon={Gauge}
                        title={t("superAdmin.quotaRequests.empty")}
                        description={t("superAdmin.quotaRequests.emptySubtitle")}
                    />
                }
            />

            <RequestDetailSheet
                request={detail}
                onOpenChange={(open) => {
                    if (!open) setDetail(null)
                }}
                onApprove={(row) => {
                    setDetail(null)
                    setApproveTarget(row)
                }}
                onReject={(row) => {
                    setDetail(null)
                    setRejectTarget(row)
                }}
            />

            <ApproveDialog
                request={approveTarget}
                onOpenChange={(open) => {
                    if (!open) setApproveTarget(null)
                }}
            />

            <RejectDialog
                request={rejectTarget}
                onOpenChange={(open) => {
                    if (!open) setRejectTarget(null)
                }}
            />
        </div>
    )
}
