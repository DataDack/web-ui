import { ShieldCheck } from "lucide-react"
import { useTranslation } from "react-i18next"
import { NavLink } from "react-router-dom"

import { cn } from "@/lib/utils"

import { ADMIN_NAV } from "./admin-nav"

/**
 * Sidebar for the super-admin console. Distinct from the tenant console
 * sidebar — fixed (non-collapsible), platform-scoped navigation.
 */
export function AdminSidebar({ onNavigate }: Readonly<{ onNavigate?: () => void }>) {
    const { t } = useTranslation()

    return (
        <aside className="flex h-full w-full shrink-0 flex-col border-r border-border-glass bg-[var(--glass-2-bg)] backdrop-blur-2xl">
            <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-border-glass px-5">
                <ShieldCheck className="size-5 text-brand-gold" />
                <div className="flex flex-col leading-tight">
                    <span className="text-sm font-bold tracking-tight">
                        {t("superAdmin.title")}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                        {t("superAdmin.shell.console")}
                    </span>
                </div>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-3">
                <div className="mb-1.5 px-2 font-mono text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground/80">
                    {t("superAdmin.catalog.title")}
                </div>
                <ul className="flex flex-col gap-0.5">
                    {ADMIN_NAV.map((item) => {
                        const Icon = item.icon
                        return (
                            <li key={item.path}>
                                <NavLink
                                    to={item.path}
                                    onClick={onNavigate}
                                    className={({ isActive }) =>
                                        cn(
                                            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                                            isActive
                                                ? "bg-accent/70 font-medium text-foreground border border-border-glass"
                                                : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                                        )
                                    }
                                >
                                    <Icon className="size-4 shrink-0" />
                                    <span className="truncate">{t(item.labelKey)}</span>
                                </NavLink>
                            </li>
                        )
                    })}
                </ul>
            </nav>
        </aside>
    )
}
