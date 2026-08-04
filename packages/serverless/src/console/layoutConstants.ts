import { css, media } from "@datadack/common-ui"

/**
 * Both consoles' AppShells reserve this much space above a routed page
 * (topbar + card margin + page padding) before the page's own chrome — back
 * link, header, tab list — even starts. Full-height placeholders anchor to
 * it so the Code and Configuration tabs read as tall panels that reach the
 * bottom of the viewport, the way AWS's own console does, instead of
 * stopping short and leaving dead space below.
 */
export const fullHeightPane = css`
  min-height: calc(100vh - 128px);

  ${media.md} {
    min-height: calc(100vh - 84px);
  }
`
