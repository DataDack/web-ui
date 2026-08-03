/**
 * Ambient flowing-paths backdrop for the dark brand panels. A field of slowly
 * drifting SVG strokes rendered in the current text color — set the parent's
 * text color (e.g. `text-brand-gold`) to tint it.
 *
 * The strokes themselves are STATIC. Only the wrapper moves, via a CSS
 * transform/opacity animation (`.animate-floating-paths`) that the compositor
 * runs off the main thread. Animating per-path `pathLength`/`pathOffset`
 * instead — as this did — writes stroke-dasharray on 60 paths every frame;
 * SVG stroke geometry is not composited, so each write repaints the whole
 * full-bleed layer and dropped the auth panel to ~4fps.
 *
 * Reduced motion is handled globally in index.css, which disables animations.
 *
 * `position` flips the curve direction; render two (1 and -1) for a woven look.
 */
export function FloatingPaths({ position = 1 }: Readonly<{ position?: number }>) {
  const paths = Array.from({ length: 30 }, (_, i) => {
    const a = i * 5 * position
    const b = i * 6
    // Array#join coerces the numeric coordinates to strings without tripping
    // the template-literal / plus-operand lint rules.
    const d = [
      "M-",
      380 - a,
      " -",
      189 + b,
      "C-",
      380 - a,
      " -",
      189 + b,
      " -",
      312 - a,
      " ",
      216 - b,
      " ",
      152 - a,
      " ",
      343 - b,
      "C",
      616 - a,
      " ",
      470 - b,
      " ",
      684 - a,
      " ",
      875 - b,
      " ",
      684 - a,
      " ",
      875 - b,
    ].join("")
    return { id: i, d, width: 0.9 + i * 0.045 }
  })

  // The two layers drift in opposite directions at different speeds so they
  // weave rather than move as one sheet.
  const reverse = position < 0

  return (
    <div
      // Slightly oversized so the drift never exposes an edge.
      className="animate-floating-paths pointer-events-none absolute -inset-[6%]"
      style={{
        animationDirection: reverse ? "alternate-reverse" : "alternate",
        animationDuration: reverse ? "34s" : "26s",
      }}
      aria-hidden
    >
      <svg className="h-full w-full" viewBox="0 0 696 316" fill="none">
        {paths.map((path) => (
          <path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.18 + path.id * 0.02}
          />
        ))}
      </svg>
    </div>
  )
}
