import { cn } from "@/lib/utils"

interface DeployPipelineArtProps {
  className?: string
}

/**
 * The product in one picture: a repository, a build, a live address.
 *
 * Drawn with `currentColor` and the status tokens so it inherits the theme
 * rather than shipping two PNGs. Strokes are deliberately thin and geometric to
 * match the console's glass-and-hairline surfaces — an illustration heavier
 * than the UI around it reads as a sticker.
 */
export function DeployPipelineArt({ className }: Readonly<DeployPipelineArtProps>) {
  return (
    <svg
      viewBox="0 0 260 120"
      fill="none"
      aria-hidden
      focusable="false"
      className={cn("w-full max-w-[260px]", className)}
    >
      <defs>
        <linearGradient id="dd-pipe" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--status-info)" stopOpacity="0.15" />
          <stop offset="50%" stopColor="var(--status-info)" stopOpacity="0.55" />
          <stop offset="100%" stopColor="var(--status-success)" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      {/* The path between the three stages. */}
      <path
        d="M64 60h56M140 60h56"
        stroke="url(#dd-pipe)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="4 5"
      />

      {/* Repository — a source file with its lines of code. */}
      <g className="text-muted-foreground">
        <rect
          x="8"
          y="30"
          width="56"
          height="60"
          rx="8"
          fill="var(--card)"
          stroke="currentColor"
          strokeOpacity="0.35"
          strokeWidth="1.5"
        />
        <path
          d="M20 46h32M20 56h24M20 66h28M20 76h18"
          stroke="currentColor"
          strokeOpacity="0.45"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* Build — a hexagonal unit mid-pipeline, tinted with the in-flight tone. */}
      <g>
        <path
          d="M130 26l22 13v26l-22 13-22-13V39z"
          fill="var(--status-info)"
          fillOpacity="0.08"
          stroke="var(--status-info)"
          strokeOpacity="0.5"
          strokeWidth="1.5"
        />
        <path
          d="M122 60l6 6 12-13"
          stroke="var(--status-info)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>

      {/* Live — a globe, the only element that earns the success colour. */}
      <g>
        <circle
          cx="224"
          cy="60"
          r="28"
          fill="var(--status-success)"
          fillOpacity="0.07"
          stroke="var(--status-success)"
          strokeOpacity="0.45"
          strokeWidth="1.5"
        />
        <path
          d="M196 60h56M224 32c8 8 8 48 0 56M224 32c-8 8-8 48 0 56"
          stroke="var(--status-success)"
          strokeOpacity="0.5"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}
