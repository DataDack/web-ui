import { Moon, Sun } from 'lucide-react'

import { cn } from '@/lib/utils'

import { useTheme } from './ThemeProvider'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <div
      role="group"
      aria-label="Toggle theme"
      className="border-border-glass bg-surface-glass flex items-center gap-0.5 rounded-full border p-0.5"
    >
      <button
        type="button"
        aria-pressed={isDark}
        aria-label="Dark"
        onClick={() => {
          setTheme('dark')
        }}
        className={cn(
          'flex size-7 items-center justify-center rounded-full transition-colors',
          isDark ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Moon className="size-4" />
      </button>
      <button
        type="button"
        aria-pressed={!isDark}
        aria-label="Light"
        onClick={() => {
          setTheme('light')
        }}
        className={cn(
          'flex size-7 items-center justify-center rounded-full transition-colors',
          !isDark ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <Sun className="size-4" />
      </button>
    </div>
  )
}
