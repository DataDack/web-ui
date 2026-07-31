import { cn } from '@/lib/utils'

/**
 * Datadack Serverless brand lockup: the official hexagon mark plus the
 * "Data" / gold "Dack" wordmark followed by a bordered uppercase SERVERLESS
 * badge. "Data" inherits the surrounding text colour so the lockup adapts to
 * light, dark and coloured contexts. Single source of truth — use this
 * everywhere rather than an inline placeholder.
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
    <span className={cn('flex items-center gap-2 font-bold tracking-tight', className)}>
      <img
        // Served from public/ — the app's base is /admin/, so Vite rewrites this
        // to /admin/datadack-icon.png at build time.
        src="/admin/datadack-icon.png"
        alt="Datadack Serverless"
        className={cn('size-7 shrink-0 object-contain', iconClassName)}
      />
      {showWordmark && (
        <span className={wordmarkClassName}>
          Data<span className="text-brand-gold">Dack</span>
          <span className="border-brand-gold/50 bg-brand-gold-soft text-brand-gold ml-1.5 inline-block rounded-xs border pt-[3px] pr-px pb-0.5 pl-1 align-middle font-mono text-[0.52em] leading-none font-bold tracking-[0.22em] uppercase">
            Serverless
          </span>
        </span>
      )}
    </span>
  )
}
