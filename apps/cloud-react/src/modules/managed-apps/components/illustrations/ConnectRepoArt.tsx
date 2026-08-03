import { cn } from "@datadack/common-ui"

interface ConnectRepoArtProps {
  className?: string
}

/**
 * A repository being linked to the platform: two nodes and the connection
 * between them, with the link still forming.
 *
 * Used where the account has nothing connected yet, so the illustration is the
 * first thing on screen. It stays line-based and monochrome-plus-one-accent so
 * it reads as part of the console rather than marketing art dropped into it.
 */
export function ConnectRepoArt({ className }: Readonly<ConnectRepoArtProps>) {
  return (
    <svg
      viewBox="0 0 200 100"
      fill="none"
      aria-hidden
      focusable="false"
      className={cn("w-full max-w-[200px]", className)}
    >
      {/* The link, drawn as a soft arc rather than a straight line so the
			    two sides read as being joined rather than merely adjacent. */}
      <path
        d="M74 50c10-18 42-18 52 0"
        stroke="var(--status-info)"
        strokeOpacity="0.5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="3 4"
      />

      {/* GitHub side — the Octocat silhouette, scaled into a rounded tile. */}
      <g>
        <rect
          x="18"
          y="26"
          width="48"
          height="48"
          rx="12"
          fill="var(--foreground)"
          fillOpacity="0.92"
        />
        <g transform="translate(30 38) scale(1.5)" className="text-background">
          <path
            fill="currentColor"
            d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"
          />
        </g>
      </g>

      {/* Platform side — a container waiting to be filled. */}
      <g>
        <rect
          x="134"
          y="26"
          width="48"
          height="48"
          rx="12"
          fill="var(--status-info)"
          fillOpacity="0.08"
          stroke="var(--status-info)"
          strokeOpacity="0.4"
          strokeWidth="1.5"
        />
        <path
          d="M148 50h20M158 40v20"
          stroke="var(--status-info)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </g>
    </svg>
  )
}
