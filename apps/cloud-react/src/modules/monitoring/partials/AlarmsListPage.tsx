// The alarms list, readable as a sentence: what state it is in, what it is
// called, and — the part that used to be missing — what it actually watches.
//
// The old secondary line printed the series address ("lb/loadbalancer ·
// error_rate_5xx"), which is the backend's name for a metric, not the user's
// name for the thing being watched. Every row now resolves its dimension id
// back to the resource it points at, so "which load balancer is this about?"
// is answered without opening anything.
//
// All presentation vocabulary (state chips, severity chips, condition text,
// relative times) comes from ../monitoring.meta — this file keeps no copies.

import { useMemo, useState } from "react"

import { Badge } from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { BellOff, BellRing, Pencil, Plus, RefreshCw, Search, SearchX, Trash2 } from "lucide-react"
import { Link, useNavigate } from "react-router-dom"

import {
  actionsColumn,
  ConfirmDialog,
  EmptyState,
  PageHeader,
  ResourceTable,
} from "@/components/console"
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@datadack/common-ui"
import { cn } from "@/lib/utils"
import { useDisks } from "@/modules/disks/disks.hooks"
import { useLoadBalancers } from "@/modules/load-balancers/load-balancers.hooks"
import { useInstances } from "@/modules/vms/vms.hooks"
import { useScreen } from "@/services/api/screen"

import { AlarmStateChip, SeverityChip } from "../components/StateChips"
import { MONITORING_ROUTES } from "../monitoring.constants"
import { useAlarms, useDeleteAlarm, useSetAlarmEnabled } from "../monitoring.hooks"
import { alarmStateLabel, conditionSummary, timeAgo } from "../monitoring.meta"
import {
  type AlarmTargetType,
  metricLabelForAlarm,
  resolveTarget,
  TARGET_TYPE_META,
  TARGET_TYPES,
  unitForAlarm,
} from "../monitoring.targets"
import type { Alarm, AlertSeverity } from "../monitoring.types"

// ---------------------------------------------------------------------------
// Row model — one pass resolves each alarm into what the table renders, what
// the filters compare against, and what the search box matches.
// ---------------------------------------------------------------------------

const ALL = "all"
const SEPARATOR = " · "
const DELETED = "deleted resource"

interface TargetInfo {
  type: AlarmTargetType
  /** The resource's own name, or a plain-English stand-in when it is gone. */
  title: string
  /** Metric label — "5xx error rate", never "error_rate_5xx". */
  signal: string
  /** True once the resource lists have loaded and this id is not among them. */
  missing: boolean
}

interface AlarmRow {
  alarm: Alarm
  target: TargetInfo
  /** Condition text with the metric's unit on the threshold. */
  condition: string
  /** Lowercased haystack for the search box. */
  haystack: string
}

interface Filters {
  query: string
  state: string
  severity: string
  type: string
}

function shortId(id: string): string {
  if (!id) return "unknown"
  return id.length > 8 ? id.slice(0, 8) : id
}

/** "avg > 80% · 3/5 × 60s" — the unit belongs on the threshold, not the tail. */
function conditionText(alarm: Alarm): string {
  const summary = conditionSummary(alarm)
  const unit = unitForAlarm(alarm)
  if (!unit) return summary
  const parts = summary.split(SEPARATOR)
  parts[0] = `${parts[0]}${unit === "%" ? "" : " "}${unit}`
  return parts.join(SEPARATOR)
}

/**
 * Which resource does this alarm watch? `settled` guards the "deleted" verdict:
 * while the resource lists are still loading, an unresolved id is unknown, not
 * gone, so the row shows the short id and says nothing it cannot back up.
 */
function targetInfo(alarm: Alarm, names: Map<string, string>, settled: boolean): TargetInfo {
  const { type, targetId } = resolveTarget(alarm)
  const signal = metricLabelForAlarm(alarm)
  if (type === "custom") {
    return {
      type,
      title: alarm.metric_namespace || "Custom metric",
      signal,
      missing: false,
    }
  }
  const name = targetId ? names.get(targetId) : undefined
  if (name) return { type, title: name, signal, missing: false }
  if (!targetId) {
    const label = TARGET_TYPE_META[type].label.toLowerCase()
    return { type, title: `unspecified ${label}`, signal, missing: false }
  }
  return {
    type,
    title: settled ? `${DELETED}${SEPARATOR}${shortId(targetId)}` : shortId(targetId),
    signal,
    missing: settled,
  }
}

function haystackFor(alarm: Alarm, target: TargetInfo): string {
  return [
    alarm.name,
    alarm.description,
    target.title,
    target.signal,
    TARGET_TYPE_META[target.type].label,
    alarm.metric_namespace,
    alarm.metric_name,
    alarmStateLabel(alarm.state),
    alarm.severity,
    ...alarm.channels.map((binding) => binding.channel_name),
  ]
    .join(" ")
    .toLowerCase()
}

function matchesFilters(row: AlarmRow, filters: Filters): boolean {
  if (filters.state !== ALL && row.alarm.state !== filters.state) return false
  if (filters.severity !== ALL && row.alarm.severity !== filters.severity) return false
  if (filters.type !== ALL && row.target.type !== filters.type) return false
  return !filters.query || row.haystack.includes(filters.query)
}

// ---------------------------------------------------------------------------
// Filter vocabulary
// ---------------------------------------------------------------------------

interface FilterOption {
  value: string
  label: string
}

const STATE_FILTERS: readonly FilterOption[] = [
  { value: ALL, label: "All states" },
  { value: "ALARM", label: alarmStateLabel("ALARM") },
  { value: "INSUFFICIENT_DATA", label: alarmStateLabel("INSUFFICIENT_DATA") },
  { value: "OK", label: alarmStateLabel("OK") },
]

const SEVERITY_FILTERS: readonly FilterOption[] = [
  { value: ALL, label: "All severities" },
  { value: "critical", label: "Critical" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" },
]

const TYPE_FILTERS: readonly FilterOption[] = [
  { value: ALL, label: "All resource types" },
  ...TARGET_TYPES.map((meta) => ({ value: meta.type, label: meta.label })),
]

/** Sorts critical above warning above info, instead of alphabetically. */
const SEVERITY_RANK: Record<AlertSeverity, number> = {
  critical: 3,
  warning: 2,
  info: 1,
}

// ---------------------------------------------------------------------------
// Stateless cells
// ---------------------------------------------------------------------------

function TargetCell({ info }: Readonly<{ info: TargetInfo }>) {
  const Icon = TARGET_TYPE_META[info.type].icon
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Icon
        aria-hidden
        className={cn(
          "size-3.5 shrink-0",
          info.missing ? "text-status-warning" : "text-muted-foreground",
        )}
      />
      <div className="min-w-0">
        <p
          className={cn(
            "truncate font-mono text-[12px]",
            info.missing ? "text-muted-foreground italic" : "text-foreground",
          )}
          title={info.title}
        >
          {info.title}
        </p>
        <p className="truncate text-[11px] text-muted-foreground">{info.signal}</p>
      </div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: Readonly<{
  label: string
  value: string
  options: readonly FilterOption[]
  onChange: (value: string) => void
}>) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-[168px]" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AlarmsListPage() {
  useScreen("monitoring.alarms-list")
  const navigate = useNavigate()

  const { data: alarms = [], isLoading, isError, refetch, isFetching } = useAlarms()

  // All three resource lists, so a dimension id can be turned back into the
  // name the user knows the resource by.
  const loadBalancers = useLoadBalancers()
  const instances = useInstances()
  const disks = useDisks()

  const setEnabled = useSetAlarmEnabled()
  const deleteAlarm = useDeleteAlarm()

  const [search, setSearch] = useState("")
  const [stateFilter, setStateFilter] = useState(ALL)
  const [severityFilter, setSeverityFilter] = useState(ALL)
  const [typeFilter, setTypeFilter] = useState(ALL)
  const [toDelete, setToDelete] = useState<Alarm | null>(null)

  const resourceNames = useMemo(() => {
    const names = new Map<string, string>()
    for (const lb of loadBalancers.data ?? []) names.set(lb.id, lb.name)
    for (const instance of instances.data ?? []) names.set(instance.id, instance.name)
    for (const disk of disks.data ?? []) names.set(disk.id, disk.name)
    return names
  }, [loadBalancers.data, instances.data, disks.data])

  const listsSettled = !loadBalancers.isLoading && !instances.isLoading && !disks.isLoading

  const rows = useMemo<AlarmRow[]>(
    () =>
      alarms.map((alarm) => {
        const target = targetInfo(alarm, resourceNames, listsSettled)
        return {
          alarm,
          target,
          condition: conditionText(alarm),
          haystack: haystackFor(alarm, target),
        }
      }),
    [alarms, resourceNames, listsSettled],
  )

  const filtersActive =
    search.trim() !== "" || stateFilter !== ALL || severityFilter !== ALL || typeFilter !== ALL

  const visibleRows = useMemo(() => {
    const filters: Filters = {
      query: search.trim().toLowerCase(),
      state: stateFilter,
      severity: severityFilter,
      type: typeFilter,
    }
    return rows.filter((row) => matchesFilters(row, filters))
  }, [rows, search, stateFilter, severityFilter, typeFilter])

  const clearFilters = () => {
    setSearch("")
    setStateFilter(ALL)
    setSeverityFilter(ALL)
    setTypeFilter(ALL)
  }

  const columns = useMemo<ColumnDef<AlarmRow>[]>(
    () => [
      {
        id: "state",
        accessorFn: (row) => row.alarm.state,
        header: () => "State",
        cell: ({ row }) => (
          <span className="flex items-center gap-1.5">
            <AlarmStateChip state={row.original.alarm.state} />
            {!row.original.alarm.enabled && (
              <Badge
                variant="outline"
                className="font-mono text-[11px] text-muted-foreground border-dashed"
              >
                disabled
              </Badge>
            )}
          </span>
        ),
      },
      {
        id: "name",
        accessorFn: (row) => row.alarm.name,
        header: () => "Name",
        cell: ({ row }) => (
          <Link
            to={MONITORING_ROUTES.alarm(row.original.alarm.id)}
            className="font-mono text-[13px] font-medium text-foreground hover:underline"
            onClick={(e) => {
              // Row click already navigates; keep the link for
              // affordance + middle-click without double-firing.
              e.stopPropagation()
              void navigate(MONITORING_ROUTES.alarm(row.original.alarm.id))
            }}
          >
            {row.original.alarm.name}
          </Link>
        ),
      },
      {
        id: "target",
        accessorFn: (row) => row.target.title,
        header: () => "Target",
        cell: ({ row }) => <TargetCell info={row.original.target} />,
      },
      {
        id: "condition",
        enableSorting: false,
        header: () => "Condition",
        meta: { responsive: "md" },
        cell: ({ row }) => (
          <span className="font-mono text-[12px] text-muted-foreground whitespace-nowrap">
            {row.original.condition}
          </span>
        ),
      },
      {
        id: "severity",
        accessorFn: (row) => SEVERITY_RANK[row.alarm.severity],
        header: () => "Severity",
        meta: { responsive: "md" },
        cell: ({ row }) => <SeverityChip severity={row.original.alarm.severity} />,
      },
      {
        id: "channels",
        enableSorting: false,
        header: () => "Notifies",
        meta: { responsive: "xl" },
        cell: ({ row }) => (
          <span className="text-[12px] text-muted-foreground">
            {row.original.alarm.channels.length === 0
              ? "nobody yet"
              : row.original.alarm.channels.map((binding) => binding.channel_name).join(", ")}
          </span>
        ),
      },
      {
        id: "since",
        accessorFn: (row) => row.alarm.state_updated_at,
        header: () => "Since",
        meta: { responsive: "lg" },
        cell: ({ row }) => (
          <span
            className="font-mono text-[12px] text-muted-foreground whitespace-nowrap"
            title={new Date(row.original.alarm.state_updated_at).toLocaleString()}
          >
            {timeAgo(row.original.alarm.state_updated_at)}
          </span>
        ),
      },
      actionsColumn<AlarmRow>({
        ariaLabel: "Alarm actions",
        actions: (row) => [
          {
            label: "Edit",
            icon: Pencil,
            onAction: (target: AlarmRow) => {
              void navigate(MONITORING_ROUTES.alarmEdit(target.alarm.id))
            },
          },
          {
            label: row.alarm.enabled ? "Disable" : "Enable",
            icon: row.alarm.enabled ? BellOff : BellRing,
            onAction: (target: AlarmRow) => {
              setEnabled.mutate({
                id: target.alarm.id,
                enabled: !target.alarm.enabled,
              })
            },
          },
          {
            label: "Delete",
            icon: Trash2,
            destructive: true,
            onAction: (target: AlarmRow) => {
              setToDelete(target.alarm)
            },
          },
        ],
      }),
    ],
    [navigate, setEnabled],
  )

  const noMatchState = (
    <EmptyState
      icon={SearchX}
      title="No alarms match these filters"
      description="Nothing in this account matches what you searched for. Widen the filters to see the rest."
      action={{ label: "Clear filters", onClick: clearFilters }}
    />
  )

  const noAlarmsState = (
    <EmptyState
      icon={BellRing}
      title="No alarms yet"
      description="Pick a load balancer, instance or disk and get told when one of its signals crosses a line."
      action={{
        label: "Create alarm",
        onClick: () => void navigate(MONITORING_ROUTES.alarmCreate),
      }}
    />
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={BellRing}
        breadcrumbs={[{ label: "Monitoring", to: MONITORING_ROUTES.root }, { label: "Alarms" }]}
        title="Alarms"
        description="What each alarm watches, how it is doing right now, and who hears about it."
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void refetch()}
              disabled={isFetching}
              aria-label="Refresh"
            >
              <RefreshCw className={cn("size-4", isFetching && "animate-spin")} />
            </Button>
            <Button className="gap-2" onClick={() => void navigate(MONITORING_ROUTES.alarmCreate)}>
              <Plus className="size-4" />
              Create alarm
            </Button>
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
            }}
            placeholder="Search by alarm name, resource, or signal…"
            className="h-8 pl-8"
            aria-label="Search alarms"
          />
        </div>
        <FilterSelect
          label="State"
          value={stateFilter}
          options={STATE_FILTERS}
          onChange={setStateFilter}
        />
        <FilterSelect
          label="Severity"
          value={severityFilter}
          options={SEVERITY_FILTERS}
          onChange={setSeverityFilter}
        />
        <FilterSelect
          label="Resource type"
          value={typeFilter}
          options={TYPE_FILTERS}
          onChange={setTypeFilter}
        />
        {filtersActive && rows.length > 0 && (
          <span className="font-mono text-[11px] text-muted-foreground">
            {String(visibleRows.length)} of {String(rows.length)}
          </span>
        )}
      </div>

      <ResourceTable<AlarmRow>
        data={visibleRows}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        getRowId={(row) => row.alarm.id}
        onRowClick={(row) => void navigate(MONITORING_ROUTES.alarm(row.alarm.id))}
        emptyState={filtersActive && rows.length > 0 ? noMatchState : noAlarmsState}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title="Delete alarm"
        description={`Delete "${toDelete?.name ?? ""}"? Its state history and channel bindings are removed too.`}
        confirmLabel="Delete"
        loading={deleteAlarm.isPending}
        onConfirm={() => {
          if (!toDelete) return
          deleteAlarm.mutate(toDelete.id, {
            onSuccess: () => {
              setToDelete(null)
            },
          })
        }}
      />
    </div>
  )
}
