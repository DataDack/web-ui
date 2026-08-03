import { cn } from "@datadack/common-ui"

/**
 * DataDack Cloud brand lockup: the official hexagon mark + the "Data" / gold
 * "Dack" wordmark followed by a bordered uppercase CLOUD badge. "Data"
 * inherits the surrounding text color so it adapts to dark, light, and
 * colored (brand-panel) contexts. Single source of truth — use this
 * everywhere instead of inline placeholders.
 */
export function Logo({
  className,
  iconClassName,
  wordmarkClassName,
  showWordmark = true,
}: Readonly<{
  className?: string
  iconClassName?: string
  wordmarkClassName?: string
  showWordmark?: boolean
}>) {
  return (
    <span className={cn("flex items-center gap-2 font-bold tracking-tight", className)}>
      <img
        src="/datadack-icon.png"
        alt="DataDack Cloud"
        className={cn("size-7 shrink-0 object-contain", iconClassName)}
      />
      {showWordmark && (
        <span className={wordmarkClassName}>
          Data<span className="text-brand-gold">Dack</span>
          <span className="ml-1.5 inline-block rounded-xs border border-brand-gold/50 bg-brand-gold-soft pt-[3px] pr-px pb-0.5 pl-1 align-middle font-mono text-[0.52em] leading-none font-bold tracking-[0.22em] text-brand-gold uppercase">
            Cloud
          </span>
        </span>
      )}
    </span>
  )
}
