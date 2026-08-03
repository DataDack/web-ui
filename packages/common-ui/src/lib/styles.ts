import { css, keyframes } from "./emotion"

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
  xl: "@media (min-width: 1280px)",
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
   same whether or not the consumer defines those classes — including the
   radius, which reads --radius-xl (0.625rem in both consoles, since they
   derive it from --radius) and falls back to Tailwind's stock 0.75rem for a
   consumer that ships no radius scale. */

export const glass1 = css`
  background: var(--glass-1-bg, rgb(255 255 255 / 0.55));
  backdrop-filter: blur(16px);
  border: 1px solid var(--border-glass, rgb(0 0 0 / 0.08));
  border-radius: var(--radius-xl, 0.75rem);
`

export const glass2 = css`
  background: var(--glass-2-bg, rgb(255 255 255 / 0.65));
  backdrop-filter: blur(28px);
  border: 1px solid var(--border-glass, rgb(0 0 0 / 0.08));
  border-radius: var(--radius-xl, 0.75rem);
`

/** glass-3: the most opaque tier — overlay cards that must read over content. */
export const glass3 = css`
  background: var(--glass-3-bg, rgb(255 255 255 / 0.78));
  backdrop-filter: blur(32px);
  border: 1px solid var(--border-glass, rgb(0 0 0 / 0.08));
  border-radius: var(--radius-xl, 0.75rem);
`

// tw-animate-css's animate-in / animate-out, reproduced for Radix's data-state
// pattern. Tailwind composed those utilities by writing CSS variables that one
// pair of keyframes reads; the same trick is used here, so a component sets only
// the variables it cares about and the shared keyframes do the rest.
const enterFrames = keyframes`
  from {
    opacity: var(--enter-opacity, 1);
    transform: translate3d(var(--enter-translate-x, 0), var(--enter-translate-y, 0), 0)
      scale3d(var(--enter-scale, 1), var(--enter-scale, 1), 1);
  }
`

const exitFrames = keyframes`
  to {
    opacity: var(--exit-opacity, 1);
    transform: translate3d(var(--exit-translate-x, 0), var(--exit-translate-y, 0), 0)
      scale3d(var(--exit-scale, 1), var(--exit-scale, 1), 1);
  }
`

/**
 * The fade + zoom + directional slide every Radix popper surface used
 * (popover, tooltip, select, dropdown/context menu): fade-in-0, zoom-in-95 and
 * slide-in-from-<side>-2, keyed on data-state and data-side.
 */
export const popperAnimation = css`
  &[data-state="open"] {
    --enter-opacity: 0;
    --enter-scale: 0.95;
    animation: ${enterFrames} 150ms cubic-bezier(0, 0, 0.2, 1);
  }

  &[data-state="closed"] {
    --exit-opacity: 0;
    --exit-scale: 0.95;
    animation: ${exitFrames} 150ms cubic-bezier(0.4, 0, 1, 1);
  }

  /* Slide toward the trigger: a surface on the bottom enters from above it. */
  &[data-side="bottom"] {
    --enter-translate-y: -0.5rem;
  }

  &[data-side="top"] {
    --enter-translate-y: 0.5rem;
  }

  &[data-side="left"] {
    --enter-translate-x: 0.5rem;
  }

  &[data-side="right"] {
    --enter-translate-x: -0.5rem;
  }
`

/** Plain fade for full-screen overlays, which neither zoom nor slide. */
export const overlayAnimation = css`
  &[data-state="open"] {
    --enter-opacity: 0;
    animation: ${enterFrames} 150ms cubic-bezier(0, 0, 0.2, 1);
  }

  &[data-state="closed"] {
    --exit-opacity: 0;
    animation: ${exitFrames} 150ms cubic-bezier(0.4, 0, 1, 1);
  }
`

const accordionDownFrames = keyframes`
  from { height: 0; }
  to { height: var(--radix-accordion-content-height); }
`

const accordionUpFrames = keyframes`
  from { height: var(--radix-accordion-content-height); }
  to { height: 0; }
`

/** Height collapse/expand keyed on Radix's data-state, for accordion content. */
export const accordionAnimation = css`
  &[data-state="open"] {
    animation: ${accordionDownFrames} 200ms ease-out;
  }

  &[data-state="closed"] {
    animation: ${accordionUpFrames} 200ms ease-out;
  }
`

const caretBlinkFrames = keyframes`
  0%, 70%, 100% { opacity: 1; }
  20%, 50% { opacity: 0; }
`

/** The OTP field's fake caret, which blinks on a 1s cycle. */
export const caretBlink = css`
  animation: ${caretBlinkFrames} 1000ms ease-out infinite;
`
