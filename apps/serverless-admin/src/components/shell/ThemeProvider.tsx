import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const STORAGE_KEY = 'faas.admin.theme'

function systemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function storedTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  // Default to the OS preference so the console honours it before anyone
  // touches the toggle.
  return 'system'
}

export function ThemeProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [theme, setThemeState] = useState<Theme>(storedTheme)
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    theme === 'system' ? systemTheme() : theme,
  )

  const setTheme = (next: Theme) => {
    setThemeState(next)
    localStorage.setItem(STORAGE_KEY, next)
  }

  // Applies the .dark class and tracks OS preference changes while on "system".
  useEffect(() => {
    const root = document.documentElement
    const apply = (resolved: 'light' | 'dark') => {
      setResolvedTheme(resolved)
      root.classList.toggle('dark', resolved === 'dark')
    }

    if (theme === 'system') {
      apply(systemTheme())
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (event: MediaQueryListEvent) => {
        apply(event.matches ? 'dark' : 'light')
      }
      mq.addEventListener('change', handler)
      return () => {
        mq.removeEventListener('change', handler)
      }
    }
    apply(theme)
    return undefined
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}
