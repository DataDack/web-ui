import { useTranslation } from "react-i18next"
// Monitoring overview — a dashboard, not a second copy of the alarms list.
//
// The list page already answers "what alarms exist". This page answers the four
// questions you actually arrive with:
//   1. is anything wrong right now?            → the stat row
//   2. has anything been flapping?             → the 24-hour state strip
//   3. which resource is causing it?           → "Needs attention", grouped
//   4. would I even have been told?            → channel health
// Everything is derived from three queries (alarms, channels, account history)
// plus the resource lists needed to turn a dimension id into a resource name.

import { useMemo } from "react"

import { Badge, Button } from "@datadack/common-ui"
import { Activity, ArrowRight, BellRing, CheckCircle2, Plus, Radio, WifiOff } from "lucide-react"
import { Link } from "react-router-dom"

import { PageHeader, Section, StatGrid, type StatCardProps } from "@/components/console"
import { cn } from "@/lib/utils"
import { useDisks } from "@/modules/disks/disks.hooks"
import { useLoadBalancers } from "@/modules/load-balancers/load-balancers.hooks"
import { useInstances } from "@/modules/vms/vms.hooks"
import { useScreen } from "@/services/api/screen"

import { TYPE_META } from "../channels/channels.meta"
import { AlarmStateChip } from "../components/StateChips"
import { MONITORING_ROUTES } from "../monitoring.constants"
import { useAccountHistory, useAlarms, useChannels } from "../monitoring.hooks"
import { ALARM_STATE_META, alarmStateLabel, timeAgo } from "../monitoring.meta"
import { resolveTarget, TARGET_TYPE_META, type AlarmTargetType } from "../monitoring.targets"
import type { Alarm, AlarmHistoryEntry, AlarmState, ChannelResponse } from "../monitoring.types"

// ---------------------------------------------------------------------------
// Shared class vocabulary
// ---------------------------------------------------------------------------

const MONO_MUTED = "font-mono text-[11px] text-muted-foreground"
const NOTE = "text-[13px] text-muted-foreground"
const ROW_LINK = "truncate text-sm font-medium text-foreground hover:underline"
const CHIP =
  "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em]"
const CHIP_OK = "border-status-success/25 bg-status-success-bg text-status-success"
const CHIP_BAD = "border-status-danger/30 bg-status-danger-bg text-status-danger"
const CHIP_IDLE = "border-status-neutral/25 bg-status-neutral-bg text-status-neutral"
/** Left name column / right meta column widths — the strip axis mirrors these. */
const STRIP_NAME_COL = "sm:w-56"
const STRIP_META_COL = "sm:w-24"

const HOUR_MS = 3_600_000
const BUCKET_COUNT = 24
/** Deep enough to reconstruct a full day of transitions (server caps at 200). */
const HISTORY_LIMIT = 200
const STRIP_LIMIT = 12
const FEED_LIMIT = 10

/** Display precedence — a bad hour should never be hidden by a good one. */
const STATE_RANK: Record<AlarmState, number> = {
  OK: 0,
  INSUFFICIENT_DATA: 1,
  ALARM: 2,
}

const BUCKET_CLASS: Record<AlarmState, string> = {
  OK: "bg-status-success/25",
  INSUFFICIENT_DATA: "bg-status-neutral/50",
  ALARM: "bg-status-danger",
}

const LEGEND_STATES: readonly AlarmState[] = ["ALARM", "INSUFFICIENT_DATA", "OK"]

// ---------------------------------------------------------------------------
// Resource resolution — a saved alarm only carries (namespace, dimensions), so
// the name a person recognises has to come from the owning service's list.
// ---------------------------------------------------------------------------

interface ResolvedResource {
  /** Grouping identity: one key per real resource. */
  key: string
  type: AlarmTargetType
  /** What the user calls it. */
  name: string
  /** "Load balancer", "Instance", ... */
  kind: string
}

function describeResource(alarm: Alarm, names: Map<string, string>): ResolvedResource {
  const { type, targetId } = resolveTarget(alarm)
  const kind = TARGET_TYPE_META[type].label
  const key = `${type}:${targetId || alarm.metric_namespace}`
  if (type === "custom") {
    return { key, type, name: alarm.metric_namespace || kind, kind }
  }
  const resolved = names.get(targetId)
  if (resolved) return { key, type, name: resolved, kind }
  // Resource deleted, or the list has not loaded yet: a short id still groups
  // the rows correctly and is honest about what we know.
  return { key, type, name: targetId ? targetId.slice(0, 8) : kind, kind }
}

// ---------------------------------------------------------------------------
// 24-hour state strip (pure maths)
// ---------------------------------------------------------------------------

interface StripBucket {
  key: string
  state: AlarmState
  label: string
}

interface StripRow {
  alarm: Alarm
  resource: ResolvedResource
  buckets: StripBucket[]
  /** Transitions recorded inside the window — the flapping signal. */
  changes: number
}

function entryTime(entry: AlarmHistoryEntry): number {
  return new Date(entry.created_at).getTime()
}

function hourLabel(ms: number): string {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
}

/** alarm_id -> its transitions, oldest first. */
function historyByAlarm(history: readonly AlarmHistoryEntry[]): Map<string, AlarmHistoryEntry[]> {
  const byAlarm = new Map<string, AlarmHistoryEntry[]>()
  for (const entry of history) {
    const existing = byAlarm.get(entry.alarm_id)
    if (existing) existing.push(entry)
    else byAlarm.set(entry.alarm_id, [entry])
  }
  for (const entries of byAlarm.values()) {
    entries.sort((a, b) => entryTime(a) - entryTime(b))
  }
  return byAlarm
}

/**
 * The state the alarm held when the window opened. Derived only from recorded
 * transitions — the last one before the window, or what the first in-window
 * transition moved away from. With no history at all the alarm's current state
 * is the only truth we have, so it is used flat; we never invent transitions.
 */
function stateAtWindowStart(
  entries: readonly AlarmHistoryEntry[],
  windowStart: number,
  current: AlarmState,
): AlarmState {
  let carried: AlarmState | null = null
  for (const entry of entries) {
    if (entryTime(entry) <= windowStart) carried = entry.to_state
    else return carried ?? entry.from_state
  }
  return carried ?? current
}

/**
 * One cell per hour. A cell shows the worst state the alarm held during that
 * hour (see STATE_RANK), so an alarm that bounced in and out inside a single
 * hour still reads red instead of averaging itself away.
 */
function buildBuckets(
  entries: readonly AlarmHistoryEntry[],
  windowStart: number,
  initial: AlarmState,
): StripBucket[] {
  const inWindow = entries.filter((entry) => entryTime(entry) > windowStart)
  const buckets: StripBucket[] = []
  let held = initial
  let cursor = 0
  for (let index = 0; index < BUCKET_COUNT; index += 1) {
    const start = windowStart + index * HOUR_MS
    const end = start + HOUR_MS
    let worst = held
    while (cursor < inWindow.length && entryTime(inWindow[cursor]) < end) {
      held = inWindow[cursor].to_state
      if (STATE_RANK[held] > STATE_RANK[worst]) worst = held
      cursor += 1
    }
    buckets.push({ key: String(start), state: worst, label: hourLabel(start) })
  }
  return buckets
}

function buildStripRows(
  alarms: readonly Alarm[],
  history: readonly AlarmHistoryEntry[],
  names: Map<string, string>,
  windowStart: number,
): StripRow[] {
  const byAlarm = historyByAlarm(history)
  const rows = alarms.map((alarm) => {
    const entries = byAlarm.get(alarm.id) ?? []
    const initial = stateAtWindowStart(entries, windowStart, alarm.state)
    return {
      alarm,
      resource: describeResource(alarm, names),
      buckets: buildBuckets(entries, windowStart, initial),
      changes: entries.filter((entry) => entryTime(entry) > windowStart).length,
    }
  })
  // Busiest and worst first: a flapping alarm is the reason to open this page.
  rows.sort(
    (a, b) =>
      b.changes - a.changes ||
      STATE_RANK[b.alarm.state] - STATE_RANK[a.alarm.state] ||
      a.alarm.name.localeCompare(b.alarm.name),
  )
  return rows
}

function windowStartMs(): number {
  return Math.floor(Date.now() / HOUR_MS) * HOUR_MS - (BUCKET_COUNT - 1) * HOUR_MS
}

function changesLabel(changes: number): string {
  if (changes === 0) return "no changes"
  if (changes === 1) return "1 change"
  return `${String(changes)} changes`
}

// ---------------------------------------------------------------------------
// Needs attention, grouped by resource
// ---------------------------------------------------------------------------

interface AttentionGroup {
  resource: ResolvedResource
  alarms: Alarm[]
  /** Worst state in the group — decides which resource is listed first. */
  worst: number
}

function byStateThenRecency(a: Alarm, b: Alarm): number {
  return (
    STATE_RANK[b.state] - STATE_RANK[a.state] ||
    new Date(b.state_updated_at).getTime() - new Date(a.state_updated_at).getTime()
  )
}

/** One bad load balancer trips several alarms — show it as one problem. */
function groupByResource(alarms: readonly Alarm[], names: Map<string, string>): AttentionGroup[] {
  const groups = new Map<string, AttentionGroup>()
  for (const alarm of alarms) {
    const resource = describeResource(alarm, names)
    const existing = groups.get(resource.key)
    if (existing) {
      existing.alarms.push(alarm)
      existing.worst = Math.max(existing.worst, STATE_RANK[alarm.state])
    } else {
      groups.set(resource.key, {
        resource,
        alarms: [alarm],
        worst: STATE_RANK[alarm.state],
      })
    }
  }
  const ordered = [...groups.values()]
  for (const group of ordered) group.alarms.sort(byStateThenRecency)
  ordered.sort(
    (a, b) =>
      b.worst - a.worst ||
      b.alarms.length - a.alarms.length ||
      a.resource.name.localeCompare(b.resource.name),
  )
  return ordered
}

/** The reason plus, for a silent alarm, why silence is not the same as OK. */
function attentionLines(alarm: Alarm): string[] {
  const lines: string[] = []
  const reason = alarm.state_reason.trim()
  if (reason) lines.push(reason)
  if (alarm.state === "INSUFFICIENT_DATA") {
    lines.push(ALARM_STATE_META.INSUFFICIENT_DATA.hint)
  } else if (!reason) {
    lines.push(ALARM_STATE_META[alarm.state].hint)
  }
  return lines
}

// ---------------------------------------------------------------------------
// Channel health — the backend writes "sent" on success and "failed: <error>"
// otherwise, so the status string carries the reason a delivery bounced.
// ---------------------------------------------------------------------------

type DeliveryHealth = "ok" | "failed" | "never"

function deliveryHealth(channel: ChannelResponse): DeliveryHealth {
  if (!channel.last_delivery_at) return "never"
  const status = channel.last_delivery_status.trim().toLowerCase()
  if (status === "" || status === "sent" || status === "ok") return "ok"
  return "failed"
}

function deliveryError(channel: ChannelResponse): string {
  return channel.last_delivery_status.trim().replace(/^failed:\s*/i, "")
}

const DELIVERY_ORDER: Record<DeliveryHealth, number> = { failed: 0, never: 1, ok: 2 }

function sortChannels(channels: readonly ChannelResponse[]): ChannelResponse[] {
  return [...channels].sort(
    (a, b) =>
      DELIVERY_ORDER[deliveryHealth(a)] - DELIVERY_ORDER[deliveryHealth(b)] ||
      a.name.localeCompare(b.name),
  )
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

function buildStats(
  alarms: readonly Alarm[],
  channels: readonly ChannelResponse[],
  alarmsLoading: boolean,
  channelsLoading: boolean,
): StatCardProps[] {
  const inAlarm = alarms.filter((alarm) => alarm.state === "ALARM")
  const critical = inAlarm.filter((alarm) => alarm.severity === "critical").length
  const silent = alarms.filter((alarm) => alarm.state === "INSUFFICIENT_DATA").length
  const healthy = alarms.filter((alarm) => alarm.state === "OK").length
  const failing = channels.filter((channel) => deliveryHealth(channel) === "failed").length
  return [
    {
      label: critical > 0 ? `In alarm · ${String(critical)} critical` : "In alarm",
      value: inAlarm.length,
      color: "danger",
      icon: BellRing,
      loading: alarmsLoading,
    },
    {
      label: ALARM_STATE_META.INSUFFICIENT_DATA.label,
      value: silent,
      color: "warning",
      icon: WifiOff,
      loading: alarmsLoading,
    },
    {
      label: "OK",
      value: healthy,
      color: "success",
      icon: CheckCircle2,
      loading: alarmsLoading,
    },
    {
      label: failing > 0 ? `Channels · ${String(failing)} not delivering` : "Channels",
      value: channels.length,
      color: failing > 0 ? "danger" : "info",
      icon: Radio,
      loading: channelsLoading,
    },
  ]
}

// ---------------------------------------------------------------------------
// Stateless pieces
// ---------------------------------------------------------------------------

function StripAxis() {
  return (
    <div className="mb-1.5 hidden items-center gap-3 sm:flex">
      <span className={cn("shrink-0", STRIP_NAME_COL)} />
      <div
        className={cn(
          "flex flex-1 items-center justify-between uppercase tracking-[0.08em]",
          "font-mono text-[10px] text-muted-foreground",
        )}
      >
        <span>24h ago</span>
        <span>now</span>
      </div>
      <span className={cn("shrink-0", STRIP_META_COL)} />
    </div>
  )
}

function StripRowView({ row }: Readonly<{ row: StripRow }>) {
  return (
    <div className="flex flex-col gap-1.5 py-2 sm:flex-row sm:items-center sm:gap-3">
      <div className={cn("min-w-0 shrink-0", STRIP_NAME_COL)}>
        <Link to={MONITORING_ROUTES.alarm(row.alarm.id)} className={ROW_LINK}>
          {row.alarm.name}
        </Link>
        <p className={cn("truncate", MONO_MUTED)}>
          {row.resource.kind} · {row.resource.name}
        </p>
      </div>
      <div className="flex h-5 flex-1 items-stretch gap-px overflow-hidden rounded">
        {row.buckets.map((bucket) => (
          <span
            key={bucket.key}
            title={`${bucket.label} · ${alarmStateLabel(bucket.state)}`}
            className={cn("flex-1", BUCKET_CLASS[bucket.state])}
          />
        ))}
      </div>
      <span
        className={cn(
          "shrink-0 sm:text-right",
          STRIP_META_COL,
          MONO_MUTED,
          row.changes > 1 && "text-status-warning",
        )}
      >
        {changesLabel(row.changes)}
      </span>
    </div>
  )
}

function StripLegend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-3">
      {LEGEND_STATES.map((state) => (
        <span key={state} className={cn("flex items-center gap-1.5", MONO_MUTED)}>
          <span className={cn("size-2.5 rounded-sm", BUCKET_CLASS[state])} />
          {alarmStateLabel(state)}
        </span>
      ))}
      <span className="text-[11px] text-muted-foreground/80">
        An alarm with no recorded change holds its current state across the whole strip.
      </span>
    </div>
  )
}

function AttentionRow({ alarm }: Readonly<{ alarm: Alarm }>) {
  return (
    <li className="py-2 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <AlarmStateChip state={alarm.state} />
        <Link to={MONITORING_ROUTES.alarm(alarm.id)} className={ROW_LINK}>
          {alarm.name}
        </Link>
        {!alarm.enabled && (
          <Badge variant="outline" className={cn(CHIP, CHIP_IDLE)}>
            paused
          </Badge>
        )}
        <span className={cn("ml-auto shrink-0", MONO_MUTED)}>
          {timeAgo(alarm.state_updated_at)}
        </span>
      </div>
      {attentionLines(alarm).map((line) => (
        <p key={line} className={cn("mt-0.5", NOTE)}>
          {line}
        </p>
      ))}
    </li>
  )
}

function AttentionGroupView({ group }: Readonly<{ group: AttentionGroup }>) {
  const Icon = TARGET_TYPE_META[group.resource.type].icon
  const count = group.alarms.length
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        group.worst === STATE_RANK.ALARM
          ? "border-status-danger/30 bg-status-danger-bg/40"
          : "border-border/60",
      )}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-semibold text-foreground">
          {group.resource.name}
        </span>
        <span className={MONO_MUTED}>{group.resource.kind}</span>
        <span className={cn("ml-auto shrink-0", MONO_MUTED)}>
          {count === 1 ? "1 alarm" : `${String(count)} alarms`}
        </span>
      </div>
      <ul className="divide-y divide-border/50">
        {group.alarms.map((alarm) => (
          <AttentionRow key={alarm.id} alarm={alarm} />
        ))}
      </ul>
    </div>
  )
}

function ChannelHealthRow({ channel }: Readonly<{ channel: ChannelResponse }>) {
  const health = deliveryHealth(channel)
  const Icon = TYPE_META[channel.type].icon
  const error = health === "failed" ? deliveryError(channel) : ""
  return (
    <li className="py-2.5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate text-sm font-medium text-foreground">{channel.name}</span>
        {!channel.enabled && (
          <Badge variant="outline" className={cn(CHIP, CHIP_IDLE)}>
            paused
          </Badge>
        )}
        <Badge
          variant="outline"
          className={cn(
            CHIP,
            health === "ok" && CHIP_OK,
            health === "failed" && CHIP_BAD,
            health === "never" && CHIP_IDLE,
          )}
        >
          {health === "ok" && "delivering"}
          {health === "failed" && "not delivering"}
          {health === "never" && "never used"}
        </Badge>
        <span className={cn("ml-auto shrink-0", MONO_MUTED)}>
          {channel.last_delivery_at ? timeAgo(channel.last_delivery_at) : "no alerts sent yet"}
        </span>
      </div>
      {health === "failed" && (
        <p className="mt-0.5 text-[13px] text-status-danger">
          The last alert never arrived
          {error ? ` — ${error}` : "."}
        </p>
      )}
    </li>
  )
}

function TransitionRow({
  entry,
  alarmName,
}: Readonly<{ entry: AlarmHistoryEntry; alarmName: string }>) {
  return (
    <li className="py-2.5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className={cn("size-2 shrink-0 rounded-full", ALARM_STATE_META[entry.to_state].dotClass)}
        />
        <Link to={MONITORING_ROUTES.alarm(entry.alarm_id)} className={ROW_LINK}>
          {alarmName}
        </Link>
        <span className={MONO_MUTED}>
          {alarmStateLabel(entry.from_state)} → {alarmStateLabel(entry.to_state)}
        </span>
        <span className={cn("ml-auto shrink-0", MONO_MUTED)}>{timeAgo(entry.created_at)}</span>
      </div>
      {entry.reason && <p className={cn("mt-0.5 pl-4", NOTE)}>{entry.reason}</p>}
    </li>
  )
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function MonitoringOverviewPage() {
  const { t } = useTranslation()
  useScreen("monitoring.overview")

  const { data: alarms = [], isLoading: alarmsLoading } = useAlarms()
  const { data: channels = [], isLoading: channelsLoading } = useChannels()
  const { data: history = [] } = useAccountHistory(HISTORY_LIMIT)

  // Alarms address resources by dimension id; only the owning service knows
  // the name, so all three lists are resolved into one id -> name map.
  const { data: loadBalancers = [] } = useLoadBalancers()
  const { data: instances = [] } = useInstances()
  const { data: disks = [] } = useDisks()

  const resourceNames = useMemo(() => {
    const names = new Map<string, string>()
    for (const lb of loadBalancers) names.set(lb.id, lb.name)
    for (const instance of instances) names.set(instance.id, instance.name)
    for (const disk of disks) names.set(disk.id, disk.name)
    return names
  }, [loadBalancers, instances, disks])

  const alarmNames = useMemo(() => new Map(alarms.map((alarm) => [alarm.id, alarm.name])), [alarms])

  const stats = useMemo(
    () => buildStats(alarms, channels, alarmsLoading, channelsLoading),
    [alarms, channels, alarmsLoading, channelsLoading],
  )

  const stripRows = useMemo(
    () => buildStripRows(alarms, history, resourceNames, windowStartMs()),
    [alarms, history, resourceNames],
  )

  const attention = useMemo(
    () =>
      groupByResource(
        alarms.filter((alarm) => alarm.state !== "OK"),
        resourceNames,
      ),
    [alarms, resourceNames],
  )

  const channelRows = useMemo(() => sortChannels(channels), [channels])
  const hiddenStripRows = Math.max(0, stripRows.length - STRIP_LIMIT)

  return (
    <div>
      <PageHeader
        title="Monitoring"
        description="What is wrong right now, what has been flapping, and whether anyone would have been told."
        icon={Activity}
        actions={
          <>
            <Button variant="outline" size="sm" asChild>
              <Link to={MONITORING_ROUTES.alarms}>Alarms</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to={MONITORING_ROUTES.channels}>Channels</Link>
            </Button>
            <Button size="sm" className="gap-1.5" asChild>
              <Link to={MONITORING_ROUTES.alarmCreate}>
                <Plus className="size-4" />
                {t("monitoring.monitoringOverviewPage.createAlarm")}
              </Link>
            </Button>
          </>
        }
      />

      <StatGrid stats={stats} className="mb-6" />

      <Section
        title={t("monitoring.monitoringOverviewPage.last24Hours")}
        description="One cell per hour. A cell turns red if the alarm breached at any point inside that hour, so flapping stands out."
        variant="panel"
        className="mb-6"
      >
        {stripRows.length === 0 ? (
          <p className={NOTE}>
            {alarmsLoading
              ? "Loading alarms…"
              : "No alarms yet — create one and its last 24 hours appear here."}
          </p>
        ) : (
          <>
            <StripAxis />
            <div className="divide-y divide-border/50">
              {stripRows.slice(0, STRIP_LIMIT).map((row) => (
                <StripRowView key={row.alarm.id} row={row} />
              ))}
            </div>
            <StripLegend />
            {hiddenStripRows > 0 && (
              <Link
                to={MONITORING_ROUTES.alarms}
                className="mt-3 inline-flex items-center gap-1 text-[13px] font-medium text-brand-gold hover:underline"
              >
                {String(hiddenStripRows)} quieter alarm
                {hiddenStripRows === 1 ? "" : "s"} not shown
                <ArrowRight className="size-3.5" />
              </Link>
            )}
          </>
        )}
      </Section>

      <div className="grid gap-6 xl:grid-cols-3">
        <Section
          title={t("monitoring.monitoringOverviewPage.needsAttention")}
          description={t("monitoring.monitoringOverviewPage.groupedByTheResourceEachAlarmWatches")}
          variant="panel"
          className="xl:col-span-2"
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link to={MONITORING_ROUTES.alarms}>
                {t("monitoring.monitoringOverviewPage.allAlarms")}
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          }
        >
          {attention.length === 0 ? (
            <p className={NOTE}>
              {alarmsLoading
                ? "Loading alarms…"
                : "Every alarm is inside its threshold. Nothing needs attention."}
            </p>
          ) : (
            <div className="space-y-3">
              {attention.map((group) => (
                <AttentionGroupView key={group.resource.key} group={group} />
              ))}
            </div>
          )}
        </Section>

        <div className="space-y-6">
          <Section
            title={t("monitoring.monitoringOverviewPage.channelHealth")}
            description="A notification path that is failing is worse than an alarm that is firing — nobody hears either."
            variant="panel"
            actions={
              <Button variant="ghost" size="sm" asChild>
                <Link to={MONITORING_ROUTES.channels}>
                  Manage
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            }
          >
            {channelRows.length === 0 ? (
              <p className={NOTE}>
                {channelsLoading
                  ? "Loading channels…"
                  : "No channels yet — an alarm with no channel only changes colour on this page."}
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {channelRows.map((channel) => (
                  <ChannelHealthRow key={channel.id} channel={channel} />
                ))}
              </ul>
            )}
          </Section>

          <Section title={t("monitoring.monitoringOverviewPage.recentStateTransitions")} description={t("monitoring.monitoringOverviewPage.newestFirst")} variant="panel">
            {history.length === 0 ? (
              <p className={NOTE}>{t("monitoring.monitoringOverviewPage.noAlarmHasChangedStateYet")}</p>
            ) : (
              <ul className="divide-y divide-border/60">
                {history.slice(0, FEED_LIMIT).map((entry) => (
                  <TransitionRow
                    key={entry.id}
                    entry={entry}
                    alarmName={alarmNames.get(entry.alarm_id) ?? entry.alarm_id.slice(0, 8)}
                  />
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>
    </div>
  )
}
