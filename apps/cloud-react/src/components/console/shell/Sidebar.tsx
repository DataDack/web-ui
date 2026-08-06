import { cn, Tooltip, TooltipContent, TooltipTrigger } from "@datadack/common-ui"
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useTranslation } from "react-i18next"
import { NavLink, useLocation } from "react-router-dom"

import {
  ALL_NAV_GROUPS,
  type ConsoleService,
  findServiceByPath,
  isItemActiveAmong,
  type SidebarNavItem,
} from "./sidebar-nav"
import { DUR, EASE } from "../motion/motion-config"

const EXPANDED_W = 240
const COLLAPSED_W = 68

interface NavItemLinkProps {
  item: SidebarNavItem
  /** Sibling items in the same group — used for specificity-aware active state. */
  siblings: SidebarNavItem[]
  collapsed: boolean
  layoutIdPrefix: string
  onNavigate?: () => void
}

function NavItemLink({
  item,
  siblings,
  collapsed,
  layoutIdPrefix,
  onNavigate,
}: Readonly<NavItemLinkProps>) {
  const { t } = useTranslation()
  // `search` too: the Managed Apps items address tabs (?tab=apps, ?tab=hosting),
  // which the pathname alone cannot tell apart.
  const { pathname, search } = useLocation()
  const active = isItemActiveAmong(pathname, item, siblings, search)
  const Icon = item.icon

  const link = (
    <NavLink
      to={item.path}
      onClick={onNavigate}
      className={cn(
        "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring/50",
        collapsed && "justify-center px-0",
        active
          ? "font-medium text-foreground"
          : "text-muted-foreground hover:bg-accent/40 hover:text-foreground",
      )}
    >
      {active && (
        <>
          <motion.span
            layoutId={`${layoutIdPrefix}-fill`}
            transition={EASE.spring}
            className="absolute inset-0 rounded-lg bg-accent/50"
          />
          {!collapsed && (
            <motion.span
              layoutId={`${layoutIdPrefix}-bar`}
              transition={EASE.spring}
              className="absolute inset-y-1.5 left-0 w-[3px] rounded-full bg-brand-gold"
            />
          )}
        </>
      )}
      <Icon
        className={cn("relative size-4 shrink-0 transition-colors", active && "text-brand-gold")}
      />
      {!collapsed && (
        <span className="relative truncate whitespace-nowrap">{t(item.labelKey)}</span>
      )}
      {!collapsed && item.comingSoon && (
        <span className="relative ml-auto rounded-full border border-brand-gold/30 bg-brand-gold/10 px-1.5 py-0.5 font-mono text-[9px] font-medium tracking-wide text-brand-gold/90 uppercase">
          {t("console.nav.soon")}
        </span>
      )}
    </NavLink>
  )

  return (
    <li>
      {collapsed ? (
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right">{t(item.labelKey)}</TooltipContent>
        </Tooltip>
      ) : (
        link
      )}
    </li>
  )
}

interface SidebarNavProps {
  collapsed: boolean
  /** Unique per sidebar instance (desktop vs mobile sheet) */
  layoutIdPrefix: string
  onNavigate?: () => void
}

/** Full grouped navigation — used by the global mobile drawer */
export function SidebarNav({ collapsed, layoutIdPrefix, onNavigate }: Readonly<SidebarNavProps>) {
  const { t } = useTranslation()

  return (
    <nav className="flex-1 overflow-x-hidden overflow-y-auto px-3 py-2">
      {ALL_NAV_GROUPS.map((group, groupIndex) => (
        <div key={group.labelKey} className={cn(groupIndex > 0 && "mt-4")}>
          {!collapsed && (
            <div className="mb-1.5 px-2 font-mono text-[10px] font-medium tracking-[0.15em] whitespace-nowrap text-muted-foreground/80 uppercase">
              {t(group.labelKey)}
            </div>
          )}
          <ul className="flex flex-col gap-0.5">
            {group.items.map((item) => (
              <NavItemLink
                key={item.path}
                item={item}
                siblings={group.items}
                collapsed={collapsed}
                layoutIdPrefix={layoutIdPrefix}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        </div>
      ))}
    </nav>
  )
}

interface ServiceGroupProps {
  service: ConsoleService
  layoutIdPrefix: string
}

/** A service section: header label followed by its list of items. */
function ServiceGroup({ service, layoutIdPrefix }: Readonly<ServiceGroupProps>) {
  const { t } = useTranslation()
  const Icon = service.icon

  return (
    <div>
      <div className="flex w-full items-center gap-2.5 px-2.5 py-2">
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate font-mono text-[10px] font-semibold tracking-[0.15em] text-muted-foreground/80 uppercase">
          {t(service.labelKey)}
        </span>
      </div>
      <div className="mx-2.5 mb-1.5 h-px bg-border/60" />
      <ul className="flex flex-col gap-0.5 pl-2">
        {service.items.map((item) => (
          <NavItemLink
            key={item.path}
            item={item}
            siblings={service.items}
            collapsed={false}
            layoutIdPrefix={layoutIdPrefix}
          />
        ))}
      </ul>
    </div>
  )
}

export function SidebarBrand({ collapsed }: Readonly<{ collapsed: boolean }>) {
  return (
    <NavLink
      to="/"
      className="flex h-14 shrink-0 items-center gap-2.5 rounded-lg px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
    >
      <img src="/datadack-icon.png" alt="" className="size-8 shrink-0 object-contain" />
      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: DUR.fast }}
            className="font-bold tracking-tight whitespace-nowrap text-primary"
          >
            Data<span className="text-brand-gold">Dack</span>
          </motion.span>
        )}
      </AnimatePresence>
    </NavLink>
  )
}

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
}

/**
 * Service-scoped console sidebar (AWS-style): flows out of the topbar as one
 * continuous surface (no header divider, flush to the 52px top bar) and shows
 * ONLY the sections of the service that owns the current route. The single
 * service section is collapsible and open by default.
 */
export function Sidebar({ collapsed, onToggle }: Readonly<SidebarProps>) {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const service = findServiceByPath(pathname)

  return (
    <aside
      className="sticky top-[52px] z-30 hidden h-[calc(100vh-52px)] shrink-0 flex-col bg-transparent lg:flex"
      style={{ width: collapsed ? COLLAPSED_W : EXPANDED_W }}
    >
      <nav className="flex-1 space-y-1 overflow-x-hidden overflow-y-auto px-3 py-3">
        {service &&
          (collapsed ? (
            <ul className="flex flex-col gap-0.5">
              {service.items.map((item) => (
                <NavItemLink
                  key={item.path}
                  item={item}
                  siblings={service.items}
                  collapsed
                  layoutIdPrefix="sidebar-desktop"
                />
              ))}
            </ul>
          ) : (
            <ServiceGroup service={service} layoutIdPrefix="sidebar-desktop" />
          ))}
      </nav>
      <div className="shrink-0 p-3">
        <button
          onClick={onToggle}
          aria-label={t(collapsed ? "console.nav.expand" : "console.nav.collapse")}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-muted-foreground outline-none transition-colors hover:bg-accent/40 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
            collapsed && "justify-center px-0",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <>
              <PanelLeftClose className="size-4" />
              <span className="whitespace-nowrap">{t("console.nav.collapse")}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  )
}
