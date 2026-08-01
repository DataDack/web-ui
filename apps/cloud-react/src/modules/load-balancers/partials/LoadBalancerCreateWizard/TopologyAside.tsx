import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Section } from "@/components/console"
import { useVPCs } from "@/modules/vpc/vpc.hooks"

import { splitCIDRs, type FormValues } from "./schema"

/**
 * The flat monthly price of a load balancer. Mirrors lbMonthlyAmount in
 * apps/compute/loadbalancer/service/lb_service.go — there is no price catalog
 * for load balancers, so a single figure governs billing on both sides.
 */
const LB_MONTHLY_INR = 750
const HOURS_PER_MONTH = 730

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
    const cycle = values.billing_cycle

    return (
        <div className="space-y-4">
            <Section variant="panel" title={t("loadBalancers.wizard.trafficPath")}>
                <div className="space-y-2 font-mono text-[11px] leading-relaxed">
                    <div className="text-muted-foreground">
                        {t("loadBalancers.wizard.internet")}
                    </div>

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
                                        {sources.length === 0
                                            ? t("loadBalancers.wizard.any")
                                            : sources.join(", ")}
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

                    {values.listeners.some(
                        (l) => l.tg_mode === "new" && l.targets.length > 0,
                    ) && <div className="text-muted-foreground">↓</div>}

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
                <div className="space-y-1.5 text-[12px]">
                    <Row
                        label={t("loadBalancers.wizard.loadBalancer")}
                        value={`₹${LB_MONTHLY_INR.toLocaleString("en-IN")}/mo`}
                    />
                    {cycle === "hourly" && (
                        <Row
                            label={t("loadBalancers.wizard.hourlyRate")}
                            value={`₹${(LB_MONTHLY_INR / HOURS_PER_MONTH).toFixed(3)}`}
                        />
                    )}
                    {/* Target groups and listeners are not separately billed — the
                        load balancer's own subscription covers them. */}
                    <Row
                        label={t("loadBalancers.wizard.targetGroups")}
                        value={t("loadBalancers.wizard.free")}
                    />
                    <div className="mt-2 flex justify-between border-t border-border-glass pt-2 text-[13px] font-semibold">
                        <span>{t("loadBalancers.wizard.estMonthly")}</span>
                        <span className="tabular-nums">
                            ₹{LB_MONTHLY_INR.toLocaleString("en-IN")}
                        </span>
                    </div>
                </div>
            </Section>
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
