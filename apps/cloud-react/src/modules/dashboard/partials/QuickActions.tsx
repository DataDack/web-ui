import {
    Activity,
    Boxes,
    Database,
    FolderKanban,
    Globe,
    LifeBuoy,
    type LucideIcon,
    Rocket,
    Server,
    ShieldCheck,
} from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

import { Stagger, StaggerItem } from "@/components/console"
import { cn } from "@/lib/utils"

interface QuickAction {
    id: string
    labelKey: string
    icon: LucideIcon
    to: string
    comingSoon?: boolean
}

/** Tile icon color: muted when coming soon. */
function iconColorClass(comingSoon?: boolean): string {
    if (comingSoon) return "text-muted-foreground/60"
    return "text-muted-foreground group-hover:text-foreground"
}

const ACTIONS: QuickAction[] = [
    {
        id: "compute",
        labelKey: "dashboard.home.quickActions.compute",
        icon: Server,
        to: "/compute/overview",
    },
    {
        id: "storage",
        labelKey: "dashboard.home.quickActions.storage",
        icon: Database,
        to: "#",
        comingSoon: true,
    },
    {
        id: "networking",
        labelKey: "dashboard.home.quickActions.networking",
        icon: Globe,
        to: "/networking",
    },
    {
        id: "identity",
        labelKey: "dashboard.home.quickActions.identity",
        icon: ShieldCheck,
        to: "/iam",
    },
    {
        id: "governance",
        labelKey: "dashboard.home.quickActions.governance",
        icon: FolderKanban,
        to: "/governance",
    },
    {
        id: "resourceGroups",
        labelKey: "dashboard.home.quickActions.resourceGroups",
        icon: Boxes,
        to: "/resource-groups",
    },
    {
        id: "monitoring",
        labelKey: "dashboard.home.quickActions.monitoring",
        icon: Activity,
        to: "/monitoring",
    },
    {
        id: "managedApps",
        labelKey: "dashboard.home.quickActions.managedApps",
        icon: Rocket,
        to: "/managed-apps",
    },
    {
        id: "support",
        labelKey: "dashboard.home.quickActions.support",
        icon: LifeBuoy,
        to: "/support/tickets",
    },
]

export function QuickActions() {
    const { t } = useTranslation()

    return (
        <Stagger className="flex flex-wrap gap-3 sm:gap-4" stagger={0.04}>
            {ACTIONS.map(({ id, labelKey, icon: Icon, to, comingSoon }) => {
                const tile = (
                    <span
                        className={cn(
                            "console-card relative flex size-12 items-center justify-center rounded-[14px] border bg-card/50 transition-all",
                            comingSoon
                                ? "border-dashed border-border"
                                : "group-hover:border-brand-gold group-hover:shadow-[0_0_18px_var(--brand-gold-glow)] group-focus-visible:ring-2 group-focus-visible:ring-ring/50",
                            "border-border"
                        )}
                    >
                        <Icon
                            className={cn("size-5 transition-colors", iconColorClass(comingSoon))}
                            strokeWidth={1.6}
                        />
                        {comingSoon && (
                            <span className="absolute -right-1.5 -top-1.5 rounded-full border border-border bg-card px-1.5 py-px text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                                {t("dashboard.home.quickActions.soon")}
                            </span>
                        )}
                    </span>
                )

                const label = (
                    <span
                        className={cn(
                            "text-center text-xs leading-tight",
                            comingSoon
                                ? "text-muted-foreground/60"
                                : "text-muted-foreground group-hover:text-foreground"
                        )}
                    >
                        {t(labelKey)}
                    </span>
                )

                return (
                    <StaggerItem key={id}>
                        {comingSoon ? (
                            <div
                                aria-disabled
                                title={t("comingSoon.title")}
                                className="group flex w-[88px] cursor-not-allowed flex-col items-center gap-2 outline-none"
                            >
                                {tile}
                                {label}
                            </div>
                        ) : (
                            <Link
                                to={to}
                                className="group flex w-[88px] flex-col items-center gap-2 outline-none"
                            >
                                {tile}
                                {label}
                            </Link>
                        )}
                    </StaggerItem>
                )
            })}
        </Stagger>
    )
}
