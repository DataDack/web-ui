import type { ReactNode } from 'react'

import type { LucideIcon } from 'lucide-react'

import { cn } from '../lib/cn'

interface PageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  /** Right-aligned action slot (refresh button, primary CTA, ...) */
  actions?: ReactNode
  /** Extra row under the title (status badges, meta chips, ...) */
  meta?: ReactNode
  className?: string
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  actions,
  meta,
  className,
}: Readonly<PageHeaderProps>) {
  return (
    <div className={cn('mb-6', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            {Icon && (
              <div className="glass-1 flex size-9 shrink-0 items-center justify-center rounded-xl">
                <Icon className="text-muted-foreground size-4" />
              </div>
            )}
            <h1 className="truncate text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          </div>
          {description && <p className="text-muted-foreground mt-1.5 text-sm">{description}</p>}
          {meta && <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}
