import { Moon, Sun } from "lucide-react"

import { useTheme } from "./ThemeProvider"
import { css, cx } from "../lib/emotion"

const group = css`
  display: flex;
  align-items: center;
  gap: 2px;
  border-radius: 9999px;
  border: 1px solid var(--border-glass);
  background: var(--surface-glass);
  padding: 2px;
`

const button = css`
  display: flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
  color: var(--muted-foreground);
  transition: color 150ms cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    color: var(--foreground);
  }

  & svg {
    width: 16px;
    height: 16px;
  }
`

const buttonActive = css`
  background: var(--muted);
  color: var(--foreground);
`

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === "dark"

  return (
    <div role="group" aria-label="Toggle theme" className={group}>
      <button
        type="button"
        aria-pressed={isDark}
        aria-label="Dark"
        onClick={() => {
          setTheme("dark")
        }}
        className={cx(button, isDark && buttonActive)}
      >
        <Moon />
      </button>
      <button
        type="button"
        aria-pressed={!isDark}
        aria-label="Light"
        onClick={() => {
          setTheme("light")
        }}
        className={cx(button, !isDark && buttonActive)}
      >
        <Sun />
      </button>
    </div>
  )
}
