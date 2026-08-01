import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Activity, CreditCard, Layers } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
    AnimatedTabs,
    dateColumn,
    EmptyState,
    nameColumn,
    ResourceTable,
    StatGrid,
    statusColumn,
    textColumn,
} from "@/components/console"
import type { AnimatedTab } from "@/components/console"

import { useSubscriptions, useUsage } from "../billing.hooks"
import type { SubscriptionApi, UsageRecordApi } from "../billing.types"
import { inr } from "../billing.utils"

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

    const usageColumns = useMemo<ColumnDef<UsageRecordApi>[]>(
        () => [
            nameColumn<UsageRecordApi>({
                header: t("billing.columns.resource"),
                accessor: (r) => r.resource_urn,
            }),
            textColumn<UsageRecordApi>({
                id: "service",
                header: t("billing.columns.service"),
                accessor: (r) => r.service,
            }),
            textColumn<UsageRecordApi>({
                id: "quantity",
                header: t("billing.columns.quantity"),
                accessor: (r) => `${String(r.quantity)} ${r.unit}`,
                mono: true,
                responsive: "md",
            }),
            textColumn<UsageRecordApi>({
                id: "rate",
                header: t("billing.columns.rate"),
                accessor: (r) => `${inr(r.unit_price)}/${r.unit}`,
                mono: true,
                muted: true,
                responsive: "md",
            }),
            textColumn<UsageRecordApi>({
                id: "used",
                header: t("billing.columns.used"),
                accessor: (r) => inr(r.cost),
                mono: true,
            }),
            dateColumn<UsageRecordApi>({
                id: "period",
                header: t("billing.columns.period"),
                accessor: (r) => r.period_end,
                responsive: "lg",
            }),
        ],
        [t]
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
        [t]
    )

    const [activeTab, setActiveTab] = useState<"usage" | "subscriptions">("usage")

    const tabs = useMemo<AnimatedTab[]>(
        () => [
            {
                value: "usage",
                label: t("billing.sections.usageTitle"),
                icon: Activity,
                count: usage.length,
            },
            {
                value: "subscriptions",
                label: t("billing.sections.subscriptionsTitle"),
                icon: CreditCard,
                count: subscriptions.length,
            },
        ],
        [t, usage.length, subscriptions.length]
    )

    return (
        <div className="space-y-6">
            <StatGrid stats={usageStats} />

            <AnimatedTabs
                tabs={tabs}
                value={activeTab}
                onChange={(v) => { setActiveTab(v as "usage" | "subscriptions"); }}
                layoutId="billing-usage-tabs"
            />

            {activeTab === "usage" ? (
                <ResourceTable<UsageRecordApi>
                    data={usage}
                    columns={usageColumns}
                    isLoading={usageLoading}
                    isError={usageError}
                    onRetry={() => void refetchUsage()}
                    getRowId={(r) => r.id}
                    initialSorting={[{ id: "period", desc: true }]}
                    emptyState={<EmptyState icon={Activity} title={t("billing.usage.empty")} />}
                />
            ) : (
                <ResourceTable<SubscriptionApi>
                    data={subscriptions}
                    columns={subscriptionColumns}
                    isLoading={subsLoading}
                    isError={subsError}
                    onRetry={() => void refetchSubs()}
                    getRowId={(s) => s.id}
                    initialSorting={[{ id: "renews", desc: true }]}
                    emptyState={<EmptyState icon={CreditCard} title={t("billing.monthly.empty")} />}
                />
            )}
        </div>
    )
}
