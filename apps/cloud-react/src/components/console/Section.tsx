import type { ComponentType, ReactNode } from "react"

import { cn } from "@datadack/common-ui"

/**
 * Tones a section's icon tile can carry.
 *
 * Every value maps onto a status token the palette already defines, so a tile
 * can never introduce a colour that exists nowhere else in the console. The
 * tone says what KIND of section it is — routine, sourced, billed, dangerous —
 * which is the distinction a stack of identical panels cannot make.
 */
export type SectionTone = "neutral" | "info" | "accent" | "brand" | "warning" | "danger"

const TONE_CLASS: Record<SectionTone, string> = {
  neutral: "glass-1-bg-raised text-muted-foreground ring-1 ring-border/60",
  info: "bg-status-info-bg text-status-info",
  accent: "bg-status-success-bg text-status-success",
  brand: "bg-brand-gold-soft text-brand-gold-ink",
  warning: "bg-status-warning-bg text-status-warning",
  danger: "bg-status-danger-bg text-status-danger",
}

interface SectionProps {
  title?: string
  description?: string
  /**
   * The section's mark. Typed as a plain component rather than `LucideIcon`
   * because the right glyph is not always lucide's: a section about GitHub
   * shows the Octocat, and one about a framework shows that framework's own
   * logo from react-icons. Both satisfy this signature; a lucide icon still
   * passes unchanged.
   */
  icon?: ComponentType<{ className?: string }>
  tone?: SectionTone
  /** Sits beside the title — a count, a state pill. Not an action. */
  badge?: ReactNode
  actions?: ReactNode
  children: ReactNode
  variant?: "plain" | "panel"
  className?: string
}

export function Section({
  title,
  description,
  icon: Icon,
  tone = "neutral",
  badge,
  actions,
  children,
  variant = "plain",
  className,
}: Readonly<SectionProps>) {
  const hasHeader = Boolean(title ?? actions ?? Icon)

  return (
    <section className={cn(variant === "panel" && "glass-2 p-5", className)}>
      {hasHeader && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-3">
            {Icon && (
              <span
                aria-hidden
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-lg",
                  TONE_CLASS[tone],
                )}
              >
                <Icon className="size-4" />
              </span>
            )}
            <div className="min-w-0">
              {title && (
                <h2 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                  {title}
                  {badge}
                </h2>
              )}
              {description && (
                <p className="mt-0.5 text-[13px] text-muted-foreground">{description}</p>
              )}
            </div>
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  )
}
