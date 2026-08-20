import { useMemo, useState } from "react"

import {
  DataTable,
  dateColumn,
  EmptyState,
  nameColumn,
  statusColumn,
  textColumn,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Activity, CreditCard, Layers } from "lucide-react"
import { useTranslation } from "react-i18next"

import { type AnimatedTab, AnimatedTabs, StatGrid } from "@/components/console"

import { useSubscriptions, useUsage } from "../billing.hooks"
import type { SubscriptionApi, UsageRecordApi } from "../billing.types"
import { inr } from "../billing.utils"

interface UsageRow {
  id: string
  resource_id: string | null
  resource_urn: string
  service: string
  meters: Pick<UsageRecordApi, "quantity" | "unit" | "unit_price">[]
  cost: number
  period_end: string
}

function usageUnit(unit: string, quantity: number) {
  if (unit === "invocation") return quantity === 1 ? "invocation" : "invocations"
  if (unit === "gb_second") return quantity === 1 ? "GB-second" : "GB-seconds"
  return unit
}

function resourceIdFromUrn(urn: string) {
  const parts = urn.split(":").filter(Boolean)
  return parts.at(-1) === "faas" ? (parts.at(-2) ?? urn) : (parts.at(-1) ?? urn)
}

/** Combine the component meters that make up one resource's charge for a period. */
function combineUsageRecords(usage: UsageRecordApi[]): UsageRow[] {
  const rows = new Map<string, UsageRow>()

  for (const record of usage) {
    const isServerlessMeter =
      record.metric === "function_invocations" || record.metric === "function_gb_seconds"
    const key = isServerlessMeter
      ? [record.resource_urn, record.service, record.period_start, record.period_end].join("|")
      : record.id
    const existing = rows.get(key)
    const meter = {
      quantity: record.quantity,
      unit: record.unit,
      unit_price: record.unit_price,
    }

    if (existing) {
      existing.meters.push(meter)
      existing.cost += record.cost
    } else {
      rows.set(key, {
        id: key,
        resource_id: record.resource_id,
        resource_urn: record.resource_urn,
        service: record.service,
        meters: [meter],
        cost: record.cost,
        period_end: record.period_end,
      })
    }
  }

  return [...rows.values()]
}

export function UsagePage() {
  const { t } = useTranslation()
  const {
    data: usage = [],
    isLoading: usageLoading,
    isError: usageError,
    refetch: refetchUsage,
  } = useUsage()
  const {
    data: subscriptions = [],
    isLoading: subsLoading,
    isError: subsError,
    refetch: refetchSubs,
  } = useSubscriptions()

  const usageRows = useMemo(() => combineUsageRecords(usage), [usage])
  const resourceNames = useMemo(
    () => new Map(subscriptions.map((subscription) => [subscription.resource_id, subscription.description])),
    [subscriptions],
  )

  const usageStats = useMemo(() => {
    const totalUsed = usage.reduce((sum, r) => sum + r.cost, 0)
    const byService = usage.reduce<Record<string, number>>((acc, r) => {
      acc[r.service] = (acc[r.service] ?? 0) + r.cost
      return acc
    }, {})
    const topService = Object.entries(byService).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—"
    const resourceCount = new Set(usage.map((r) => r.resource_urn)).size
    return [
      {
        label: t("billing.usage.totalStat"),
        value: totalUsed,
        format: (v: number) => inr(v),
        color: "warning" as const,
        icon: Activity,
      },
      { label: t("billing.usage.resourcesStat"), value: resourceCount, icon: Layers },
      { label: t("billing.usage.topServiceStat"), value: 0, format: () => topService },
    ]
  }, [usage, t])

  const usageColumns = useMemo<ColumnDef<UsageRow>[]>(
    () => [
      nameColumn<UsageRow>({
        header: t("billing.columns.resource"),
        accessor: (r) => {
          const resourceId = r.resource_id ?? resourceIdFromUrn(r.resource_urn)
          const resourceName = r.resource_id ? resourceNames.get(r.resource_id) : undefined
          return resourceName?.trim() ? resourceName : resourceId
        },
      }),
      textColumn<UsageRow>({
        id: "service",
        header: t("billing.columns.service"),
        accessor: (r) => r.service,
      }),
      textColumn<UsageRow>({
        id: "quantity",
        header: t("billing.columns.quantity"),
        accessor: (r) =>
          r.meters
            .map((meter) => `${String(meter.quantity)} ${usageUnit(meter.unit, meter.quantity)}`)
            .join(" + "),
        mono: true,
        responsive: "md",
      }),
      textColumn<UsageRow>({
        id: "rate",
        header: t("billing.columns.rate"),
        accessor: (r) =>
          r.meters
            .map((meter) => `${inr(meter.unit_price)}/${usageUnit(meter.unit, 1)}`)
            .join(" + "),
        mono: true,
        muted: true,
        responsive: "md",
      }),
      textColumn<UsageRow>({
        id: "used",
        header: t("billing.columns.used"),
        accessor: (r) => inr(r.cost),
        mono: true,
      }),
      dateColumn<UsageRow>({
        id: "period",
        header: t("billing.columns.period"),
        accessor: (r) => r.period_end,
        responsive: "lg",
      }),
    ],
    [resourceNames, t],
  )

  const subscriptionColumns = useMemo<ColumnDef<SubscriptionApi>[]>(
    () => [
      nameColumn<SubscriptionApi>({
        header: t("billing.columns.resource"),
        accessor: (s) => s.description || s.resource_urn,
      }),
      textColumn<SubscriptionApi>({
        id: "service",
        header: t("billing.columns.service"),
        accessor: (s) => s.service,
      }),
      textColumn<SubscriptionApi>({
        id: "cycle",
        header: t("billing.columns.cycle"),
        accessor: (s) => t(`billing.cycle.${s.cycle}`),
        responsive: "md",
      }),
      textColumn<SubscriptionApi>({
        id: "rate",
        header: t("billing.columns.rate"),
        accessor: (s) =>
          s.cycle === "monthly" ? `${inr(s.monthly_amount)}/mo` : `${inr(s.hourly_rate)}/hr`,
        mono: true,
      }),
      statusColumn<SubscriptionApi>({
        header: t("billing.columns.status"),
        accessor: (s) => s.status,
      }),
      dateColumn<SubscriptionApi>({
        id: "renews",
        header: t("billing.columns.renews"),
        accessor: (s) => s.next_renewal_at ?? "",
        responsive: "lg",
      }),
    ],
    [t],
  )

  const [activeTab, setActiveTab] = useState<"usage" | "subscriptions">("usage")

  const tabs = useMemo<AnimatedTab[]>(
    () => [
      {
        value: "usage",
        label: t("billing.sections.usageTitle"),
        icon: Activity,
        count: usageRows.length,
      },
      {
        value: "subscriptions",
        label: t("billing.sections.subscriptionsTitle"),
        icon: CreditCard,
        count: subscriptions.length,
      },
    ],
    [t, usageRows.length, subscriptions.length],
  )

  return (
    <div className="space-y-6">
      <StatGrid stats={usageStats} />

      <AnimatedTabs
        tabs={tabs}
        value={activeTab}
        onChange={(v) => {
          setActiveTab(v as "usage" | "subscriptions")
        }}
        layoutId="billing-usage-tabs"
      />

      {activeTab === "usage" ? (
        <DataTable<UsageRow>
          data={usageRows}
          columns={usageColumns}
          loading={usageLoading}
          error={usageError ? t("console.table.error") : undefined}
          onRetry={() => void refetchUsage()}
          retryLabel={t("console.table.retry")}
          getRowId={(r) => r.id}
          defaultSorting={[{ id: "period", desc: true }]}
          empty={<EmptyState icon={Activity} title={t("billing.usage.empty")} />}
          onRefresh={() => void refetchUsage()}
          refreshLabel={t("console.table.refresh")}
        />
      ) : (
        <DataTable<SubscriptionApi>
          data={subscriptions}
          columns={subscriptionColumns}
          loading={subsLoading}
          error={subsError ? t("console.table.error") : undefined}
          onRetry={() => void refetchSubs()}
          retryLabel={t("console.table.retry")}
          getRowId={(s) => s.id}
          defaultSorting={[{ id: "renews", desc: true }]}
          empty={<EmptyState icon={CreditCard} title={t("billing.monthly.empty")} />}
          onRefresh={() => void refetchSubs()}
          refreshLabel={t("console.table.refresh")}
        />
      )}
    </div>
  )
}
