import { motion, useReducedMotion } from "motion/react"

/**
 * Ambient flowing-paths backdrop for the dark brand panels. A field of slowly
 * drifting SVG strokes rendered in the current text color — set the parent's
 * text color (e.g. `text-brand-gold`) to tint it. Honors prefers-reduced-motion:
 * when reduced, the paths render static (no drift) so the panel stays calm.
 *
 * `position` flips the curve direction; render two (1 and -1) for a woven look.
 */
export function FloatingPaths({ position = 1 }: Readonly<{ position?: number }>) {
    const reduce = useReducedMotion()

    const paths = Array.from({ length: 30 }, (_, i) => {
        const a = i * 5 * position
        const b = i * 6
        // Array#join coerces the numeric coordinates to strings without tripping
        // the template-literal / plus-operand lint rules.
        const d = [
            "M-", 380 - a, " -", 189 + b,
            "C-", 380 - a, " -", 189 + b,
            " -", 312 - a, " ", 216 - b, " ", 152 - a, " ", 343 - b,
            "C", 616 - a, " ", 470 - b, " ", 684 - a, " ", 875 - b, " ", 684 - a, " ", 875 - b,
        ].join("")
        return {
            id: i,
            d,
            width: 0.9 + i * 0.045,
            // Deterministic per-index drift so renders stay stable (no Math.random).
            duration: 18 + (i % 12),
        }
    })

    return (
        <div className="pointer-events-none absolute inset-0" aria-hidden>
            <svg className="h-full w-full" viewBox="0 0 696 316" fill="none">
                {paths.map((path) => (
                    <motion.path
                        key={path.id}
                        d={path.d}
                        stroke="currentColor"
                        strokeWidth={path.width}
                        strokeOpacity={0.18 + path.id * 0.02}
                        initial={{ pathLength: 0.3, opacity: 0.6 }}
                        animate={
                            reduce
                                ? { pathLength: 1, opacity: 0.6 }
                                : {
                                      pathLength: 1,
                                      opacity: [0.4, 0.8, 0.4],
                                      pathOffset: [0, 1, 0],
                                  }
                        }
                        transition={
                            reduce
                                ? undefined
                                : {
                                      duration: path.duration,
                                      repeat: Number.POSITIVE_INFINITY,
                                      ease: "linear",
                                  }
                        }
                    />
                ))}
            </svg>
        </div>
    )
}
