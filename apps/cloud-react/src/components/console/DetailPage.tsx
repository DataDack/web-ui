import { useEffect, useRef, useState, type ReactNode } from "react"

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
  /** Resource ID — rendered as a CopyButton on the meta line */
  id?: string
  actions?: ReactNode
  /**
   * The facts that identify this resource beyond its name — branch, commit,
   * address, runtime. Rendered on the bar's last line, to the LEFT of the tabs,
   * and hidden while the bar is condensed.
   *
   * Optional on purpose. Twelve of the thirteen detail pages pass nothing and
   * render exactly the header they always had; only the page with facts worth
   * carrying across its tabs opts in.
   */
  meta?: ReactNode
  /** layoutId namespace; defaults to "detail-tabs" */
  layoutId?: string
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
  meta,
  tabs,
  layoutId = "detail-tabs",
}: Readonly<DetailPageProps & { tabs: DetailTab[] }>) {
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

  // Condensed once the page has scrolled past the bar's resting position.
  //
  // Driven by a zero-height sentinel rather than a scroll listener: the bar is
  // `position: sticky`, so there is no scroll offset that means "pinned" on
  // every viewport — but the sentinel sitting immediately above it leaves the
  // viewport at exactly that moment, on all of them, without running a handler
  // on every frame.
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [condensed, setCondensed] = useState(false)

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setCondensed(!entry.isIntersecting)
      },
      // The bar pins under a 52px topbar (96px while the mobile shell stacks its
      // two rows), so the sentinel has to be considered "gone" that much before
      // it actually leaves the viewport, or the swap fires a topbar too late.
      { rootMargin: "-96px 0px 0px 0px", threshold: 0 },
    )
    observer.observe(sentinel)
    return () => {
      observer.disconnect()
    }
  }, [])

  const tabStrip = (
    <AnimatedTabs
      tabs={tabs.map(({ value, label, icon }) => ({ value, label, icon }))}
      value={activeTab}
      onChange={setTab}
      layoutId={layoutId}
    />
  )

  return (
    // Pages mount DetailPage after their loading skeleton resolves, so this
    // class animates the skeleton→content swap once for every detail page.
    <div className="animate-content-enter">
      <div ref={sentinelRef} aria-hidden className="h-px" />

      {/* One bar, not four stacked rows with their own margins. Back link and
          identity share the top deck; the facts and the tab strip share the
          bottom one, facts left and tabs right, so the active tab's underline
          lands on the bar's own bottom rule.

          It bleeds through the shell's gutter (--page-px, published by AppShell)
          so it reads as chrome rather than as one more card, and re-applies that
          gutter inside so its contents stay on the page's left margin. */}
      <div className="page-bleed sticky top-[96px] z-30 mb-5 border-b border-border/60 glass-3-bg md:top-[52px]">
        <div className="page-gutter">
          {/* Deck 1 — the back link. First to go when the bar condenses: by
              then the reader is deep in a build log, not looking for the exit,
              and the breadcrumb is still one row up in the topbar. */}
          <div
            className="grid transition-[grid-template-rows,opacity] duration-200 ease-out data-[condensed=true]:opacity-0 data-[condensed=true]:grid-rows-[0fr] grid-rows-[1fr] motion-reduce:transition-none"
            data-condensed={condensed}
          >
            <div className="min-h-0 overflow-hidden">
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="-ml-2 mt-1.5 h-7 gap-1.5 px-2 text-muted-foreground hover:text-foreground"
              >
                <Link to={backTo}>
                  <ArrowLeft className="size-3.5" />
                  {backLabel}
                </Link>
              </Button>
            </div>
          </div>

          {/* Decks 2 and 3 stack at rest and become ONE row when condensed —
              which is what moves the tabs up beside the name without the strip
              being unmounted and remounted somewhere else. A remount would
              restart Radix's tab state and the underline's layout animation
              mid-scroll; reflowing the same element does neither. */}
          <div
            className="data-[condensed=true]:flex data-[condensed=true]:items-center data-[condensed=true]:gap-3"
            data-condensed={condensed}
          >
            {/* Deck 2 — identity. Never hidden; it only shrinks. */}
            <div
              className="flex min-w-0 items-center gap-2.5 py-2 data-[condensed=true]:flex-1"
              data-condensed={condensed}
            >
              {Icon && (
                <div
                  className="flex shrink-0 items-center justify-center rounded-xl glass-1 transition-all duration-200 data-[condensed=true]:size-6.5 data-[condensed=true]:rounded-md size-9 motion-reduce:transition-none"
                  data-condensed={condensed}
                >
                  <Icon className="size-4 text-muted-foreground" />
                </div>
              )}

              <h1
                className="truncate font-mono font-bold tracking-tight text-foreground transition-[font-size] duration-200 data-[condensed=true]:text-[15px] text-lg motion-reduce:transition-none"
                data-condensed={condensed}
              >
                {title}
              </h1>

              <span className="shrink-0">
                {statusNode ??
                  (status && (
                    <StatusBadge
                      status={status}
                      pulse={getStatusConfig(status).tone === "success"}
                    />
                  ))}
              </span>

              {actions && <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div>}
            </div>

            {/* Deck 3 — the facts, and the tab strip they share a line with.
              Facts left, tabs right; `-mb-px` drops the strip's own bottom rule
              onto the bar's, so the active tab underlines the bar's edge. */}
            <div
              className="flex min-w-0 flex-wrap items-end gap-x-5 gap-y-1 data-[condensed=true]:shrink-0 data-[condensed=true]:flex-nowrap"
              data-condensed={condensed}
            >
              {(meta ?? id) && (
                <div
                  className="grid min-w-0 flex-1 transition-[grid-template-rows,opacity] duration-200 ease-out data-[condensed=true]:hidden data-[condensed=true]:opacity-0 grid-rows-[1fr] motion-reduce:transition-none"
                  data-condensed={condensed}
                >
                  <div className="flex min-h-0 flex-wrap items-center gap-x-2.5 gap-y-1 overflow-hidden pb-2.5 font-mono text-[11px] text-muted-foreground">
                    {meta}
                    {meta && id && <span className="opacity-40">·</span>}
                    {/* The whole id, not eight characters of it. It is the string
                      that goes into a support ticket, and one that cannot be
                      read off the screen is not an identifier. */}
                    {id && <CopyButton value={id} className="text-[11px]" />}
                  </div>
                </div>
              )}
              {/* No overflow wrapper here: TabsList already scrolls itself and
                carries the bottom rule this `-mb-px` is landing on the bar's.
                A second scroll container would trap the strip inside a box that
                never scrolls. */}
              <div className="-mb-px ml-auto flex min-w-0 max-w-full items-end">{tabStrip}</div>
            </div>
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
