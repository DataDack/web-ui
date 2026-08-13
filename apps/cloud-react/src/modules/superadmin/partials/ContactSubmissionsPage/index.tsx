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
import { Ban, Check, MailOpen, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ConfirmDialog, StatGrid, type StatCardProps } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { ContactDetailSheet } from "./ContactDetailSheet"
import { ContactStatusPill } from "./ContactStatusPill"
import { CONTACT_STATUSES } from "./contact-constants"
import { CONTACT_SUBMISSIONS_PAGE_SIZE } from "../../superadmin.api"
import {
  useAdminContactSubmissionCount,
  useAdminContactSubmissions,
  useDeleteContactSubmission,
  useUpdateContactSubmission,
} from "../../superadmin.hooks"
import type { ContactSubmission, ContactSubmissionStatus } from "../../superadmin.types"

type StatusFilter = ContactSubmissionStatus | "all"

// Two-line cell: primary line + muted secondary (name/email, company/team size).
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
 * The inbound queue from the marketing site's contact form (backend
 * apps/platform/contact).
 *
 * These leads used to land in the website's own Supabase project, where nobody
 * on the platform could see them. They open here filtered to "new", because the
 * only question this table has to answer on arrival is whether anyone is still
 * waiting on a reply.
 *
 * Filtered and paged server-side; the stat tiles read the platform-wide
 * per-status totals off limit=1 probes, so they stay accurate regardless of the
 * filter or how many pages the queue spans.
 */
export function ContactSubmissionsTab() {
  useScreen("superadmin.requests.contact")
  const { t } = useTranslation()

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("new")
  const [page, setPage] = useState(1)
  const [detail, setDetail] = useState<ContactSubmission | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ContactSubmission | null>(null)

  const {
    data: list,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useAdminContactSubmissions(statusFilter === "all" ? "" : statusFilter, page)
  const rows = list?.rows ?? []
  const total = list?.total ?? 0

  const newCount = useAdminContactSubmissionCount("new")
  const contactedCount = useAdminContactSubmissionCount("contacted")
  const closedCount = useAdminContactSubmissionCount("closed")

  const update = useUpdateContactSubmission()
  const remove = useDeleteContactSubmission()

  const stats = useMemo<StatCardProps[]>(
    () => [
      {
        label: t("superAdmin.contactSubmissions.stats.new"),
        value: newCount.data ?? 0,
        color: "warning",
        loading: newCount.isLoading,
      },
      {
        label: t("superAdmin.contactSubmissions.stats.contacted"),
        value: contactedCount.data ?? 0,
        color: "info",
        icon: MailOpen,
        loading: contactedCount.isLoading,
      },
      {
        label: t("superAdmin.contactSubmissions.stats.closed"),
        value: closedCount.data ?? 0,
        color: "success",
        icon: Check,
        loading: closedCount.isLoading,
      },
    ],
    [
      newCount.data,
      newCount.isLoading,
      contactedCount.data,
      contactedCount.isLoading,
      closedCount.data,
      closedCount.isLoading,
      t,
    ],
  )

  const columns = useMemo<ColumnDef<ContactSubmission>[]>(() => {
    // The two moves an operator makes without needing to read the message:
    // "I've replied" and "this is junk". Everything else is in the sheet.
    const buildActions = (row: ContactSubmission): RowAction<ContactSubmission>[] => {
      const actions: RowAction<ContactSubmission>[] = []
      if (row.status === "new") {
        actions.push({
          label: t("superAdmin.contactSubmissions.markContacted"),
          icon: MailOpen,
          onAction: (r) => { update.mutate({ id: r.id, payload: { status: "contacted" } }) },
        })
      }
      if (row.status !== "spam") {
        actions.push({
          label: t("superAdmin.contactSubmissions.markSpam"),
          icon: Ban,
          onAction: (r) => { update.mutate({ id: r.id, payload: { status: "spam" } }) },
        })
      }
      actions.push({
        label: t("superAdmin.actions.delete"),
        icon: Trash2,
        destructive: true,
        onAction: setDeleteTarget,
      })
      return actions
    }

    return [
      {
        id: "from",
        accessorFn: (row) => row.name,
        header: () => t("superAdmin.contactSubmissions.columns.from"),
        cell: ({ row }) => (
          <StackedCell primary={row.original.name} secondary={row.original.email} />
        ),
      },
      {
        id: "company",
        accessorFn: (row) => row.company,
        header: () => t("superAdmin.contactSubmissions.columns.company"),
        meta: { responsive: "md" },
        cell: ({ row }) => (
          <StackedCell primary={row.original.company} secondary={row.original.team_size} />
        ),
      },
      {
        id: "useCase",
        accessorFn: (row) => row.use_case,
        header: () => t("superAdmin.contactSubmissions.columns.useCase"),
        meta: { responsive: "lg" },
        cell: ({ row }) => (
          <span className="text-[13px] text-muted-foreground">{row.original.use_case || "—"}</span>
        ),
      },
      {
        id: "message",
        accessorFn: (row) => row.message,
        header: () => t("superAdmin.contactSubmissions.columns.message"),
        enableSorting: false,
        meta: { responsive: "lg" },
        cell: ({ row }) => (
          <span
            className="block max-w-[280px] text-[13px] text-muted-foreground line-clamp-2"
            title={row.original.message}
          >
            {row.original.message || "—"}
          </span>
        ),
      },
      dateColumn<ContactSubmission>({
        id: "received",
        header: t("superAdmin.contactSubmissions.columns.received"),
        accessor: (row) => row.created_at,
        responsive: "md",
      }),
      {
        id: "status",
        accessorFn: (row) => row.status,
        header: () => t("superAdmin.contactSubmissions.columns.status"),
        cell: ({ row }) => <ContactStatusPill status={row.original.status} />,
      },
      actionsColumn<ContactSubmission>({
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
        <SelectItem value="all">{t("superAdmin.contactSubmissions.filters.all")}</SelectItem>
        {CONTACT_STATUSES.map((s) => (
          <SelectItem key={s} value={s}>
            {t(`superAdmin.contactSubmissions.status.${s}`, { defaultValue: s })}
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

      <DataTable<ContactSubmission>
        data={rows}
        columns={columns}
        pagination={{
          page,
          pageSize: CONTACT_SUBMISSIONS_PAGE_SIZE,
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
            icon={MailOpen}
            title={t("superAdmin.contactSubmissions.empty")}
            description={t("superAdmin.contactSubmissions.emptySubtitle")}
          />
        }
        onRefresh={() => void refetch()}
        refreshLabel={t("console.table.refresh")}
        refreshing={isFetching}
      />

      <ContactDetailSheet
        submission={detail}
        onOpenChange={(open) => {
          if (!open) setDetail(null)
        }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title={t("superAdmin.contactSubmissions.deleteTitle")}
        // Deleting destroys the only copy — the website keeps none — so the
        // dialog says so, and points at "spam" as the thing an operator
        // reaching for delete almost always actually wants.
        description={t("superAdmin.contactSubmissions.deleteDescription", {
          name: deleteTarget?.name ?? "",
        })}
        confirmLabel={t("superAdmin.actions.delete")}
        loading={remove.isPending}
        onConfirm={() => {
          if (!deleteTarget) return
          remove.mutate(deleteTarget.id, { onSettled: () => { setDeleteTarget(null) } })
        }}
      />
    </div>
  )
}
