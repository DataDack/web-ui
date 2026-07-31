import { RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ThemeToggle } from '@/components/shell/ThemeToggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface TopbarProps {
  onRefresh: () => void
  refreshing?: boolean
  status?: string
}

export function Topbar({ onRefresh, refreshing = false, status }: Readonly<TopbarProps>) {
  return (
    <header className="sticky top-0 z-40 flex-none border-b border-transparent bg-transparent px-3.5 backdrop-blur-xl">
      <div className="flex h-13 items-center gap-3">
        <Link
          to="/functions"
          className="flex shrink-0 items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <span className="bg-gradient-to-br from-brand-gold to-brand-gold-hover flex size-7 items-center justify-center rounded-lg text-[13px] font-bold text-brand-gold-foreground">
            D
          </span>
          <span className="text-[15px] font-bold tracking-tight whitespace-nowrap">
            Data<span className="text-brand-gold">dack</span>
            <span className="text-muted-foreground ml-1.5 font-normal">Serverless</span>
          </span>
        </Link>

        <div className="mx-0.5 hidden h-5 w-px bg-border md:block" />
        {status && (
          <span className="text-muted-foreground hidden font-mono text-[11px] tracking-wide uppercase md:inline">
            control plane <span className="text-status-success">{status}</span>
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon-sm" onClick={onRefresh} aria-label="Refresh">
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
