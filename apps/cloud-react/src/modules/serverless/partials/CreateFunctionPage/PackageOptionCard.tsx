import type { ReactNode } from "react"

import { Check } from "lucide-react"

import { cn } from "@/lib/utils"

interface PackageOptionCardProps {
  icon: ReactNode
  title: string
  subtitle: string
  bullets: string[]
  selected: boolean
  onSelect: () => void
}

/**
 * One answer to "where does this function's code come from?".
 *
 * The whole card is the control — there is no separate radio to hit, so no dead
 * zone between reading an option and choosing it. Selection is carried by the
 * border, a tinted surface AND a check mark rather than color alone, so it
 * survives a colorblind reader and a low-contrast display.
 *
 * All three render identically apart from content; none is styled as the
 * "right" answer, because which one is right depends entirely on what the user
 * already has built.
 */
export function PackageOptionCard({
  icon,
  title,
  subtitle,
  bullets,
  selected,
  onSelect,
}: Readonly<PackageOptionCardProps>) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "glass-1 group relative flex flex-col gap-3 rounded-xl border p-4 text-left",
        "transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        selected
          ? "border-brand-gold/60 bg-brand-gold-soft"
          : "border-border/60 hover:border-brand-gold/40",
      )}
    >
      {selected && (
        <span
          aria-hidden
          className="bg-brand-gold text-brand-gold-foreground absolute top-3 right-3 flex size-5 items-center justify-center rounded-full"
        >
          <Check className="size-3" strokeWidth={3} />
        </span>
      )}

      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-lg border transition-colors",
          selected
            ? "border-brand-gold/40 text-brand-gold bg-brand-gold/10"
            : "border-border/60 bg-muted/40 text-muted-foreground group-hover:text-foreground",
        )}
      >
        {icon}
      </span>

      <span className="space-y-0.5">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="text-muted-foreground block text-[12px]">{subtitle}</span>
      </span>

      <ul className="text-muted-foreground space-y-1 text-[12px]">
        {bullets.map((bullet) => (
          <li key={bullet} className="flex gap-1.5">
            <span aria-hidden className={selected ? "text-brand-gold" : "text-muted-foreground/60"}>
              •
            </span>
            {bullet}
          </li>
        ))}
      </ul>
    </button>
  )
}
