import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Section } from "@/components/console"
import { useVPCs } from "@/modules/vpc/vpc.hooks"

import { splitCIDRs, type FormValues } from "./schema"
import { useLBEstimate } from "../../load-balancers.hooks"

const HOURS_PER_MONTH = 730

function inr(amount: number, digits = 2) {
  return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: digits, maximumFractionDigits: digits })}`
}

/**
 * The traffic path as it stands, built from the live form.
 *
 * A wizard step only shows one slice of the configuration; this is the only
 * place the whole path — who connects, on which port, to which backends — is
 * visible at once. It fills in as the user advances, so the shape of what they
 * are building stays in view.
 */
export function TopologyAside({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
  const { t } = useTranslation()
  const values = form.watch()
  const { data: vpcs = [] } = useVPCs()

  const nameFor = (vpcId: string) => vpcs.find((v) => v.id === vpcId)?.name ?? vpcId
  const subnetCount = values.vpcs.reduce((n, g) => n + g.subnet_ids.length, 0)

  return (
    <div className="space-y-4">
      <Section variant="panel" title={t("loadBalancers.wizard.trafficPath")}>
        <div className="space-y-2 font-mono text-[11px] leading-relaxed">
          <div className="text-muted-foreground">{t("loadBalancers.wizard.internet")}</div>

          {values.listeners.length === 0 ? (
            <div className="pl-3 text-muted-foreground/70">
              {t("loadBalancers.wizard.noListenersYet")}
            </div>
          ) : (
            values.listeners.map((l, i) => {
              const sources = splitCIDRs(l.allowed_cidrs)
              return (
                // Read-only display: no state and no inputs, so a
                // remount on reorder costs nothing. Keying on the
                // port would remount on every keystroke instead.
                // eslint-disable-next-line react/no-array-index-key
                <div key={i} className="pl-3">
                  ↓ <span className="font-semibold">:{l.port}</span>{" "}
                  <span className="text-muted-foreground">
                    {sources.length === 0 ? t("loadBalancers.wizard.any") : sources.join(", ")}
                  </span>
                </div>
              )
            })
          )}

          <div className="font-semibold text-primary">
            {values.name || t("loadBalancers.wizard.unnamed")}
          </div>

          {subnetCount > 0 && (
            <div className="pl-3 text-muted-foreground">
              {values.vpcs
                .filter((g) => g.vpc_id)
                .map((g) => nameFor(g.vpc_id))
                .join(", ")}
              {" · "}
              {t("loadBalancers.wizard.nicCount", { count: subnetCount })}
            </div>
          )}

          {values.listeners.some((l) => l.tg_mode === "new" && l.targets.length > 0) && (
            <div className="text-muted-foreground">↓</div>
          )}

          {values.listeners.map((l, i) =>
            l.tg_mode === "new" && l.tg_name ? (
              // eslint-disable-next-line react/no-array-index-key
              <div key={i} className="pl-3">
                <span className="font-semibold">{l.tg_name}</span>
                <span className="text-muted-foreground"> :{l.tg_port}</span>
                <span className="text-muted-foreground">
                  {" · "}
                  {t("loadBalancers.wizard.targetCount", {
                    count: l.targets.length,
                  })}
                </span>
              </div>
            ) : null,
          )}
        </div>
      </Section>

      <Section variant="panel" title={t("loadBalancers.wizard.estimatedCost")}>
        <CostEstimate values={values} />
      </Section>
    </div>
  )
}

/**
 * The price the server would charge, for the zone of the first subnet — the same
 * lookup the create charges with, so the quote cannot drift from the bill.
 */
function CostEstimate({ values }: Readonly<{ values: FormValues }>) {
  const { t } = useTranslation()
  const cycle = values.billing_cycle
  const first = values.vpcs.find((g) => g.vpc_id)
  const estimate = useLBEstimate(
    first
      ? {
          type: values.type,
          vpc_id: first.vpc_id,
          subnet_id: first.subnet_ids[0],
          billing_cycle: cycle,
        }
      : null,
  )

  if (!first) {
    return (
      <p className="text-[12px] text-muted-foreground">
        {t("loadBalancers.wizard.pricingNeedsSubnet")}
      </p>
    )
  }
  if (estimate.isLoading) {
    return (
      <p className="text-[12px] text-muted-foreground">
        {t("loadBalancers.wizard.pricingLoading")}
      </p>
    )
  }
  const quote = estimate.data
  if (estimate.isError || !quote) {
    return (
      <p className="text-[12px] text-status-warning">
        {t("loadBalancers.wizard.pricingUnavailable")}
      </p>
    )
  }

  // Billing amounts are per cycle — per hour on hourly — so scale to a month.
  const perMonth = cycle === "hourly" ? HOURS_PER_MONTH : 1
  const billing = quote.billing
  const monthlyTotal = billing ? billing.total * perMonth : quote.price_monthly

  return (
    <div className="space-y-1.5 text-[12px]">
      <Row
        label={t("loadBalancers.wizard.loadBalancer")}
        value={`${inr(quote.price_monthly)}/mo`}
      />
      {cycle === "hourly" && (
        <Row label={t("loadBalancers.wizard.hourlyRate")} value={inr(quote.price_hourly, 4)} />
      )}
      {/* Target groups and listeners are not separately billed — the load
          balancer's own charge covers them. */}
      <Row label={t("loadBalancers.wizard.targetGroups")} value={t("loadBalancers.wizard.free")} />
      {billing && billing.discount_pct > 0 && (
        <Row
          label={t("loadBalancers.wizard.discount", { pct: billing.discount_pct })}
          value={`−${inr((billing.list_price - billing.base) * perMonth)}`}
        />
      )}
      {billing && billing.gst_rate > 0 && (
        <Row
          label={t("loadBalancers.wizard.gst", { rate: billing.gst_rate })}
          value={inr(billing.gst * perMonth)}
        />
      )}
      <div className="mt-2 flex justify-between border-t border-border-glass pt-2 text-[13px] font-semibold">
        <span>{t("loadBalancers.wizard.estMonthly")}</span>
        <span className="tabular-nums">{inr(monthlyTotal)}</span>
      </div>
    </div>
  )
}

function Row({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  )
}
