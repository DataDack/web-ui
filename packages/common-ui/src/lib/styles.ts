import { css, keyframes } from "@emotion/css"

// Shared emotion building blocks. Every component styles itself through
// @emotion/css at runtime, reading the console theme's bare tokens
// (--muted-foreground, --status-*, --glass-*) so light/dark theming keeps
// working exactly as it did under Tailwind — the .dark class flips the token
// values and every emotion rule follows.

/** Tailwind's default breakpoints, which the consoles' layouts were built on. */
export const media = {
  sm: "@media (min-width: 640px)",
  md: "@media (min-width: 768px)",
  lg: "@media (min-width: 1024px)",
} as const

/** The console's mono stack, with a fallback when the consumer sets no token. */
export const fontMono = "var(--font-mono, 'JetBrains Mono', ui-monospace, monospace)"

/**
 * Tailwind v4's opacity-modifier strategy (`border-status-success/25`),
 * reproduced literally: mix the token with transparency in oklab.
 */
export const mix = (token: string, percent: number) =>
  `color-mix(in oklab, var(${token}) ${String(percent)}%, transparent)`

const contentEnterFrames = keyframes`
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
`

/** Skeleton → data swap. Same recipe the consoles' animate-content-enter uses. */
export const contentEnter = css`
  animation: ${contentEnterFrames} var(--dur-base, 250ms)
    var(--ease-out-expo, cubic-bezier(0.16, 1, 0.3, 1)) both;
`

const pulseFrames = keyframes`
  50% { opacity: 0.5; }
`

export const animatePulse = css`
  animation: ${pulseFrames} 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
`

const spinFrames = keyframes`
  to { transform: rotate(360deg); }
`

export const animateSpin = css`
  animation: ${spinFrames} 1s linear infinite;
`

/* glass-1: subtle (toolbars, stat cards) · glass-2: standard panel.
   Values match the consoles' own .glass-* utilities so the kit renders the
   same whether or not the consumer defines those classes. */

export const glass1 = css`
  background: var(--glass-1-bg, rgb(255 255 255 / 0.55));
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-glass, rgb(0 0 0 / 0.08));
  border-radius: 0.75rem;
`

export const glass2 = css`
  background: var(--glass-2-bg, rgb(255 255 255 / 0.65));
  backdrop-filter: blur(28px);
  border: 1px solid var(--border-glass, rgb(0 0 0 / 0.08));
  border-radius: 0.75rem;
`

/** glass-3: the most opaque tier — overlay cards that must read over content. */
export const glass3 = css`
  background: var(--glass-3-bg, rgb(255 255 255 / 0.78));
  backdrop-filter: blur(32px);
  border: 1px solid var(--border-glass, rgb(0 0 0 / 0.08));
  border-radius: 0.75rem;
`
