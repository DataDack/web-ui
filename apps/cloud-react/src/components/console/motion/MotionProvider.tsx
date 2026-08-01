import type { ReactNode } from "react"

import { MotionConfig } from "motion/react"

// Single enforcement point for prefers-reduced-motion across all JS-driven
// animation. CSS keyframes are handled by the media query in index.css.
export function MotionProvider({ children }: Readonly<{ children: ReactNode }>) {
    return <MotionConfig reducedMotion="user">{children}</MotionConfig>
}
