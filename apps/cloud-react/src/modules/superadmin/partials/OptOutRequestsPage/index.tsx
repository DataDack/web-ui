import { useMemo, useState } from "react"

import {
  actionsColumn,
  DataTable,
  dateColumn,
  EmptyState,
  type RowAction,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Check, PlayCircle, ShieldCheck } from "lucide-react"
import { useTranslation } from "react-i18next"

import { StatGrid, type StatCardProps } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { OptOutDetailSheet } from "./OptOutDetailSheet"
import { OptOutStatusPill } from "./OptOutStatusPill"
import { RightsBadges } from "./RightsBadges"
import { OPTOUT_STATUSES } from "./optout-constants"
import { OPTOUT_REQUESTS_PAGE_SIZE } from "../../superadmin.api"
import {
  useAdminOptOutRequestCount,
  useAdminOptOutRequests,
  useUpdateOptOutRequest,
} from "../../superadmin.hooks"
import type { OptOutRequest, OptOutStatus } from "../../superadmin.types"

type StatusFilter = OptOutStatus | "all"

// Two-line cell: primary line + muted secondary (name/email).
function StackedCell({ primary, secondary }: Readonly<{ primary: string; secondary: string }>) {
  return (
    <div className="flex min-w-0 flex-col">
      <span className="truncate text-sm font-medium text-foreground">{primary || "—"}</span>
      {secondary && (
        <span className="truncate text-[11px] text-muted-foreground">{secondary}</span>
      )}
    </div>
  )
}

/**
 * The privacy-rights queue from the marketing site's /opt-out form (backend
 * apps/platform/optout).
 *
 * These used to land in the website's own Supabase project, where nobody on the
 * platform could see them — with status and processed columns that nothing ever
 * wrote, because there was no surface to work them from. They open here filtered
 * to "new": the only question this table has to answer on arrival is whether
 * anyone is still waiting, and unlike the other two queues that question has a
 * clock on it.
 *
 * There is no delete action, deliberately. The backend has one for genuine
 * mistakes, but these rows are the evidence that somebody asked and that we
 * answered; a delete button in the queue would make tidying it the easy path.
 * Rejecting with a recorded reason is what "not actionable" looks like.
 */
export function OptOutRequestsTab() {
  useScreen("superadmin.requests.optout")
  const { t } = useTranslation()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("new")
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<OptOutRequest | null>(null)

  const {
    data: list,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useAdminOptOutRequests(statusFilter === "all" ? "" : statusFilter, page)
  const rows = list?.rows ?? []
  const total = list?.total ?? 0

  const newCount = useAdminOptOutRequestCount("new")
  const inProgressCount = useAdminOptOutRequestCount("in_progress")
  const completedCount = useAdminOptOutRequestCount("completed")

  const update = useUpdateOptOutRequest()

  const stats = useMemo<StatCardProps[]>(
    () => [
      {
        label: t("superAdmin.optOutRequests.stats.new"),
        value: newCount.data ?? 0,
        color: "warning",
        loading: newCount.isLoading,
      },
      {
        label: t("superAdmin.optOutRequests.stats.inProgress"),
        value: inProgressCount.data ?? 0,
        color: "info",
        icon: PlayCircle,
        loading: inProgressCount.isLoading,
      },
      {
        label: t("superAdmin.optOutRequests.stats.completed"),
        value: completedCount.data ?? 0,
        color: "success",
        icon: Check,
        loading: completedCount.isLoading,
      },
    ],
    [
      newCount.data,
      newCount.isLoading,
      inProgressCount.data,
      inProgressCount.isLoading,
      completedCount.data,
      completedCount.isLoading,
      t,
    ],
  )

  const columns = useMemo<ColumnDef<OptOutRequest>[]>(() => {
    // Only one shortcut from the row: picking a request up. Completing and
    // rejecting both need the sheet, because both need a note — and rejecting
    // without a recorded reason is exactly what must not be one click away.
    const buildActions = (row: OptOutRequest): RowAction<OptOutRequest>[] => {
      if (row.status !== "new") return []
      return [
        {
          label: t("superAdmin.optOutRequests.markInProgress"),
          icon: PlayCircle,
          onAction: (r) => { update.mutate({ id: r.id, payload: { status: "in_progress" } }) },
        },
      ]
    }

    return [
      {
        id: "requester",
        accessorFn: (row) => row.email,
        header: () => t("superAdmin.optOutRequests.columns.requester"),
        cell: ({ row }) => (
          <StackedCell
            primary={`${row.original.first_name} ${row.original.last_name}`.trim()}
            secondary={row.original.email}
          />
        ),
      },
      {
        id: "requested",
        accessorFn: (row) => row.request_types.join(","),
        header: () => t("superAdmin.optOutRequests.columns.requested"),
        enableSorting: false,
        cell: ({ row }) => <RightsBadges rights={row.original.request_types} />,
      },
      {
        id: "additionalInfo",
        accessorFn: (row) => row.additional_info,
        header: () => t("superAdmin.optOutRequests.columns.additionalInfo"),
        enableSorting: false,
        meta: { responsive: "lg" },
        cell: ({ row }) => (
          <span
            className="block max-w-[260px] text-[13px] text-muted-foreground line-clamp-2"
            title={row.original.additional_info}
          >
            {row.original.additional_info || "—"}
          </span>
        ),
      },
      dateColumn<OptOutRequest>({
        id: "received",
        header: t("superAdmin.optOutRequests.columns.received"),
        accessor: (row) => row.created_at,
        responsive: "md",
      }),
      {
        id: "status",
        accessorFn: (row) => row.status,
        header: () => t("superAdmin.optOutRequests.columns.status"),
        cell: ({ row }) => <OptOutStatusPill status={row.original.status} />,
      },
      actionsColumn<OptOutRequest>({
        ariaLabel: t("console.table.actions"),
        actions: buildActions,
      }),
    ]
  }, [t, update])

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
        <SelectItem value="all">{t("superAdmin.optOutRequests.filters.all")}</SelectItem>
        {OPTOUT_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {t(`superAdmin.optOutRequests.status.${s}`, { defaultValue: s })}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )

  return (
    <div className="space-y-5">
      {/* The shared Requests page owns the header; the per-status totals stay
          here because they describe this queue, not the page. */}
      <StatGrid stats={stats} className="lg:grid-cols-3" />

      <DataTable<OptOutRequest>
        data={rows}
        columns={columns}
        pagination={{
          page,
          pageSize: OPTOUT_REQUESTS_PAGE_SIZE,
          total,
          onPageChange: setPage,
        }}
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        getRowId={(row) => row.id}
        onRowClick={setDetail}
        toolbar={toolbar}
        empty={
          <EmptyState
            icon={ShieldCheck}
            title={t("superAdmin.optOutRequests.empty")}
            description={t("superAdmin.optOutRequests.emptySubtitle")}
          />
        }
        onRefresh={() => void refetch()}
        refreshLabel={t("console.table.refresh")}
        refreshing={isFetching}
      />

      <OptOutDetailSheet
        request={detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null)
        }}
      />
    </div>
  )
}
