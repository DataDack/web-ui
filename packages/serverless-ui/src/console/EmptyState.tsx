import type { LucideIcon } from 'lucide-react'

import { cn } from '../lib/cn'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  className,
}: Readonly<EmptyStateProps>) {
  return (
    <div
      className={cn(
        'animate-content-enter flex flex-col items-center justify-center px-6 py-14 text-center',
        className,
      )}
    >
      <div className="glass-1 mb-4 flex size-12 items-center justify-center rounded-xl">
        <Icon className="text-muted-foreground size-5" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {description && (
        <p className="text-muted-foreground mt-1 max-w-sm text-[13px]">{description}</p>
      )}
    </div>
  )
}
