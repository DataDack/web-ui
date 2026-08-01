import { useMemo, useState } from "react"
import { useScreen } from "@/services/api/screen"

import type { ColumnDef } from "@tanstack/react-table"
import { LifeBuoy, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import {
    EmptyState,
    PageHeader,
    ResourceTable,
    dateColumn,
    statusColumn,
    textColumn,
} from "@/components/console"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { PriorityBadge } from "@/modules/support-tickets/components/PriorityBadge"
import {
    formatTicketAccount,
    formatTicketPerson,
} from "@/modules/support-tickets/components/ticket-format"
import {
    TICKET_STATUSES,
    categoryLabelKey,
} from "@/modules/support-tickets/support-tickets.constants"
import { useAllSupportTickets } from "@/modules/support-tickets/support-tickets.hooks"
import type { SupportTicket, TicketStatus } from "@/modules/support-tickets/support-tickets.types"

type StatusFilter = TicketStatus | "all"

// Super-admin support queue. Reuses the support-tickets data layer + cell
// components, but lives in the /admin shell and routes to /admin/support/:id.
export function AdminSupportTicketsPage() {
    useScreen("superadmin.admin-support-tickets")
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { data: tickets = [], isLoading, isError, refetch, isFetching } = useAllSupportTickets()
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

    const visible = useMemo(
        () =>
            statusFilter === "all" ? tickets : tickets.filter((tk) => tk.status === statusFilter),
        [tickets, statusFilter]
    )

    const columns = useMemo<ColumnDef<SupportTicket>[]>(
        () => [
            {
                id: "subject",
                accessorFn: (row) => row.subject,
                header: () => t("supportTickets.columns.subject"),
                cell: ({ row }) => (
                    <span className="font-medium text-foreground line-clamp-1">
                        {row.original.subject}
                    </span>
                ),
            },
            textColumn<SupportTicket>({
                id: "account",
                header: t("supportTickets.columns.account"),
                accessor: (row) => formatTicketAccount(row.accountName, row.accountNumber),
                responsive: "lg",
            }),
            textColumn<SupportTicket>({
                id: "requester",
                header: t("supportTickets.columns.requester"),
                accessor: (row) =>
                    formatTicketPerson(row.createdBy, row.createdByName, row.createdByEmail),
                responsive: "lg",
            }),
            textColumn<SupportTicket>({
                id: "category",
                header: t("supportTickets.columns.category"),
                accessor: (row) => t(categoryLabelKey(row.category)),
                responsive: "md",
            }),
            {
                id: "priority",
                accessorFn: (row) => row.priority,
                header: () => t("supportTickets.columns.priority"),
                cell: ({ row }) => <PriorityBadge priority={row.original.priority} />,
            },
            statusColumn<SupportTicket>({
                header: t("supportTickets.columns.status"),
                accessor: (row) => row.status,
            }),
            dateColumn<SupportTicket>({
                header: t("common.created"),
                accessor: (row) => row.createdAt,
                responsive: "lg",
            }),
        ],
        [t]
    )

    const toolbar = (
        <Select
            value={statusFilter}
            onValueChange={(v) => {
                setStatusFilter(v as StatusFilter)
            }}
        >
            <SelectTrigger className="w-44">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="all">{t("supportTickets.filter.allStatuses")}</SelectItem>
                {TICKET_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                        {t(`status.${s}`, { defaultValue: s })}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )

    return (
        <div className="space-y-5">
            <PageHeader
                icon={LifeBuoy}
                breadcrumbs={[
                    { label: t("superAdmin.title") },
                    { label: t("superAdmin.support.title") },
                ]}
                title={t("superAdmin.support.title")}
                description={t("superAdmin.support.subtitle")}
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

            <ResourceTable<SupportTicket>
                data={visible}
                columns={columns}
                isLoading={isLoading}
                isError={isError}
                onRetry={() => void refetch()}
                getRowId={(row) => row.id}
                onRowClick={(row) => void navigate(`/admin/support/${row.id}`)}
                toolbar={toolbar}
                emptyState={
                    <EmptyState
                        icon={LifeBuoy}
                        title={t("superAdmin.support.empty")}
                        description={t("superAdmin.support.emptySubtitle")}
                    />
                }
            />
        </div>
    )
}
