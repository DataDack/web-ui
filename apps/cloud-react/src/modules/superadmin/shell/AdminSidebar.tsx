import { ShieldCheck } from "lucide-react"
import { useTranslation } from "react-i18next"
import { NavLink } from "react-router-dom"

import { cn } from "@datadack/common-ui"

import { ADMIN_NAV } from "./admin-nav"

/**
 * Sidebar for the super-admin console. Distinct from the tenant console
 * sidebar — fixed (non-collapsible), platform-scoped navigation.
 */
export function AdminSidebar({ onNavigate }: Readonly<{ onNavigate?: () => void }>) {
  const { t } = useTranslation()

  return (
    <aside className="flex h-full w-full shrink-0 flex-col border-r border-border-glass bg-[var(--glass-2-bg)] backdrop-blur-2xl">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border-glass px-3.5">
        <ShieldCheck className="size-4 text-brand-gold" />
        <div className="flex flex-col leading-tight">
          <span className="text-xs font-bold tracking-tight">{t("superAdmin.title")}</span>
          <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
            {t("superAdmin.shell.console")}
          </span>
        </div>
      </div>

      {/* Grouped by what the operator is trying to do. The first group carries no
          heading: Overview is the landing page, not a category. */}
      <nav className="flex-1 space-y-2.5 overflow-y-auto px-2 py-2">
        {ADMIN_NAV.map((group, groupIndex) => (
          <div key={group.labelKey ?? `group-${String(groupIndex)}`}>
            {group.labelKey && (
              <div className="mb-1 px-2 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground/80">
                {t(group.labelKey)}
              </div>
            )}
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                if (item.comingSoon) {
                  return (
                    <li key={item.path}>
                      <div
                        aria-disabled="true"
                        className="flex cursor-not-allowed items-center gap-2 rounded-md px-2 py-1.5 text-[12px] leading-4 text-muted-foreground/60"
                      >
                        <Icon className="size-3.5 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
                        <span className="shrink-0 font-mono text-[8px] uppercase tracking-wide">
                          {t("console.comingSoon.badge")}
                        </span>
                      </div>
                    </li>
                  )
                }
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] leading-4 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                          isActive
                            ? "bg-accent/70 font-medium text-foreground border border-border-glass"
                            : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                        )
                      }
                    >
                      <Icon className="size-3.5 shrink-0" />
                      <span className="truncate">{t(item.labelKey)}</span>
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
