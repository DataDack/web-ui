import { useTranslation } from "react-i18next"

import { splitCIDRs, type FormValues } from "../schema"

/**
 * What the container's firewall will actually say, before it is created.
 *
 * The product has never shown this. Every listener port was opened to the whole
 * internet and nothing said so, which made "who can reach my load balancer" a
 * question with no answer in the console. Rendering it from the same form state
 * the request is built from keeps it honest.
 */
export function EffectiveFirewall({ listeners }: Readonly<{ listeners: FormValues["listeners"] }>) {
    const { t } = useTranslation()

    return (
        <div className="overflow-hidden rounded-lg border border-border/60">
            {listeners.map((l, i) => {
                const sources = splitCIDRs(l.allowed_cidrs)
                return (
                    <Row
                        // Read-only rows with no state or inputs, so remounting on
                        // reorder costs nothing; the port is not stable enough to
                        // key on while it is being typed.
                        // eslint-disable-next-line react/no-array-index-key
                        key={i}
                        verdict="allow"
                        port={`tcp/${String(l.port)}`}
                        detail={
                            sources.length === 0
                                ? t("loadBalancers.wizard.fromAnywhere")
                                : t("loadBalancers.wizard.fromRanges", {
                                      ranges: sources.join(", "),
                                  })
                        }
                        origin={t("loadBalancers.wizard.originListener")}
                    />
                )
            })}

            {/* Always present, and always restricted: the agent's webhook accepts
                configuration pushes on a public IP. */}
            <Row
                verdict="allow"
                port="tcp/9187"
                detail={t("loadBalancers.wizard.fromControlPlane")}
                origin={t("loadBalancers.wizard.originAgent")}
            />
            <Row
                verdict="drop"
                port={t("loadBalancers.wizard.inbound")}
                detail={t("loadBalancers.wizard.everythingElse")}
                origin={t("loadBalancers.wizard.originPolicy")}
            />
            {/* Egress is deliberately not a control. A default-deny outbound — what
                the VM security-group path uses — would stop HAProxy reaching its
                own targets. */}
            <Row
                verdict="allow"
                port={t("loadBalancers.wizard.outbound")}
                detail={t("loadBalancers.wizard.egressRequired")}
                origin={t("loadBalancers.wizard.originLocked")}
            />
        </div>
    )
}

function Row({
    verdict,
    port,
    detail,
    origin,
}: Readonly<{ verdict: "allow" | "drop"; port: string; detail: string; origin: string }>) {
    const { t } = useTranslation()
    return (
        <div className="flex items-center gap-2.5 border-b border-border/40 px-2.5 py-2 text-[12px] last:border-b-0">
            <span
                className={
                    verdict === "allow"
                        ? "rounded-full bg-status-success-bg px-1.5 py-0.5 text-[10px] font-semibold uppercase text-status-success"
                        : "rounded-full bg-status-danger-bg px-1.5 py-0.5 text-[10px] font-semibold uppercase text-status-danger"
                }
            >
                {verdict === "allow"
                    ? t("loadBalancers.wizard.allow")
                    : t("loadBalancers.wizard.drop")}
            </span>
            <span className="font-mono">{port}</span>
            <span className="text-muted-foreground">{detail}</span>
            <span className="flex-1" />
            <span className="text-muted-foreground text-[11px]">{origin}</span>
        </div>
    )
}
