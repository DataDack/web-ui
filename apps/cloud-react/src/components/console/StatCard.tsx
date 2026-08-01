import { Skeleton } from "@datadack/common-ui"
import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { cn } from "@/lib/utils"

import { AnimatedNumber } from "./motion/AnimatedNumber"
import { DUR, EASE } from "./motion/motion-config"
import { Stagger, StaggerItem } from "./motion/Stagger"

export type StatColor = "default" | "success" | "warning" | "danger" | "info"

const VALUE_CLASSES: Record<StatColor, string> = {
  default: "text-foreground",
  success: "text-status-success",
  warning: "text-status-warning",
  danger: "text-status-danger",
  info: "text-status-info",
}

export interface StatCardProps {
  label: string
  value: number
  format?: (value: number) => string
  icon?: LucideIcon
  color?: StatColor
  trend?: { value: string; direction: "up" | "down" }
  loading?: boolean
  className?: string
}

export function StatCard({
  label,
  value,
  format,
  icon: Icon,
  color = "default",
  trend,
  loading = false,
  className,
}: Readonly<StatCardProps>) {
  return (
    <div className={cn("glass-1 px-4 py-4", className)}>
      <AnimatePresence mode="wait" initial={false}>
        {loading ? (
          <motion.div key="skeleton" exit={{ opacity: 0 }} transition={{ duration: DUR.fast }}>
            {/* Mirrors the loaded layout (h-8 value line, h-4 label line) */}
            <Skeleton className="h-8 w-16 mb-1" />
            <Skeleton className="h-4 w-24" />
          </motion.div>
        ) : (
          <motion.div
            key="value"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: DUR.base, ease: EASE.out }}
          >
            <div className="flex items-center justify-between">
              <AnimatedNumber
                value={value}
                format={format}
                className={cn(
                  "text-2xl font-bold tracking-tight tabular-nums",
                  VALUE_CLASSES[color],
                )}
              />
              {Icon && <Icon className="size-4 text-muted-foreground/70" />}
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <span className="text-[13px] text-muted-foreground truncate">{label}</span>
              {trend && (
                <span
                  className={cn(
                    "flex items-center gap-1 font-mono text-[11px]",
                    trend.direction === "up" ? "text-status-success" : "text-status-danger",
                  )}
                >
                  {trend.direction === "up" ? (
                    <TrendingUp className="size-3" />
                  ) : (
                    <TrendingDown className="size-3" />
                  )}
                  {trend.value}
                </span>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface StatGridProps {
  stats: StatCardProps[]
  className?: string
}

export function StatGrid({ stats, className }: Readonly<StatGridProps>) {
  return (
    <Stagger className={cn("grid grid-cols-2 lg:grid-cols-4 gap-3", className)} stagger={0.05}>
      {stats.map((stat) => (
        <StaggerItem key={stat.label}>
          <StatCard {...stat} />
        </StaggerItem>
      ))}
    </Stagger>
  )
}
