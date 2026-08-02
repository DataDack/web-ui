import { useMemo } from "react"

import { Button, EmptyState, Skeleton, StatGrid } from "@datadack/common-ui"
import {
  ArrowRight,
  Building2,
  Gauge,
  LayoutDashboard,
  LifeBuoy,
  ShieldAlert,
  UserRoundX,
  Users,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { PageHeader, Section, StatCard } from "@/components/console"
import { useAllSupportTickets } from "@/modules/support-tickets/support-tickets.hooks"
import { useScreen } from "@/services/api/screen"

import { useAdminPlatformOverview, useAdminQuotaRequestCount } from "../superadmin.hooks"

/**
 * Where an operator lands. Answers "is anything wrong, and how big is the
 * platform" before they have to pick a page — the console previously dropped
 * them straight into a user list, which answers neither.
 *
 * Everything here is a link. The page's job is to route attention, not to be a
 * place you work.
 */

/** One row in the attention list: a count, what it means, and where to go. */
function AttentionRow({
  icon: Icon,
  label,
  count,
  href,
  cta,
  tone = "default",
  loading,
}: Readonly<{
  icon: typeof Gauge
  label: string
  count: number
  href: string
  cta: string
  tone?: "default" | "warning"
  loading?: boolean
}>) {
  if (loading) return <Skeleton className="h-14 rounded-lg" />

  // Nothing pending is worth saying plainly rather than hiding the row: its
  // absence would be indistinguishable from the data having failed to load.
  const quiet = count === 0

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-glass px-3 py-2.5">
      <span
        className={
          quiet
            ? "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted/50 text-muted-foreground"
            : tone === "warning"
              ? "bg-status-warning-bg text-status-warning flex size-9 shrink-0 items-center justify-center rounded-lg"
              : "bg-status-info-bg text-status-info flex size-9 shrink-0 items-center justify-center rounded-lg"
        }
      >
        <Icon className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[18px] leading-none font-semibold tabular-nums">
            {count}
          </span>
          <span className="truncate text-[13px] text-muted-foreground">{label}</span>
        </div>
      </div>

      <Button asChild size="sm" variant={quiet ? "ghost" : "outline"} className="shrink-0 gap-1.5">
        <Link to={href}>
          {cta}
          <ArrowRight className="size-3" />
        </Link>
      </Button>
    </div>
  )
}

export function AdminOverviewPage() {
  useScreen("superadmin.overview")
  const { t } = useTranslation()

  // The unscoped read returns the whole tenancy graph, which is what the stats
  // and the KYC tally below are counted from.
  const { data, isLoading, isError, refetch, isFetching } = useAdminPlatformOverview()
  const pendingQuota = useAdminQuotaRequestCount("pending")
  const tickets = useAllSupportTickets()

  const openTickets = useMemo(
    () => (tickets.data ?? []).filter((ticket) => ticket.status === "open").length,
    [tickets.data],
  )

  // Users the platform is still waiting on. Counted here rather than served as a
  // stat because `need_actions` already rides along on every overview user.
  const awaitingVerification = useMemo(
    () => (data?.users ?? []).filter((user) => user.need_actions).length,
    [data?.users],
  )

  const stats = useMemo(
    () => [
      {
        label: t("superAdmin.overview.stats.organizations"),
        value: data?.stats.organizations ?? 0,
        icon: Building2,
        loading: isLoading,
      },
      {
        label: t("superAdmin.overview.stats.accounts"),
        value: data?.stats.accounts ?? 0,
        icon: LayoutDashboard,
        loading: isLoading,
      },
      {
        label: t("superAdmin.overview.stats.users"),
        value: data?.stats.users ?? 0,
        icon: Users,
        loading: isLoading,
      },
      {
        label: t("superAdmin.overview.stats.orphanUsers"),
        value: data?.stats.orphan_users ?? 0,
        icon: UserRoundX,
        loading: isLoading,
      },
    ],
    [data?.stats, isLoading, t],
  )

  if (isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          icon={LayoutDashboard}
          breadcrumbs={[{ label: t("superAdmin.title") }]}
          title={t("superAdmin.overview.title")}
          description={t("superAdmin.overview.subtitle")}
        />
        <Section variant="panel" title={t("superAdmin.overview.title")}>
          <EmptyState
            icon={ShieldAlert}
            title={t("console.table.error")}
            description={t("superAdmin.overview.loadError")}
            action={{ label: t("console.table.retry"), onClick: () => void refetch() }}
          />
        </Section>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={LayoutDashboard}
        breadcrumbs={[{ label: t("superAdmin.title") }]}
        title={t("superAdmin.overview.title")}
        description={t("superAdmin.overview.subtitle")}
        actions={
          <Button size="sm" variant="outline" disabled={isFetching} onClick={() => void refetch()}>
            {t("console.table.refresh")}
          </Button>
        }
      />

      <StatGrid>
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            loading={stat.loading}
          />
        ))}
      </StatGrid>

      <Section
        variant="panel"
        title={t("superAdmin.overview.attention.title")}
        description={t("superAdmin.overview.attention.subtitle")}
      >
        <div className="flex flex-col gap-2">
          <AttentionRow
            icon={Gauge}
            label={t("superAdmin.overview.attention.quotaRequests")}
            count={pendingQuota.data ?? 0}
            loading={pendingQuota.isLoading}
            href="/admin/requests?tab=quota"
            cta={t("superAdmin.overview.attention.review")}
            tone="warning"
          />
          <AttentionRow
            icon={LifeBuoy}
            label={t("superAdmin.overview.attention.openTickets")}
            count={openTickets}
            loading={tickets.isLoading}
            href="/admin/requests"
            cta={t("superAdmin.overview.attention.review")}
          />
          <AttentionRow
            icon={ShieldAlert}
            label={t("superAdmin.overview.attention.awaitingVerification")}
            count={awaitingVerification}
            loading={isLoading}
            // Straight to the users tab, where the KYC state can be overridden.
            href="/admin/tenancy?tab=users"
            cta={t("superAdmin.overview.attention.manage")}
            tone="warning"
          />
          <AttentionRow
            icon={UserRoundX}
            label={t("superAdmin.overview.attention.orphanUsers")}
            count={data?.stats.orphan_users ?? 0}
            loading={isLoading}
            href="/admin/tenancy?tab=orphan_users"
            cta={t("superAdmin.overview.attention.manage")}
          />
        </div>
      </Section>
    </div>
  )
}
