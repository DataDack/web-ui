import { useState } from "react"

import { Button, cn } from "@datadack/common-ui"
import { ArrowRight, ChevronDown } from "lucide-react"
import { Link } from "react-router-dom"

import { TONE_CLASSES, TONE_DOT_CLASSES } from "@/components/console/status-config"

import type { AttentionItem } from "./estate-attention"

/** How many rows are shown before the list folds. */
const VISIBLE = 4

interface EstateAttentionProps {
  items: AttentionItem[]
}

/**
 * Everything waiting on a person, across both surfaces, as rows you can act on.
 *
 * Renders NOTHING when nothing is blocked. A dashboard that always shows an
 * alert panel teaches people to stop reading alert panels — the same argument
 * the Apps tab's banner makes, applied to the union of both lists.
 *
 * Long lists fold at four rows rather than scrolling: the point of the panel is
 * the top of it, and a scroll area on a dashboard hides its own contents.
 */
export function EstateAttention({ items }: Readonly<EstateAttentionProps>) {
  const [expanded, setExpanded] = useState(false)
  if (items.length === 0) return null

  const shown = expanded ? items : items.slice(0, VISIBLE)
  const hidden = items.length - shown.length

  return (
    <section
      aria-label="Needs attention"
      className="glass-1 mb-6 overflow-hidden rounded-xl border border-border/60"
    >
      <header className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5">
        <span className="size-1.5 rounded-full bg-status-danger" />
        <h2 className="text-[13px] font-semibold">Needs attention</h2>
        <span className="font-mono text-[11px] text-muted-foreground tabular-nums">
          {String(items.length)}
        </span>
      </header>

      <ul className="divide-y divide-border/50">
        {shown.map((item) => {
          const Icon = item.icon
          return (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 transition-colors hover:bg-accent/25"
            >
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-lg",
                  TONE_CLASSES[item.tone],
                )}
              >
                <Icon className="size-3.5" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
                  <span className="font-medium">{item.name}</span>
                  <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className={cn("size-1.5 rounded-full", TONE_DOT_CLASSES[item.tone])} />
                    {item.state}
                  </span>
                  {/* Which list it lives on. Without it a domain and a
									    project name are indistinguishable, and the row
									    cannot say where it is sending you. */}
                  <span className="text-[11px] text-muted-foreground/70">· {item.surface}</span>
                </p>
                <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
                  {item.detail}
                </p>
              </div>

              <Button asChild size="sm" variant="outline" className="shrink-0 gap-1.5">
                <Link to={item.to}>
                  {item.actionLabel}
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </li>
          )
        })}
      </ul>

      {(hidden > 0 || expanded) && (
        <button
          type="button"
          onClick={() => {
            setExpanded(!expanded)
          }}
          className="flex w-full items-center justify-center gap-1.5 border-t border-border/60 py-2 text-[12px] text-muted-foreground transition-colors hover:bg-accent/25 hover:text-foreground"
        >
          {expanded ? "Show less" : `Show ${String(hidden)} more`}
          <ChevronDown className={cn("size-3.5 transition-transform", expanded && "rotate-180")} />
        </button>
      )}
    </section>
  )
}
