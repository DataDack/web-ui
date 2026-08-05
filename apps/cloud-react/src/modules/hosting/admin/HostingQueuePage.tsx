import { useMemo, useState } from "react"

import {
  actionsColumn,
  Badge,
  Button,
  DataTable,
  EmptyState,
  StatusBadge,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { CheckCircle2, ListChecks, RotateCw, XCircle } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { PageHeader } from "@/components/console"

import { HOSTING_ADMIN_ROUTES } from "../hosting.constants"
import {
  useCancelHostingJob,
  useHostingJobCounts,
  useHostingJobs,
  useRetryHostingJob,
} from "../hosting.hooks"
import type { HostingJob, JobStatus } from "../hosting.types"

const TABS: { key: JobStatus | "ALL"; label: string }[] = [
  { key: "DEAD_LETTER", label: "Failed" },
  { key: "QUEUED", label: "Queued" },
  { key: "RETRY", label: "Retrying" },
  { key: "PROCESSING", label: "Running" },
  { key: "COMPLETED", label: "Completed" },
  { key: "ALL", label: "All" },
]

/**
 * The provisioning queue — WHMCS's Module Queue, plus everything in flight.
 *
 * "Failed" is the default tab on purpose: it is the only state nothing in the
 * system will ever revisit on its own, so it is the one that needs a human.
 */
export function HostingQueuePage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<JobStatus | "ALL">("DEAD_LETTER")

  const { data: counts = {} } = useHostingJobCounts()
  const {
    data: jobs = [],
    isLoading,
    isError,
    refetch,
  } = useHostingJobs(tab === "ALL" ? undefined : tab)
  const retry = useRetryHostingJob()
  const cancel = useCancelHostingJob()

  const columns = useMemo<ColumnDef<HostingJob>[]>(
    () => [
      {
        id: "action",
        header: () => <span className="text-xs font-semibold uppercase tracking-wider">Job</span>,
        accessorFn: (j) => j.action,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-[14px] font-semibold">{row.original.action}</span>
            <span className="mt-0.5 font-mono text-[11px] text-muted-foreground">
              {row.original.idempotency_key}
            </span>
          </div>
        ),
      },
      {
        id: "account",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">Account</span>
        ),
        accessorFn: (j) => j.account_id ?? "",
        cell: ({ row }) => {
          const accountID = row.original.account_id
          if (!accountID) return <span className="text-[12px] text-muted-foreground">—</span>
          return (
            <button
              type="button"
              className="font-mono text-[12px] text-primary hover:underline"
              onClick={() => void navigate(HOSTING_ADMIN_ROUTES.account(accountID))}
            >
              {accountID.slice(0, 8)}…
            </button>
          )
        },
      },
      {
        id: "attempts",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">Attempts</span>
        ),
        accessorFn: (j) => j.attempts,
        cell: ({ row }) => (
          <div className="flex flex-col text-[13px]">
            <span>
              {row.original.attempts} / {row.original.max_attempts}
            </span>
            <span className="text-[11px] text-muted-foreground">
              next {new Date(row.original.next_run_at).toLocaleTimeString()}
            </span>
          </div>
        ),
      },
      {
        id: "error",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">Last error</span>
        ),
        accessorFn: (j) => j.last_error,
        cell: ({ row }) =>
          row.original.last_error ? (
            // The panel's own words, verbatim. Paraphrasing a WHM reason is how
            // an operator ends up debugging the wrong thing.
            <span
              className="block max-w-[380px] truncate text-[12px] text-destructive"
              title={row.original.last_error}
            >
              {row.original.last_error}
            </span>
          ) : (
            <span className="text-[12px] text-muted-foreground">—</span>
          ),
      },
      {
        id: "status",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">Status</span>
        ),
        accessorFn: (j) => j.status,
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1">
            <StatusBadge
              status={row.original.status}
              pulse={row.original.status === "PROCESSING"}
            />
            {row.original.locked_by && (
              <span className="font-mono text-[10px] text-muted-foreground">
                {row.original.locked_by}
              </span>
            )}
          </div>
        ),
      },
      actionsColumn<HostingJob>({
        ariaLabel: "Job actions",
        actions: (job) => {
          const actions = []
          if (job.status === "DEAD_LETTER" || job.status === "CANCELLED") {
            actions.push({
              label: "Retry",
              icon: RotateCw,
              onAction: (j: HostingJob) => {
                retry.mutate(j.id)
              },
            })
          }
          if (!["COMPLETED", "DEAD_LETTER", "CANCELLED"].includes(job.status)) {
            actions.push({
              label: "Cancel",
              icon: XCircle,
              destructive: true,
              onAction: (j: HostingJob) => {
                cancel.mutate(j.id)
              },
            })
          }
          return actions
        },
      }),
    ],
    [cancel, navigate, retry],
  )

  const failed = counts.DEAD_LETTER

  return (
    <div className="space-y-6">
      <PageHeader
        title="Provisioning queue"
        description="Every control-panel command, with the panel's own reason when one fails."
        icon={ListChecks}
        meta={
          failed > 0 ? (
            <Badge variant="outline" className="gap-1 border-destructive/40 text-destructive">
              <XCircle className="size-3" /> {failed} failed permanently
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <CheckCircle2 className="size-3" /> nothing stuck
            </Badge>
          )
        }
        actions={
          <Button variant="outline" onClick={() => void refetch()}>
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Button
            key={t.key}
            size="sm"
            variant={tab === t.key ? "default" : "outline"}
            onClick={() => {
              setTab(t.key)
            }}
          >
            {t.label}
            {t.key !== "ALL" && counts[t.key] ? (
              <Badge variant="secondary" className="ml-1.5">
                {counts[t.key]}
              </Badge>
            ) : null}
          </Button>
        ))}
      </div>

      <DataTable
        data={jobs}
        columns={columns}
        loading={isLoading}
        error={isError ? "The queue could not be loaded." : undefined}
        onRetry={() => void refetch()}
        empty={
          <EmptyState
            icon={CheckCircle2}
            title={tab === "DEAD_LETTER" ? "Nothing has failed" : "Nothing here"}
            description={
              tab === "DEAD_LETTER"
                ? "Jobs that exhaust their retries land here with the control panel's reason attached."
                : "No jobs in this state right now."
            }
          />
        }
      />
    </div>
  )
}
