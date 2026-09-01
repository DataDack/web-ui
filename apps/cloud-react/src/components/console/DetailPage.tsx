import type { ReactNode } from "react"

import { Button, CopyButton } from "@datadack/common-ui"
import { ArrowLeft, type LucideIcon } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { Link, useSearchParams } from "react-router-dom"

import { AnimatedTabs } from "./motion/AnimatedTabs"
import { DUR, EASE } from "./motion/motion-config"
import { getStatusConfig } from "./status-config"
import { StatusBadge } from "./StatusBadge"

export interface DetailTab {
  value: string
  label: string
  icon?: LucideIcon
  content: ReactNode
}

interface DetailPageProps {
  backTo: string
  backLabel: string
  icon?: LucideIcon
  title: string
  status?: string
  /**
   * Pre-rendered status element, for resources whose state is derived rather
   * than a backend status string. Takes precedence over `status`.
   */
  statusNode?: ReactNode
  /** Resource ID — rendered as a CopyButton next to the title */
  id?: string
  actions?: ReactNode
  tabs: DetailTab[]
  /** layoutId namespace; defaults to "detail-tabs" */
  layoutId?: string
}

/**
 * The bar has room for a handle, not for a UUID. Copy still takes the whole
 * value — this only shortens what is printed, and only for ids long enough
 * that nobody was reading them off the screen anyway.
 */
function shortId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 8)}…` : id
}

export function DetailPage({
  backTo,
  backLabel,
  icon: Icon,
  title,
  status,
  statusNode,
  id,
  actions,
  tabs,
  layoutId = "detail-tabs",
}: Readonly<DetailPageProps>) {
  const [searchParams, setSearchParams] = useSearchParams()
  const fallbackTab = tabs[0]?.value ?? ""
  const requestedTab = searchParams.get("tab") ?? fallbackTab
  const activeTab = tabs.some((tab) => tab.value === requestedTab) ? requestedTab : fallbackTab

  const setTab = (value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === fallbackTab) next.delete("tab")
        else next.set("tab", value)
        return next
      },
      { replace: true },
    )
  }

  const active = tabs.find((tab) => tab.value === activeTab)

  return (
    // Pages mount DetailPage after their loading skeleton resolves, so this
    // class animates the skeleton→content swap once for every detail page.
    <div className="animate-content-enter">
      {/* One bar, not four rows. Back, identity, state, id and the tabs used to
          be three stacked blocks with their own margins — 162px of chrome above
          the first card, on a page whose first card is the reason anyone opened
          it. They share a line now, and the bar sticks under the topbar so the
          tabs are still reachable halfway down a 400-line build log.

          It bleeds through the shell's gutter (see --page-px in AppShell) so it
          reads as chrome rather than as another card, and re-applies that gutter
          inside so its contents stay on the page's own left margin. */}
      <div className="page-bleed sticky top-[96px] z-30 mb-5 border-b border-border/60 glass-3-bg md:top-[52px]">
        <div className="page-gutter flex flex-wrap items-stretch gap-x-3">
          <div className="order-1 flex min-h-13 min-w-0 flex-1 items-center gap-2.5">
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="-ml-2 h-7 shrink-0 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
            >
              {/* The label is the affordance on a wide screen and the tooltip
                  on a narrow one — never nothing. */}
              <Link to={backTo} title={`Back to ${backLabel}`} aria-label={`Back to ${backLabel}`}>
                <ArrowLeft className="size-3.5" />
                <span className="hidden xl:inline">{backLabel}</span>
              </Link>
            </Button>

            {Icon && (
              <div className="flex size-6 shrink-0 items-center justify-center rounded-md glass-1">
                <Icon className="size-3.5 text-muted-foreground" />
              </div>
            )}

            <h1 className="truncate font-mono text-[15px] font-bold tracking-tight text-foreground">
              {title}
            </h1>

            <span className="shrink-0">
              {statusNode ??
                (status && (
                  <StatusBadge status={status} pulse={getStatusConfig(status).tone === "success"} />
                ))}
            </span>

            {/* Below md the name and the state chip have already used the line. */}
            {id && (
              <span className="hidden shrink-0 md:block">
                <CopyButton value={id} label={shortId(id)} className="text-[11px]" />
              </span>
            )}
          </div>

          {actions && (
            <div className="order-2 flex min-h-13 shrink-0 items-center gap-2 lg:order-3">
              {actions}
            </div>
          )}

          {/* Under lg the tabs take the second line of the bar rather than
              squeezing the name to nothing — which is the whole reason the
              order flips instead of the tab strip shrinking. `-mb-px` lands the
              strip's own bottom rule on the bar's, so the two read as one line
              and the active tab's underline sits on the bar's edge. */}
          <div className="order-3 -mb-px flex w-full items-end lg:order-2 lg:ml-auto lg:w-auto lg:pl-4">
            <AnimatedTabs
              tabs={tabs.map(({ value, label, icon }) => ({ value, label, icon }))}
              value={activeTab}
              onChange={setTab}
              layoutId={layoutId}
            />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: DUR.fast, ease: EASE.out }}
        >
          {active?.content}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
