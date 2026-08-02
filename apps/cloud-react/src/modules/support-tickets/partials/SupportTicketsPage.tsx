import { useMemo, useState } from "react"

import {
  Button,
  DataTable,
  dateColumn,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  statusColumn,
  textColumn,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { LifeBuoy, Plus, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { PriorityBadge } from "../components/PriorityBadge"
import { SUPPORT_ROUTES, TICKET_STATUSES, categoryLabelKey } from "../support-tickets.constants"
import { useSupportTickets } from "../support-tickets.hooks"
import type { SupportTicket, TicketStatus } from "../support-tickets.types"

type StatusFilter = TicketStatus | "all"

export function SupportTicketsPage() {
  useScreen("support-tickets")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: tickets = [], isLoading, isError, refetch, isFetching } = useSupportTickets()
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  const visible = useMemo(
    () => (statusFilter === "all" ? tickets : tickets.filter((tk) => tk.status === statusFilter)),
    [tickets, statusFilter],
  )

  const columns = useMemo<ColumnDef<SupportTicket>[]>(
    () => [
      {
        id: "subject",
        accessorFn: (row) => row.subject,
        header: () => t("supportTickets.columns.subject"),
        cell: ({ row }) => (
          <span className="font-medium text-foreground line-clamp-1">{row.original.subject}</span>
        ),
      },
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
    [t],
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
    <div className="max-w-[1440px] mx-auto px-5 lg:px-8 py-2">
      <PageHeader
        icon={LifeBuoy}
        breadcrumbs={[
          { label: t("console.nav.groups.support") },
          { label: t("supportTickets.title") },
        ]}
        title={t("supportTickets.title")}
        description={t("supportTickets.subtitle")}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void refetch()}
              title={t("common.refresh")}
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="gold"
              className="gap-2"
              onClick={() => void navigate(SUPPORT_ROUTES.CREATE)}
            >
              <Plus className="w-4 h-4" />
              {t("supportTickets.create")}
            </Button>
          </>
        }
      />

      <DataTable<SupportTicket>
        data={visible}
        columns={columns}
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        getRowId={(row) => row.id}
        onRowClick={(row) => void navigate(SUPPORT_ROUTES.detail(row.id))}
        toolbar={toolbar}
        empty={
          <EmptyState
            icon={LifeBuoy}
            title={t("supportTickets.empty")}
            description={t("supportTickets.emptySubtitle")}
            action={{
              label: t("supportTickets.create"),
              onClick: () => void navigate(SUPPORT_ROUTES.CREATE),
            }}
          />
        }
        onRefresh={() => void refetch()}
        refreshLabel={t("console.table.refresh")}
        refreshing={isFetching}
      />
    </div>
  )
}
