import type { LucideIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { FadeIn } from "@/components/console"

interface BillingComingSoonProps {
    icon: LucideIcon
    title: string
    description: string
}

/**
 * Header-less coming-soon panel for billing sub-routes. The billing layout
 * already renders the section header + nav, so this omits the PageHeader that
 * the shared `ComingSoon` includes.
 */
export function BillingComingSoon({ icon: Icon, title, description }: Readonly<BillingComingSoonProps>) {
    const { t } = useTranslation()
    return (
        <FadeIn className="glass-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-border/60 px-6 py-20 text-center">
            <div className="glass-2 mb-5 flex size-14 items-center justify-center rounded-2xl">
                <Icon className="size-6 text-brand-gold" />
            </div>
            <span className="mb-2 font-mono text-[10px] uppercase tracking-[0.18em] text-brand-gold/90">
                {t("console.comingSoon.badge")}
            </span>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="mt-1.5 max-w-md text-[13px] text-muted-foreground">{description}</p>
        </FadeIn>
    )
}
