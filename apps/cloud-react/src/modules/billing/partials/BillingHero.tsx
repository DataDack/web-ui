import { useMemo } from "react"

import { Flame, TimerReset, Wallet } from "lucide-react"
import { useTranslation } from "react-i18next"

import { AnimatedNumber, Sparkline } from "@/components/console"
import { cn } from "@/lib/utils"

import { Skeleton } from "@datadack/serverless-ui"

import { GST_RATE } from "../billing.constants"
import type { CreditBalance, CreditPurchase, LedgerEntry, UsageRecordApi } from "../billing.types"
import { balanceSeries, burnSummary, inr } from "../billing.utils"

interface BillingHeroProps {
  balance?: CreditBalance
  ledger: LedgerEntry[]
  usage: UsageRecordApi[]
  purchases: CreditPurchase[]
  loading: boolean
}

/** Runway health → dot colour + label. */
function runwayTone(runwayDays: number | null): { label: string; className: string } {
  if (runwayDays === null) return { label: "runwayEmpty", className: "text-status-neutral" }
  if (runwayDays < 7) return { label: "runwayLow", className: "text-status-danger" }
  return { label: "runwayHealthy", className: "text-status-success" }
}

export function BillingHero({
  balance,
  ledger,
  usage,
  purchases,
  loading,
}: Readonly<BillingHeroProps>) {
  const { t } = useTranslation()
  const balanceValue = balance?.balance ?? 0

  const series = useMemo(() => balanceSeries(ledger, balanceValue), [ledger, balanceValue])
  const burn = useMemo(() => burnSummary(usage, balanceValue, GST_RATE), [usage, balanceValue])
  const totalPurchased = useMemo(
    () => purchases.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.credits, 0),
    [purchases],
  )

  const tone = runwayTone(burn.runwayDays)
  const runwayText =
    burn.runwayDays === null
      ? t("billing.hero.runwayUnknown")
      : t("billing.hero.runwayValue", { days: burn.runwayDays })

  return (
    <div className="glass-2 relative overflow-hidden p-5 md:p-6">
      {/* soft brand glow anchored top-left */}
      <div className="bg-gradient-surface pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Wallet className="size-4 text-brand-gold" />
            <span className="font-mono text-[10px] uppercase tracking-[0.15em]">
              {t("billing.hero.label")}
            </span>
          </div>

          {loading ? (
            <Skeleton className="mt-2 h-11 w-52" />
          ) : (
            <AnimatedNumber
              value={balanceValue}
              format={(v) => inr(v)}
              className="mt-1.5 block text-4xl font-bold tracking-tight tabular-nums text-foreground md:text-5xl"
            />
          )}

          <div className="mt-4 h-10 w-full max-w-md text-brand-gold">
            <Sparkline
              data={series}
              area
              glow
              color="var(--brand-gold)"
              height={40}
              className="h-10 w-full"
            />
          </div>
        </div>
      </div>

      {/* metric strip */}
      <div className="relative mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-border/50 bg-border/40 sm:grid-cols-3">
        <MetricCell
          icon={<Flame className="size-4 text-status-warning" />}
          label={t("billing.hero.burn")}
          value={loading ? null : `${inr(burn.perDay)}${t("billing.hero.perDay")}`}
        />
        <MetricCell
          icon={<TimerReset className={cn("size-4", tone.className)} />}
          label={t("billing.hero.runway")}
          value={loading ? null : runwayText}
          hint={
            <span className={cn("text-[11px]", tone.className)}>
              {t(`billing.hero.${tone.label}`)}
            </span>
          }
        />
        <MetricCell
          icon={<Wallet className="size-4 text-status-success" />}
          label={t("billing.hero.toppedUp")}
          value={loading ? null : inr(totalPurchased)}
        />
      </div>
    </div>
  )
}

interface MetricCellProps {
  icon: React.ReactNode
  label: string
  value: string | null
  hint?: React.ReactNode
}

function MetricCell({ icon, label, value, hint }: Readonly<MetricCellProps>) {
  return (
    <div className="bg-card/60 px-4 py-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-[13px]">{label}</span>
      </div>
      {value === null ? (
        <Skeleton className="mt-1.5 h-6 w-24" />
      ) : (
        <div className="mt-0.5 flex items-baseline gap-2">
          <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
            {value}
          </span>
          {hint}
        </div>
      )}
    </div>
  )
}
