// The page someone lands on after being paged.
//
// It answers, in order: what is wrong, on which resource, since when, what the
// rule is, who was told — and it lets them act (edit, disable, test, delete)
// without leaving. Everything user-facing goes through monitoring.meta, so the
// wording matches the create/edit form word for word and no raw backend enum
// ("INSUFFICIENT_DATA", "treat_missing_data") ever reaches the screen.

import { useMemo, useState } from "react"

import {
  Badge,
  Button,
  EmptyState,
  Skeleton,
  DataTable,
  type DataTableColumnMeta,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Activity,
  BellOff,
  BellRing,
  ExternalLink,
  History,
  Pencil,
  Send,
  Settings2,
  SquareArrowRight,
  Trash2,
} from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"
import { toast } from "sonner"

import {
  type AnimatedTab,
  AnimatedTabs,
  ConfirmDialog,
  KeyValueGrid,
  type KeyValueItem,
  MetricChart,
  PageHeader,
  Section,
} from "@/components/console"
import { cn } from "@/lib/utils"
import { useDisks } from "@/modules/disks/disks.hooks"
import { useLoadBalancers } from "@/modules/load-balancers/load-balancers.hooks"
import { useInstances } from "@/modules/vms/vms.hooks"
import { useScreen } from "@/services/api/screen"

import { TYPE_META } from "../channels/channels.meta"
import { AlarmStateChip, SeverityChip } from "../components/StateChips"
import { MONITORING_ROUTES } from "../monitoring.constants"
import {
  useAlarm,
  useAlarmHistory,
  useAlarmNotifications,
  useDeleteAlarm,
  useJiraConnections,
  useMetricsQuery,
  useSetAlarmEnabled,
  useTestSavedChannel,
} from "../monitoring.hooks"
import {
  CHART_RANGES,
  conditionSentence,
  DEFAULT_CHART_RANGE,
  durationSince,
  formatDateTime,
  formatDimensions,
  OPERATOR_PHRASES,
  periodLabel,
  SERIES_COLOR_ALARM,
  SERIES_COLOR_OK,
  THRESHOLD_COLOR,
  thresholdText,
  timeAgo,
  describeTransitions,
  TREAT_MISSING_LABELS,
} from "../monitoring.meta"
import {
  type AlarmTargetType,
  metricLabelForAlarm,
  resolveTarget,
  TARGET_TYPE_META,
  unitForAlarm,
} from "../monitoring.targets"
import type {
  Alarm,
  AlarmChannelBinding,
  AlarmHistoryEntry,
  AlarmNotification,
  MetricsWindowQuery,
} from "../monitoring.types"

// ---------------------------------------------------------------------------
// Local constants
// ---------------------------------------------------------------------------

const DASH = "—"
const PERCENT = "%"
const NO_DATA = "no data"

const TAB_OVERVIEW = "overview"
const TAB_DELIVERIES = "deliveries"
const TAB_HISTORY = "history"
const TAB_CONFIG = "configuration"

const CELL = "px-3 align-top font-mono text-[12px]"
const CELL_MUTED = "px-3 align-top font-mono text-[12px] text-muted-foreground"
const META_LINE = "text-[12px] text-muted-foreground"

/** Jira issue keys look like ABC-123 — anything else is not linkable. */
const JIRA_ISSUE_KEY = /^[A-Z][A-Z0-9]+-\d+$/

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function unitSuffix(unit: string): string {
  if (!unit) return ""
  if (unit === PERCENT) return unit
  return ` ${unit}`
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) return String(value)
  return value.toFixed(2)
}

function formatValue(value: number | null, unit: string): string {
  if (value === null) return DASH
  return `${formatNumber(value)}${unitSuffix(unit)}`
}

function unitParens(unit: string): string {
  if (!unit) return ""
  return ` (${unit})`
}

/** Enough of a uuid to recognise it, for resources that are no longer listed. */
function shortId(id: string): string {
  if (!id) return "unknown"
  return id.length > 8 ? id.slice(0, 8) : id
}

/**
 * What the alarm watches, in the user's words: the resource name, or an honest
 * substitute when the resource is gone or the alarm predates the convention.
 */
function resourceDisplay(
  type: AlarmTargetType,
  targetId: string,
  resourceName: string,
  missing: boolean,
): string {
  if (type === "custom") return "A custom metric you push yourself"
  if (!targetId) return `An unspecified ${TARGET_TYPE_META[type].label.toLowerCase()}`
  if (missing) return `${shortId(targetId)} — no longer listed`
  return resourceName
}

/** "On lb-prod-web" — the resource, never the namespace. */
function subjectPhrase(type: AlarmTargetType, display: string): string {
  if (type === "custom") return "Custom metric"
  return `On ${display}`
}

function headerDescription(alarm: Alarm, subject: string): string {
  const parts = [subject, metricLabelForAlarm(alarm)]
  if (alarm.state === "ALARM") {
    parts.push(`in alarm for ${durationSince(alarm.state_updated_at)}`)
  }
  return parts.join(" · ")
}

/** Why there is no line to draw — stated instead of an empty panel. */
function chartMessage(
  isLoading: boolean,
  isError: boolean,
  count: number,
  rangeLabel: string,
): string {
  if (isLoading) return "Loading the metric…"
  if (isError) return "Could not load this metric right now. Retry in a moment."
  if (count === 0) {
    return `Nothing reported in the last ${rangeLabel}. If the resource is off, or nothing is pushing this metric, the alarm sits at Not reporting.`
  }
  return `Only one datapoint in the last ${rangeLabel} — not enough to draw a line yet.`
}

/** -1 is the evaluator's marker for "this period had no datapoints". */
function datapointsText(values: number[]): string {
  return values.map((value) => (value === -1 ? NO_DATA : formatNumber(value))).join(" · ")
}

function ruleText(alarm: Alarm): string {
  return (
    `${String(alarm.datapoints_to_alarm)} of the last ${String(alarm.evaluation_periods)} ` +
    `periods of ${periodLabel(alarm.period_seconds)}`
  )
}

/** The channel answered, but refused the delivery — say what it said. */
function testFailureText(channelName: string, error: string): string {
  const detail = error ? `: ${error}` : ""
  return `${channelName} did not accept the test${detail}`
}

function jiraIssueUrl(
  reference: string,
  binding: AlarmChannelBinding | undefined,
  hasJiraChannel: boolean,
  siteUrl: string,
): string | null {
  if (!siteUrl || !JIRA_ISSUE_KEY.test(reference)) return null
  // The row's channel may have been deleted since — fall back to "this alarm
  // notifies Jira at all", which is the only signal left.
  const isJira = binding ? binding.channel_type === "jira" : hasJiraChannel
  if (!isJira) return null
  return `${siteUrl}/browse/${reference}`
}

// ---------------------------------------------------------------------------
// Stateless pieces
// ---------------------------------------------------------------------------

function AlarmMetaChips({ alarm }: Readonly<{ alarm: Alarm }>) {
  return (
    <>
      <AlarmStateChip state={alarm.state} />
      <SeverityChip severity={alarm.severity} />
      {!alarm.enabled && (
        <Badge
          variant="outline"
          className="border-dashed font-mono text-[11px] text-muted-foreground"
          title="A disabled alarm is not evaluated and sends nothing until you enable it."
        >
          Disabled
        </Badge>
      )}
    </>
  )
}

function ConditionPanel({ alarm }: Readonly<{ alarm: Alarm }>) {
  return (
    <div className="glass-1 rounded-lg px-4 py-3">
      <p className="text-[13px] text-foreground/90">
        {conditionSentence(alarm, metricLabelForAlarm(alarm), unitForAlarm(alarm))}
      </p>
      {alarm.state_reason && (
        <p className="mt-1.5 font-mono text-[12px] text-muted-foreground">{alarm.state_reason}</p>
      )}
    </div>
  )
}

/** The two facts that make an alarm useless, said out loud. */
function AlarmNotices({ alarm }: Readonly<{ alarm: Alarm }>) {
  return (
    <>
      {!alarm.enabled && (
        <p className="text-[13px] text-status-warning">
          This alarm is switched off — nothing is being evaluated. Enable it to start checking the
          metric again.
        </p>
      )}
      {alarm.channels.length === 0 && (
        <p className="text-[13px] text-status-warning">
          Nobody is notified: this alarm has no channels. Edit it to add one.
        </p>
      )}
    </>
  )
}

function RangePicker({
  value,
  onChange,
}: Readonly<{ value: string; onChange: (id: string) => void }>) {
  return (
    <div className="flex items-center gap-1">
      {CHART_RANGES.map((range) => (
        <Button
          key={range.id}
          size="xs"
          variant="ghost"
          aria-pressed={range.id === value}
          className={cn(
            "font-mono text-[11px] text-muted-foreground",
            range.id === value && "border border-brand-gold bg-brand-gold/5 text-brand-gold",
          )}
          onClick={() => {
            onChange(range.id)
          }}
        >
          {range.label}
        </Button>
      ))}
    </div>
  )
}

function ChartStats({
  values,
  unit,
  bucketCount,
  rangeLabel,
}: Readonly<{
  values: number[]
  unit: string
  bucketCount: number
  rangeLabel: string
}>) {
  const gapCount = bucketCount - values.length
  const current = values.at(-1) ?? null
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1">
      <span className={META_LINE}>
        Latest{" "}
        <span className="font-mono text-[13px] text-foreground">{formatValue(current, unit)}</span>
      </span>
      <span className={META_LINE}>
        High{" "}
        <span className="font-mono text-[13px] text-foreground">
          {formatValue(values.length ? Math.max(...values) : null, unit)}
        </span>
      </span>
      <span className={META_LINE}>
        Low{" "}
        <span className="font-mono text-[13px] text-foreground">
          {formatValue(values.length ? Math.min(...values) : null, unit)}
        </span>
      </span>
      {gapCount > 0 && (
        <span className={META_LINE}>
          {gapCount} of {bucketCount} periods in the last {rangeLabel} reported nothing — those gaps
          are left blank, not drawn as zero.
        </span>
      )}
    </div>
  )
}

function OverviewTab({
  alarm,
  values,
  bucketCount,
  isLoading,
  isError,
  rangeId,
  onRangeChange,
}: Readonly<{
  alarm: Alarm
  values: number[]
  bucketCount: number
  isLoading: boolean
  isError: boolean
  rangeId: string
  onRangeChange: (id: string) => void
}>) {
  const unit = unitForAlarm(alarm)
  const range = CHART_RANGES.find((entry) => entry.id === rangeId) ?? DEFAULT_CHART_RANGE
  const drawable = values.length >= 2

  return (
    <Section
      variant="panel"
      title={metricLabelForAlarm(alarm)}
      description={`${alarm.statistic} over the last ${range.label} — the amber line is the threshold, ${thresholdText(alarm)}${unitSuffix(unit)}.`}
      actions={<RangePicker value={rangeId} onChange={onRangeChange} />}
    >
      {drawable ? (
        <>
          <MetricChart
            data={values}
            color={alarm.state === "ALARM" ? SERIES_COLOR_ALARM : SERIES_COLOR_OK}
            unit={unit}
            // Percentages deserve a true zero baseline; other units
            // auto-scale so the threshold crossing stays legible.
            min={unit === PERCENT ? 0 : undefined}
            height={220}
            overlay={{
              data: values.map(() => alarm.threshold),
              color: THRESHOLD_COLOR,
            }}
          />
          <ChartStats
            values={values}
            unit={unit}
            bucketCount={bucketCount}
            rangeLabel={range.label}
          />
        </>
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {chartMessage(isLoading, isError, values.length, range.label)}
        </p>
      )}
    </Section>
  )
}

function DeliveryResultChip({ status }: Readonly<{ status: AlarmNotification["status"] }>) {
  const sent = status === "sent"
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono text-[11px]",
        sent
          ? "border-status-success/25 bg-status-success-bg text-status-success"
          : "border-status-danger/25 bg-status-danger-bg text-status-danger",
      )}
    >
      {sent ? "sent" : "failed"}
    </Badge>
  )
}

function DeliveryReference({
  reference,
  href,
}: Readonly<{ reference: string; href: string | null }>) {
  if (!reference) return <span className="text-muted-foreground">{DASH}</span>
  if (!href) return <span>{reference}</span>
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-status-info hover:underline"
    >
      {reference}
      <ExternalLink className="size-3" />
    </a>
  )
}

function DeliveriesTable({
  rows,
  loading,
  error,
  onRetry,
  bindings,
  hasJiraChannel,
  jiraSiteUrl,
}: Readonly<{
  rows: AlarmNotification[]
  loading: boolean
  error: boolean
  onRetry: () => void
  bindings: Map<string, AlarmChannelBinding>
  hasJiraChannel: boolean
  jiraSiteUrl: string
}>) {
  const columns = useMemo<ColumnDef<AlarmNotification>[]>(
    () => [
      {
        id: "when",
        header: "When",
        accessorFn: (row) => row.created_at,
        cell: ({ row }) => (
          <span
            className={cn(CELL_MUTED, "whitespace-nowrap")}
            title={formatDateTime(row.original.created_at)}
          >
            {timeAgo(row.original.created_at)}
          </span>
        ),
      },
      {
        id: "result",
        header: "Result",
        accessorFn: (row) => row.status,
        cell: ({ row }) => <DeliveryResultChip status={row.original.status} />,
      },
      {
        id: "channel",
        header: "Channel",
        // Falls back to a short id: a delivery to a channel since deleted still
        // has to say where it went.
        accessorFn: (row) =>
          (row.channel_id ? bindings.get(row.channel_id)?.channel_name : undefined) ??
          shortId(row.channel_id ?? ""),
        cell: ({ getValue }) => <span className={CELL}>{String(getValue())}</span>,
      },
      {
        id: "response",
        header: "Response",
        accessorFn: (row) => row.http_status ?? DASH,
        cell: ({ getValue }) => <span className={CELL_MUTED}>{String(getValue())}</span>,
      },
      {
        id: "reference",
        header: "Reference",
        // Holds a link out to the Jira issue.
        meta: { interactive: true } satisfies DataTableColumnMeta,
        cell: ({ row }) => (
          <span className={CELL}>
            <DeliveryReference
              reference={row.original.external_ref}
              href={jiraIssueUrl(
                row.original.external_ref,
                row.original.channel_id ? bindings.get(row.original.channel_id) : undefined,
                hasJiraChannel,
                jiraSiteUrl,
              )}
            />
          </span>
        ),
      },
      {
        id: "detail",
        header: "Detail",
        accessorFn: (row) => row.error || DASH,
        cell: ({ getValue }) => (
          <span className={cn(CELL_MUTED, "max-w-[22rem] break-words")}>{String(getValue())}</span>
        ),
      },
    ],
    [bindings, hasJiraChannel, jiraSiteUrl],
  )

  return (
    <DataTable<AlarmNotification>
      data={rows}
      columns={columns}
      loading={loading}
      error={error ? "Could not read the delivery log." : undefined}
      onRetry={onRetry}
      getRowId={(row) => row.id}
      // Newest delivery first is the only order that makes sense here.
      defaultSorting={[{ id: "when", desc: true }]}
      empty={
        <EmptyState
          icon={Send}
          title="No deliveries listed for this alarm"
          description="This reads your account's recent delivery log and picks out this alarm's rows. On a busy account older deliveries fall off the end of that log, so an empty list here is not proof that nothing was ever sent."
        />
      }
    />
  )
}

function DeliveriesTab({
  rows,
  isLoading,
  isError,
  onRetry,
  bindings,
  hasJiraChannel,
  jiraSiteUrl,
}: Readonly<{
  rows: AlarmNotification[]
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  bindings: Map<string, AlarmChannelBinding>
  hasJiraChannel: boolean
  jiraSiteUrl: string
}>) {
  return (
    <Section
      variant="panel"
      title="Deliveries"
      description="Recent notification attempts for this alarm, and what each channel answered."
    >
      {/* Loading, empty and failure all render inside the table, so this panel
          looks the same in every state instead of swapping its whole body. */}
      <DeliveriesTable
        rows={rows}
        loading={isLoading}
        error={isError}
        onRetry={onRetry}
        bindings={bindings}
        hasJiraChannel={hasJiraChannel}
        jiraSiteUrl={jiraSiteUrl}
      />
      {!isLoading && rows.length > 0 && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Taken from your account&apos;s recent delivery log, so older attempts for this alarm may
          have fallen off the end of it.
        </p>
      )}
    </Section>
  )
}

function HistoryRow({ entry }: Readonly<{ entry: AlarmHistoryEntry }>) {
  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="w-40 shrink-0 font-mono text-[12px] text-muted-foreground">
          {formatDateTime(entry.created_at)}
        </span>
        <span className="flex items-center gap-1.5">
          <AlarmStateChip state={entry.from_state} withDot={false} />
          <SquareArrowRight className="size-3 text-muted-foreground" />
          <AlarmStateChip state={entry.to_state} withDot={false} />
        </span>
        <span className="min-w-0 flex-1 basis-full text-[12px] text-muted-foreground sm:basis-auto">
          {entry.reason}
        </span>
      </div>
      {entry.evaluated_datapoints.length > 0 && (
        <p className="mt-1 pl-0 font-mono text-[11px] text-muted-foreground/80 sm:pl-40">
          Evaluated: {datapointsText(entry.evaluated_datapoints)}
        </p>
      )}
    </li>
  )
}

function HistoryTab({ entries }: Readonly<{ entries: AlarmHistoryEntry[] }>) {
  return (
    <Section
      variant="panel"
      title="State history"
      description="Most recent transition first, with the datapoints that drove each decision."
    >
      {entries.length === 0 ? (
        <EmptyState
          icon={History}
          title="No state changes yet"
          description="This alarm has not changed state since it was created. Transitions show up here as soon as the evaluator moves it."
        />
      ) : (
        <ul className="divide-y divide-border-glass/60">
          {entries.map((entry) => (
            <HistoryRow key={entry.id} entry={entry} />
          ))}
        </ul>
      )}
    </Section>
  )
}

function ChannelBindings({ alarm }: Readonly<{ alarm: Alarm }>) {
  if (alarm.channels.length === 0) {
    return <span className="text-status-warning">No channels — nobody is notified</span>
  }
  return (
    <span className="flex flex-col gap-1">
      {alarm.channels.map((binding) => (
        <span key={binding.channel_id} className="text-[13px]">
          <span className="font-mono">{binding.channel_name}</span>
          <span className="text-muted-foreground">
            {" "}
            ({TYPE_META[binding.channel_type].label}) · notified on{" "}
            {describeTransitions(binding.on_transitions)}
          </span>
        </span>
      ))}
    </span>
  )
}

function configItems(
  alarm: Alarm,
  type: AlarmTargetType,
  display: string,
  unit: string,
): KeyValueItem[] {
  const items: KeyValueItem[] = [
    {
      label: type === "custom" ? "Watching" : TARGET_TYPE_META[type].label,
      value: display,
      mono: type !== "custom",
    },
    { label: "Signal", value: `${metricLabelForAlarm(alarm)}${unitParens(unit)}` },
    {
      label: "Alerts when",
      value: `${alarm.statistic} is ${OPERATOR_PHRASES[alarm.comparison_operator]} ${String(alarm.threshold)}${unitSuffix(unit)}`,
    },
    { label: "For", value: ruleText(alarm) },
    {
      label: "If data stops arriving",
      value: `Gaps are ${TREAT_MISSING_LABELS[alarm.treat_missing_data]}`,
    },
    { label: "Notifies", value: <ChannelBindings alarm={alarm} /> },
    { label: "Severity", value: <SeverityChip severity={alarm.severity} /> },
    {
      label: "Evaluation",
      value: alarm.enabled ? "On" : "Off — nothing is evaluated or sent",
    },
    { label: "In this state since", value: formatDateTime(alarm.state_updated_at), mono: true },
    { label: "Created", value: formatDateTime(alarm.created_at), mono: true },
  ]
  if (alarm.description) items.push({ label: "Notes", value: alarm.description })
  return items
}

function seriesItems(alarm: Alarm): KeyValueItem[] {
  return [
    { label: "Namespace", value: alarm.metric_namespace, mono: true },
    { label: "Metric", value: alarm.metric_name, mono: true },
    { label: "Dimensions", value: formatDimensions(alarm.dimensions), mono: true },
    { label: "Statistic", value: alarm.statistic, mono: true },
    { label: "Period", value: `${String(alarm.period_seconds)}s`, mono: true },
    { label: "Alarm id", value: alarm.id, mono: true, copyable: true },
  ]
}

function ConfigurationTab({
  alarm,
  type,
  display,
}: Readonly<{ alarm: Alarm; type: AlarmTargetType; display: string }>) {
  return (
    <div className="space-y-5">
      <Section variant="panel" title="Configuration">
        <KeyValueGrid items={configItems(alarm, type, display, unitForAlarm(alarm))} columns={2} />
      </Section>
      <Section
        variant="panel"
        title="Underlying metric series"
        description="The address the evaluator reads. You rarely need this — it is here for debugging and for custom metrics."
      >
        <KeyValueGrid items={seriesItems(alarm)} columns={3} />
      </Section>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function AlarmDetailPage() {
  useScreen("monitoring.alarm-detail")
  const navigate = useNavigate()
  const { id = "" } = useParams<{ id: string }>()

  const [tab, setTab] = useState(TAB_OVERVIEW)
  const [rangeId, setRangeId] = useState(DEFAULT_CHART_RANGE.id)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: alarm, isLoading, isError } = useAlarm(id)
  const { data: history = [] } = useAlarmHistory(id)
  const deliveries = useAlarmNotifications(id)
  const { data: jiraConnections = [] } = useJiraConnections()

  // All three resource lists, so the alarm's dimension id can be turned back
  // into the name the user knows it by.
  const loadBalancers = useLoadBalancers()
  const instances = useInstances()
  const disks = useDisks()

  const setEnabled = useSetAlarmEnabled()
  const deleteAlarm = useDeleteAlarm()
  const testChannel = useTestSavedChannel()

  const windowMs = (CHART_RANGES.find((range) => range.id === rangeId) ?? DEFAULT_CHART_RANGE)
    .windowMs

  const metricsWindow = useMemo<MetricsWindowQuery | null>(() => {
    if (!alarm) return null
    return {
      namespace: alarm.metric_namespace,
      metric: alarm.metric_name,
      statistic: alarm.statistic,
      period: alarm.period_seconds,
      dimensions: alarm.dimensions,
      windowMs,
    }
  }, [alarm, windowMs])

  const metrics = useMetricsQuery(metricsWindow)

  // Null buckets are real gaps: they are dropped, never coerced to 0, and the
  // count of dropped buckets is reported next to the chart.
  const values = useMemo(
    () =>
      (metrics.data?.buckets ?? [])
        .map((bucket) => bucket.value)
        .filter((value): value is number => value !== null),
    [metrics.data],
  )

  const resourceNames = useMemo(() => {
    const names = new Map<string, string>()
    for (const lb of loadBalancers.data ?? []) names.set(lb.id, lb.name)
    for (const instance of instances.data ?? []) names.set(instance.id, instance.name)
    for (const disk of disks.data ?? []) names.set(disk.id, disk.name)
    return names
  }, [loadBalancers.data, instances.data, disks.data])

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-24" />
        <Skeleton className="h-16" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (isError || !alarm) {
    return (
      <EmptyState
        icon={BellOff}
        title="Alarm not found"
        description={`No alarm with id "${id}" exists in this workspace.`}
        action={{
          label: "Back to alarms",
          onClick: () => void navigate(MONITORING_ROUTES.alarms),
        }}
      />
    )
  }

  const { type, targetId } = resolveTarget(alarm)
  const listsSettled = !loadBalancers.isLoading && !instances.isLoading && !disks.isLoading
  const display = resourceDisplay(
    type,
    targetId,
    resourceNames.get(targetId) ?? shortId(targetId),
    listsSettled && !!targetId && !resourceNames.has(targetId),
  )
  const subject = subjectPhrase(type, display)

  const bindings = new Map(alarm.channels.map((binding) => [binding.channel_id, binding]))
  const hasJiraChannel = alarm.channels.some((binding) => binding.channel_type === "jira")

  const sendTests = async () => {
    for (const binding of alarm.channels) {
      try {
        const result = await testChannel.mutateAsync({
          id: binding.channel_id,
          severity: alarm.severity,
        })
        if (result.delivered) {
          toast.success(`Test delivered to ${binding.channel_name}`)
        } else {
          toast.error(testFailureText(binding.channel_name, result.error ?? ""))
        }
      } catch {
        toast.error(`Could not reach ${binding.channel_name} to send a test`)
      }
    }
  }

  const tabs: AnimatedTab[] = [
    { value: TAB_OVERVIEW, label: "Overview", icon: Activity },
    {
      value: TAB_DELIVERIES,
      label: "Deliveries",
      icon: Send,
      count: deliveries.data.length,
    },
    { value: TAB_HISTORY, label: "History", icon: History, count: history.length },
    { value: TAB_CONFIG, label: "Configuration", icon: Settings2 },
  ]

  return (
    <div className="space-y-5">
      <PageHeader
        icon={BellRing}
        breadcrumbs={[
          { label: "Monitoring", to: MONITORING_ROUTES.root },
          { label: "Alarms", to: MONITORING_ROUTES.alarms },
          { label: alarm.name },
        ]}
        title={alarm.name}
        description={headerDescription(alarm, subject)}
        meta={<AlarmMetaChips alarm={alarm} />}
        actions={
          <>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => void navigate(MONITORING_ROUTES.alarmEdit(alarm.id))}
            >
              <Pencil className="size-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5"
              disabled={setEnabled.isPending}
              onClick={() => {
                setEnabled.mutate({ id: alarm.id, enabled: !alarm.enabled })
              }}
              loading={setEnabled.isPending}
            >
              {alarm.enabled ? <BellOff className="size-3.5" /> : <BellRing className="size-3.5" />}
              {alarm.enabled ? "Disable" : "Enable"}
            </Button>
            <span
              title={
                alarm.channels.length === 0
                  ? "This alarm has no channels, so there is nowhere to send a test. Add one from Edit."
                  : "Sends a real test notification to every channel on this alarm."
              }
            >
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5"
                disabled={alarm.channels.length === 0 || testChannel.isPending}
                onClick={() => {
                  void sendTests()
                }}
                loading={testChannel.isPending}
              >
                <Send className="size-3.5" />
                Send test
              </Button>
            </span>
            <Button
              size="sm"
              variant="destructive"
              className="gap-1.5"
              onClick={() => {
                setDeleteOpen(true)
              }}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          </>
        }
      />

      <ConditionPanel alarm={alarm} />
      <AlarmNotices alarm={alarm} />

      <AnimatedTabs tabs={tabs} value={tab} onChange={setTab} layoutId="alarm-detail-tabs" />

      {tab === TAB_OVERVIEW && (
        <OverviewTab
          alarm={alarm}
          values={values}
          bucketCount={metrics.data?.buckets.length ?? 0}
          isLoading={metrics.isLoading}
          isError={metrics.isError}
          rangeId={rangeId}
          onRangeChange={setRangeId}
        />
      )}
      {tab === TAB_DELIVERIES && (
        <DeliveriesTab
          rows={deliveries.data}
          isLoading={deliveries.isLoading}
          isError={deliveries.isError}
          onRetry={() => void deliveries.refetch()}
          bindings={bindings}
          hasJiraChannel={hasJiraChannel}
          jiraSiteUrl={jiraConnections[0]?.site_url ?? ""}
        />
      )}
      {tab === TAB_HISTORY && <HistoryTab entries={history} />}
      {tab === TAB_CONFIG && <ConfigurationTab alarm={alarm} type={type} display={display} />}

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete alarm"
        description={`Delete "${alarm.name}"? Its state history and channel bindings go with it. The metric data itself is untouched.`}
        confirmLabel="Delete alarm"
        confirmText={alarm.name}
        loading={deleteAlarm.isPending}
        onConfirm={() => {
          deleteAlarm.mutate(alarm.id, {
            onSuccess: () => {
              setDeleteOpen(false)
              void navigate(MONITORING_ROUTES.alarms)
            },
          })
        }}
      />
    </div>
  )
}
