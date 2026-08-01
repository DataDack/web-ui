import { Skeleton } from "@DataDack/common-ui"
import { ChevronRight, type LucideIcon } from "lucide-react"
import { Link } from "react-router-dom"

import { AnimatedNumber } from "@/components/console/motion/AnimatedNumber"

export interface ResourceMixItem {
  icon: LucideIcon
  label: string
  count: number
  to: string
}

interface ResourceMixListProps {
  items: ResourceMixItem[]
  isLoading: boolean
}

/**
 * Compute-resource roll-up: each line is a count that deep-links into its
 * service list, so the overview doubles as a jump-off point across the compute
 * surface (instances, disks, load balancers, autoscaling).
 */
export function ResourceMixList({ items, isLoading }: Readonly<ResourceMixListProps>) {
  return (
    <ul className="flex flex-col">
      {items.map(({ icon: Icon, label, count, to }) => (
        <li key={to}>
          <Link
            to={to}
            className="group flex items-center gap-3 rounded-lg px-2 py-2.5 outline-none transition-colors hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg glass-1">
              <Icon className="size-4 text-muted-foreground" />
            </span>
            <span className="flex-1 truncate text-[13px] font-medium text-foreground">{label}</span>
            {isLoading ? (
              <Skeleton className="h-5 w-8" />
            ) : (
              <AnimatedNumber
                value={count}
                className="font-mono text-[15px] font-semibold tabular-nums text-foreground"
              />
            )}
            <ChevronRight className="size-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
