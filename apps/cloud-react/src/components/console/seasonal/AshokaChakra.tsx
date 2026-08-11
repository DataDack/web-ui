import { cn } from "@datadack/common-ui"

/** 24 spokes, the way the wheel on the flag has them. */
const SPOKES = Array.from({ length: 24 }, (_, i) => i * 15)

/**
 * The Ashoka Chakra, drawn rather than shipped as an image so it inherits
 * `currentColor` and stays crisp at the 14–16px the banner renders it at.
 *
 * Purely decorative — `aria-hidden`, and the surrounding banner carries the
 * text that actually says what this is.
 */
export function AshokaChakra({ className }: Readonly<{ className?: string }>) {
  return (
    <svg
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      className={cn("shrink-0", className)}
    >
      <g fill="none" stroke="currentColor" strokeWidth={1.6}>
        <circle cx="24" cy="24" r="21" />
        {SPOKES.map((deg) => (
          <line
            key={deg}
            x1="24"
            y1="24"
            x2="24"
            y2="3"
            transform={`rotate(${String(deg)} 24 24)`}
          />
        ))}
      </g>
      <circle cx="24" cy="24" r="3.4" fill="currentColor" />
    </svg>
  )
}
