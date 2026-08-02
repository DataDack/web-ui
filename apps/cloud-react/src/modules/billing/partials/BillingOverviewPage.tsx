import { useMemo } from "react"

import { Button } from "@datadack/common-ui"
import { Activity, AlertTriangle, ArrowUpRight, Layers } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { EmptyState, MetricChart, Section } from "@/components/console"
import { cn } from "@/lib/utils"

import { BILLING_ROUTES, GST_RATE } from "../billing.constants"
import { useBillingOutlet } from "../billing.context"
import { useCreditBalance, useCreditPurchases, useLedger, useUsage } from "../billing.hooks"
import type { LedgerEntry } from "../billing.types"
import { burnSummary, costByService, inr, spendSeries } from "../billing.utils"
import { BillingHero } from "./BillingHero"

export function BillingOverviewPage() {
  const { t } = useTranslation()
  const { openTopup } = useBillingOutlet()

  const { data: balance, isLoading: balanceLoading } = useCreditBalance()
  const { data: ledger = [] } = useLedger(balance?.account_id)
  const { data: usage = [] } = useUsage()
  const { data: purchases = [] } = useCreditPurchases()

  const spend = useMemo(() => spendSeries(ledger), [ledger])
  const spendTotal = useMemo(() => spend.reduce((a, b) => a + b, 0), [spend])
  const services = useMemo(() => costByService(usage), [usage])
  const recent = useMemo(
    () =>
      [...ledger]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5),
    [ledger],
  )
  const burn = useMemo(() => burnSummary(usage, balance?.balance ?? 0, GST_RATE), [usage, balance])

  // Low-balance nudge: empty wallet, or under a week of runway at current burn.
  const banner: { tone: "danger" | "warning"; message: string } | null = (() => {
    if (balanceLoading) return null
    const bal = balance?.balance ?? 0
    if (bal <= 0) return { tone: "danger", message: t("billing.lowBalance.empty") }
    if (burn.runwayDays !== null && burn.runwayDays < 7)
      return {
        tone: "warning",
        message: t("billing.lowBalance.low", { days: burn.runwayDays }),
      }
    return null
  })()

  return (
    <div className="space-y-5">
      {banner && (
        <div
          className={cn(
            "flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3",
            banner.tone === "danger"
              ? "border-status-danger/30 bg-status-danger-bg"
              : "border-status-warning/30 bg-status-warning-bg",
          )}
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle
              className={cn(
                "size-4 shrink-0",
                banner.tone === "danger" ? "text-status-danger" : "text-status-warning",
              )}
            />
            <span className="text-[13px] text-foreground">{banner.message}</span>
          </div>
          <Button
            variant="gold"
            size="sm"
            onClick={() => {
              openTopup()
            }}
          >
            {t("billing.lowBalance.cta")}
          </Button>
        </div>
      )}

      <BillingHero
        balance={balance}
        ledger={ledger}
        usage={usage}
        purchases={purchases}
        loading={balanceLoading}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section
          variant="panel"
          title={t("billing.overview.spendTitle")}
          description={t("billing.overview.spendSubtitle")}
          actions={
            <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
              {inr(spendTotal)}
            </span>
          }
        >
          {spendTotal > 0 ? (
            <MetricChart data={spend} unit="" height={180} color="var(--brand-gold)" />
          ) : (
            <EmptyState icon={Activity} title={t("billing.overview.spendEmpty")} />
          )}
        </Section>

        <Section
          variant="panel"
          title={t("billing.overview.byServiceTitle")}
          description={t("billing.overview.byServiceSubtitle")}
        >
          {services.length > 0 ? (
            <ul className="space-y-3">
              {services.map((slice) => (
                <li key={slice.service}>
                  <div className="mb-1 flex items-center justify-between text-[13px]">
                    <span className="truncate text-foreground">{slice.service}</span>
                    <span className="ml-2 font-mono tabular-nums text-muted-foreground">
                      {inr(slice.cost)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-brand"
                      style={{
                        width: `${String(Math.max(4, slice.fraction * 100))}%`,
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={Layers} title={t("billing.overview.byServiceEmpty")} />
          )}
        </Section>
      </div>

      <Section
        variant="panel"
        title={t("billing.overview.activityTitle")}
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to={BILLING_ROUTES.LEDGER}>
              {t("billing.overview.viewAll")}
              <ArrowUpRight className="ml-1 size-3.5" />
            </Link>
          </Button>
        }
      >
        {recent.length > 0 ? (
          <ul className="divide-y divide-border/50">
            {recent.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} />
            ))}
          </ul>
        ) : (
          <EmptyState icon={Activity} title={t("billing.overview.activityEmpty")} />
        )}
      </Section>
    </div>
  )
}

function ActivityRow({ entry }: Readonly<{ entry: LedgerEntry }>) {
  const credit = entry.kind === "credit"
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-[13px] text-foreground">{entry.description}</p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {new Date(entry.created_at).toLocaleDateString()}
        </p>
      </div>
      <span
        className={cn(
          "shrink-0 font-mono text-sm tabular-nums",
          credit ? "text-status-success" : "text-foreground",
        )}
      >
        {credit ? "+" : "−"}
        {inr(entry.amount)}
      </span>
    </li>
  )
}
