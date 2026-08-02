import type { ReactNode } from "react"

import {
  Button,
  CopyButton,
} from "@datadack/common-ui"
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
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="mb-3 -ml-2 gap-1.5 text-muted-foreground hover:text-foreground"
      >
        <Link to={backTo}>
          <ArrowLeft className="size-3.5" />
          {backLabel}
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="size-10 rounded-xl glass-1 flex items-center justify-center shrink-0">
              <Icon className="size-4.5 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-mono text-xl font-bold tracking-tight text-foreground truncate">
                {title}
              </h1>
              {statusNode ??
                (status && (
                  <StatusBadge status={status} pulse={getStatusConfig(status).tone === "success"} />
                ))}
            </div>
            {id && <CopyButton value={id} className="mt-0.5 text-[11px]" />}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>

      <AnimatedTabs
        tabs={tabs.map(({ value, label, icon }) => ({ value, label, icon }))}
        value={activeTab}
        onChange={setTab}
        layoutId={layoutId}
        className="mb-5"
      />

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
