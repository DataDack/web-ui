import type { LucideIcon } from 'lucide-react'

import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

export type StatColor = 'default' | 'success' | 'warning' | 'danger' | 'info'

const VALUE_CLASSES: Record<StatColor, string> = {
  default: 'text-foreground',
  success: 'text-status-success',
  warning: 'text-status-warning',
  danger: 'text-status-danger',
  info: 'text-status-info',
}

export interface StatCardProps {
  label: string
  value: number | string
  icon?: LucideIcon
  color?: StatColor
  loading?: boolean
  className?: string
}

export function StatCard({
  label,
  value,
  icon: Icon,
  color = 'default',
  loading = false,
  className,
}: Readonly<StatCardProps>) {
  return (
    <div className={cn('glass-1 px-4 py-4', className)}>
      {loading ? (
        // Mirrors the loaded layout (h-8 value line, h-4 label line).
        <>
          <Skeleton className="mb-1 h-8 w-16" />
          <Skeleton className="h-4 w-24" />
        </>
      ) : (
        <div className="animate-content-enter">
          <div className="flex items-center justify-between">
            <span
              className={cn('text-2xl font-bold tracking-tight tabular-nums', VALUE_CLASSES[color])}
            >
              {value}
            </span>
            {Icon && <Icon className="text-muted-foreground/70 size-4" />}
          </div>
          <span className="text-muted-foreground mt-1 block truncate text-[13px]">{label}</span>
        </div>
      )}
    </div>
  )
}

export function StatGrid({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn('grid grid-cols-2 gap-3 lg:grid-cols-4', className)}>{children}</div>
}
