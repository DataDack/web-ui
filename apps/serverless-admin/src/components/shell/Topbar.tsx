import { RefreshCw } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ConnectionSettings } from '@/components/shell/ConnectionSettings'
import { Logo } from '@/components/shell/Logo'
import { ScopeSwitcher } from '@/components/shell/ScopeSwitcher'
import { ThemeToggle } from '@/components/shell/ThemeToggle'
import { cn } from '@/lib/utils'

import { Button } from '@datadack/serverless-ui'

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
          className="focus-visible:ring-ring/50 shrink-0 rounded-md outline-none focus-visible:ring-2"
        >
          <Logo
            iconClassName="size-6"
            className="text-[15px]"
            wordmarkClassName="whitespace-nowrap"
          />
        </Link>

        <div className="bg-border mx-0.5 hidden h-5 w-px md:block" />
        {status && (
          <span className="text-muted-foreground hidden font-mono text-[11px] tracking-wide uppercase md:inline">
            control plane <span className="text-status-success">{status}</span>
          </span>
        )}

        <div className="ml-auto flex items-center gap-2">
          <ScopeSwitcher />
          <div className="bg-border mx-0.5 hidden h-5 w-px lg:block" />
          <Button variant="ghost" size="icon-sm" onClick={onRefresh} aria-label="Refresh">
            <RefreshCw className={cn('size-4', refreshing && 'animate-spin')} />
          </Button>
          <ConnectionSettings />
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}
