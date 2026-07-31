import {
  Activity,
  Layers,
  ScrollText,
  Server,
  ShieldCheck,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

import { cn } from '@/lib/utils'

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: 'Compute',
    items: [
      { to: '/functions', label: 'Functions', icon: Zap },
      { to: '/workers', label: 'Workers', icon: Server },
    ],
  },
  {
    label: 'Artifacts',
    items: [{ to: '/layers', label: 'Layers', icon: Layers }],
  },
  {
    label: 'Observability',
    items: [
      { to: '/metrics', label: 'Metrics', icon: Activity },
      { to: '/logs', label: 'Logs', icon: ScrollText },
      { to: '/audit', label: 'Audit', icon: ShieldCheck },
    ],
  },
]

export function Sidebar() {
  return (
    <aside className="sticky top-13 hidden h-[calc(100vh-52px)] w-56 shrink-0 flex-col bg-transparent lg:flex">
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {NAV_GROUPS.map((group, index) => (
          <div key={group.label} className={cn(index > 0 && 'mt-4')}>
            <div className="text-muted-foreground/80 mb-1.5 px-2 font-mono text-[10px] font-medium tracking-[0.15em] uppercase">
              {group.label}
            </div>
            <ul className="flex flex-col gap-0.5">
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors',
                        isActive
                          ? 'bg-accent/50 text-foreground font-medium'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/30',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Gold rail marks the active route. */}
                        {isActive && (
                          <span className="bg-brand-gold absolute inset-y-1.5 left-0 w-[3px] rounded-full" />
                        )}
                        <item.icon className="size-4 shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  )
}
