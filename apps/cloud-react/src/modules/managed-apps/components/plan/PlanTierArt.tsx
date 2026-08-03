import { cn } from "@datadack/common-ui"

/**
 * How many bars a tier's glyph shows. Keyed by catalogue code.
 *
 * A Map with a fallback, not a Record indexed directly: these codes arrive from
 * the pricing catalogue in S3, so a tier added there renders here before this
 * file knows about it. Indexing a Record with an unknown key yields undefined
 * and takes the page down — the exact failure this section has hit before.
 */
const TIER_BARS = new Map<string, number>([
  ["starter", 1],
  ["developer_pro", 2],
  ["business", 3],
])

const BAR_HEIGHTS = [6, 11, 16]

interface PlanTierArtProps {
  code: string
  active: boolean
}

/**
 * A small vector mark that reads as "more" at a glance, so the tiers are
 * distinguishable before any of the numbers are read.
 *
 * Inline SVG rather than an icon font or an image: it inherits currentColor,
 * so the selected state needs no second asset, and it costs no request.
 */
export function PlanTierArt({ code, active }: Readonly<PlanTierArtProps>) {
  const bars = TIER_BARS.get(code) ?? 1

  return (
    <span
      className={cn(
        "flex size-9 items-center justify-center rounded-lg border transition-colors",
        active
          ? "border-primary/40 bg-primary/10 text-primary"
          : "border-border/60 bg-muted/40 text-muted-foreground",
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none">
        {BAR_HEIGHTS.map((height, index) => {
          const filled = index < bars
          return (
            <rect
              key={height}
              x={4 + index * 6}
              y={20 - height}
              width={4}
              height={height}
              rx={1.5}
              fill="currentColor"
              // Unfilled bars stay visible but recede, so the glyph reads as
              // a position on a scale rather than as a different icon.
              opacity={filled ? 1 : 0.2}
            />
          )
        })}
      </svg>
    </span>
  )
}
