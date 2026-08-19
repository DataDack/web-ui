import type { ReactNode } from "react"

import { ArrowRight } from "lucide-react"

import { cn } from "@datadack/common-ui"

interface SourceOptionCardProps {
  icon: ReactNode
  title: string
  subtitle: string
  bullets: string[]
  /** Small truth-teller in the corner: what picking this card gets you today. */
  availability: { label: string; tone: "available" | "new" }
  cta: string
  onSelect: () => void
}

/**
 * One answer to "where is your app coming from?".
 *
 * The whole card is the button — the CTA at the bottom is a visual affordance,
 * not a separate target, so there is no dead zone between reading the card and
 * choosing it. Both cards render identically apart from content; neither is
 * styled as the "right" answer.
 */
export function SourceOptionCard({
  icon,
  title,
  subtitle,
  bullets,
  availability,
  cta,
  onSelect,
}: Readonly<SourceOptionCardProps>) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex min-h-full flex-col gap-3 overflow-hidden rounded-xl border border-border/60 glass-1-bg p-4 text-left shadow-xs",
        "motion-safe:transition-[transform,box-shadow,border-color,background-color] motion-safe:duration-150 motion-safe:ease-out",
        "hover:border-primary/40 hover:glass-1-bg-raised hover:shadow-md motion-safe:hover:-translate-y-0.5 motion-safe:active:translate-y-0 motion-safe:active:scale-[0.96]",
        "focus-visible:border-primary/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
      )}
    >
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-primary motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:group-hover:scale-x-100 motion-safe:group-focus-visible:scale-x-100"
      />

      <span
        className={cn(
          "absolute top-3 right-3 rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
          availability.tone === "available"
            ? "border-status-success/15 bg-status-success/10 text-status-success"
            : "border-status-warning/15 bg-status-warning/10 text-status-warning",
        )}
      >
        {availability.label}
      </span>

      <span className="flex size-9 items-center justify-center rounded-lg border border-border/60 glass-1-bg-raised text-muted-foreground motion-safe:transition-[border-color,background-color,color] motion-safe:duration-150 group-hover:border-primary/30 group-hover:bg-primary/10 group-hover:text-primary">
        {icon}
      </span>

      <span className="space-y-0.5">
        <span className="block text-[14px] font-semibold">{title}</span>
        <span className="block text-[12px] text-muted-foreground">{subtitle}</span>
      </span>

      <ul className="space-y-1 text-[12px] text-muted-foreground">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2">
            <span
              aria-hidden
              className="mt-[0.45rem] size-1 shrink-0 rounded-full bg-muted-foreground/40 motion-safe:transition-colors motion-safe:duration-150 group-hover:bg-primary/70"
            />
            {bullet}
          </li>
        ))}
      </ul>

      <span className="mt-auto flex items-center justify-between border-t border-border/50 pt-3 text-[12px] font-semibold text-brand-gold-ink">
        {cta}
        <span className="flex size-6 items-center justify-center rounded-full bg-brand-gold-soft text-brand-gold-ink motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out motion-safe:group-hover:translate-x-0.5">
          <ArrowRight className="size-3.5" />
        </span>
      </span>
    </button>
  )
}
