import type { ReactNode } from "react"

import { cn } from "@datadack/common-ui"
import type { LucideIcon } from "lucide-react"

interface SurfaceCardProps {
  icon: LucideIcon
  title: string
  /** Omitted while the count is still loading — never rendered as a bare 0. */
  count?: number
  description: string
  children: ReactNode
  /** Buttons and links; laid out as one row at the foot of the card. */
  footer: ReactNode
  className?: string
}

/**
 * One of the two things this section runs, summarised.
 *
 * Both cards are the same shape on purpose: the whole point of merging cPanel
 * hosting into Managed Apps is that a customer's websites are one estate, and
 * two panels with different anatomies would keep them reading as two products
 * that happen to share a page.
 *
 * The footer is pinned to the bottom (`mt-auto`) so the two cards' actions line
 * up even when one has more to say than the other.
 */
export function SurfaceCard({
  icon: Icon,
  title,
  count,
  description,
  children,
  footer,
  className,
}: Readonly<SurfaceCardProps>) {
  return (
    <section
      aria-label={title}
      className={cn(
        "flex h-full flex-col rounded-xl border border-border/60 glass-1-bg p-4",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl glass-1-bg-raised">
          <Icon className="size-4 text-muted-foreground" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="flex items-center gap-2 text-[14px] font-semibold">
            {title}
            {count !== undefined && (
              <span className="rounded-full glass-1-bg-raised px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground tabular-nums">
                {String(count)}
              </span>
            )}
          </h2>
          <p className="mt-0.5 text-[12px] leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>

      <div className="mt-5 min-w-0 flex-1">{children}</div>

      <div className="mt-5 flex flex-wrap items-center gap-2">{footer}</div>
    </section>
  )
}
