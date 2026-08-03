import type { LucideIcon } from "lucide-react"

import { cn, StatCard as KitStatCard, type StatColor, statGridClass } from "@datadack/common-ui"

import { AnimatedNumber } from "./motion/AnimatedNumber"
import { Stagger, StaggerItem } from "./motion/Stagger"

export type { StatColor }

/**
 * The console's stat tile: the design system's card, with this app's count-up.
 *
 * The card itself — glass surface, value typography, status colour, skeleton —
 * lives in @datadack/common-ui. Only the animation stays here, because it is
 * built on `motion`, and @datadack/serverless bundles the kit with `noExternal`
 * — so a `motion` import inside the kit would ship inside that package too.
 * The kit takes `value` as a node precisely so this file can hand it a counter.
 */
export interface StatCardProps {
  label: string
  value: number
  format?: (value: number) => string
  icon?: LucideIcon
  color?: StatColor
  loading?: boolean
  className?: string
}

export function StatCard({ value, format, ...props }: Readonly<StatCardProps>) {
  return <KitStatCard {...props} value={<AnimatedNumber value={value} format={format} />} />
}

interface StatGridProps {
  stats: StatCardProps[]
  className?: string
}

/**
 * Takes an array rather than children so the stagger can wrap each tile without
 * every call site repeating the wrapper. Lays out on the kit's own grid class,
 * so the columns cannot drift from `StatGrid` in the serverless console.
 */
export function StatGrid({ stats, className }: Readonly<StatGridProps>) {
  return (
    <Stagger className={cn(statGridClass, className)} stagger={0.05}>
      {stats.map((stat) => (
        <StaggerItem key={stat.label}>
          <StatCard {...stat} />
        </StaggerItem>
      ))}
    </Stagger>
  )
}
