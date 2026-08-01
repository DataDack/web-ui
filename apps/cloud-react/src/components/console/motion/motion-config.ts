// Mirrors the CSS motion tokens in src/index.css (--dur-*, --ease-out-expo)
export const DUR = {
    fast: 0.15,
    base: 0.25,
    slow: 0.4,
} as const

export const EASE = {
    out: [0.16, 1, 0.3, 1] as const,
    spring: { type: "spring", stiffness: 380, damping: 32 } as const,
}

// Capped stagger for `animate-content-enter` list/row entrances
export const MAX_STAGGERED_ITEMS = 8
export const ITEM_STAGGER_MS = 30

export function staggerDelay(index: number): { animationDelay: string } {
    return { animationDelay: `${String(Math.min(index, MAX_STAGGERED_ITEMS) * ITEM_STAGGER_MS)}ms` }
}
