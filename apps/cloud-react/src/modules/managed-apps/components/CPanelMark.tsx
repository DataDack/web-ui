import { cn } from "@datadack/common-ui"

interface CPanelMarkProps {
  className?: string
}

/**
 * A control-panel mark for the shared-hosting source.
 *
 * Drawn rather than borrowed. cPanel's own logo is a registered trademark of
 * cPanel L.L.C., and reproducing it here would claim an affiliation we do not
 * have — the product being sold is our hosting, which happens to be
 * administered through cPanel. So this is a generic stacked-server glyph in the
 * same visual register as GitHubMark: geometric, single-weight, no wordmark.
 *
 * Inline SVG on `currentColor` for the same reasons GitHubMark is: it inherits
 * the surrounding text colour, so it works in both themes without a second
 * asset, and it costs no request. Strokes are drawn on the 24-unit grid lucide
 * uses so it sits at the same optical weight as the icons beside it.
 */
export function CPanelMark({ className }: Readonly<CPanelMarkProps>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className={cn("size-4", className)}
    >
      {/* Two stacked server bays — the shared-hosting shape. */}
      <rect x="2.75" y="3.75" width="18.5" height="7" rx="1.75" />
      <rect x="2.75" y="13.25" width="18.5" height="7" rx="1.75" />
      {/* Status lamps, echoing the health chips used across the fleet views. */}
      <circle cx="6.5" cy="7.25" r="1" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="16.75" r="1" fill="currentColor" stroke="none" />
      {/* Drive activity ticks. */}
      <path d="M17.75 7.25h1.25M14.25 7.25h1.25M17.75 16.75h1.25M14.25 16.75h1.25" />
    </svg>
  )
}
