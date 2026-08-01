import { Globe, Lock } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Section } from "@/components/console"

/**
 * The scheme, stated rather than chosen.
 *
 * Internet-facing is the only scheme the backend can realize: an internal load
 * balancer has no public address, and the control plane sits outside the VPC's
 * private network, so it could never reach the container to deliver its
 * configuration.
 *
 * This used to be two equal-looking cards. Picking the second one produced a 500
 * on submit — an option that exists, looks available, and cannot ever work is
 * worse than one that is visibly unavailable. So internal stays visible, to show
 * the axis exists, but as a disabled fact rather than a live control.
 */
export function SchemeStep() {
    const { t } = useTranslation()

    return (
        <Section variant="panel" title={t("loadBalancers.wizard.scheme")}>
            <div className="flex flex-wrap items-center gap-2.5 rounded-lg border border-border/60 px-3 py-2.5">
                <Globe className="size-4 text-status-info" aria-hidden />
                <span className="text-[13px] font-semibold">
                    {t("loadBalancers.schemes.internet_facing")}
                </span>
                <span className="text-[12px] text-muted-foreground">
                    {t("loadBalancers.wizard.internetFacingHint")}
                </span>
                <span className="flex-1" />
                <span className="inline-flex items-center gap-1.5 rounded-full bg-status-neutral-bg px-2 py-0.5 text-[10px] font-medium text-status-neutral">
                    <Lock className="size-3" aria-hidden />
                    {t("loadBalancers.wizard.internalComingSoon")}
                </span>
            </div>
        </Section>
    )
}
