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
        "glass-1 group relative flex flex-col gap-4 rounded-xl border border-border/60 p-6 text-left",
        // Motion is on transform and shadow, not on layout: the card lifts in
        // place rather than reflowing the row beside it.
        "transition-all duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-status-info/60 hover:bg-status-info/[0.04] hover:shadow-lg hover:shadow-status-info/5",
        "active:translate-y-0 active:shadow-md",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        // A pointer-driven lift is noise to anyone who asked for less motion;
        // the colour and shadow still answer "this is hoverable".
        "motion-reduce:transform-none motion-reduce:transition-colors",
      )}
    >
      <span
        className={cn(
          "absolute top-4 right-4 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase",
          availability.tone === "available"
            ? "bg-status-success/10 text-status-success"
            : "bg-status-warning/10 text-status-warning",
        )}
      >
        {availability.label}
      </span>

      <span
        className={cn(
          "flex size-11 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-foreground",
          "transition-colors duration-200 group-hover:border-status-info/40 group-hover:bg-status-info/10 group-hover:text-status-info",
        )}
      >
        {icon}
      </span>

      <span className="space-y-0.5">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-[12px] text-muted-foreground">{subtitle}</span>
      </span>

      <ul className="space-y-1.5 text-[13px] text-muted-foreground">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex gap-2">
            <span aria-hidden className="text-status-info">
              •
            </span>
            {bullet}
          </li>
        ))}
      </ul>

      {/* The arrow is a separate span so it can travel without dragging the
          label's underline across the gap with it. */}
      <span className="mt-auto inline-flex items-center gap-1.5 pt-1 text-[13px] font-medium text-status-info">
        <span className="underline-offset-4 group-hover:underline">{cta}</span>
        <ArrowRight
          className="size-3.5 transition-transform duration-200 ease-out group-hover:translate-x-1 motion-reduce:transform-none"
          aria-hidden
        />
      </span>
    </button>
  )
}
