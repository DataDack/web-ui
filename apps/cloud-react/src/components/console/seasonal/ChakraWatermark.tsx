import { AshokaChakra } from "./AshokaChakra"

/**
 * Oversized Ashoka Chakra sunk into the bottom-right of the console backdrop
 * for the length of the seasonal window.
 *
 * `-z-10` is the whole trick, and it needs `isolate` on the shell root to work:
 * a negative-z child paints above its stacking context's own background but
 * below every in-flow descendant, which is exactly "in the background". Without
 * the isolate the nearest stacking context is the page root and the wheel would
 * disappear underneath the shell's `bg-background` entirely.
 *
 * Mounted on the console home only — see AppShell. It stays strictly below the
 * cards in paint order, but the console's panels are `.glass-1`/`.glass-2`,
 * which are 97-98% transparent in dark mode, so the wheel is still faintly
 * legible through them. That is accepted: the decoration is meant to sit under
 * the dashboard's own surfaces, and confining it to one route keeps it away
 * from the dense detail pages where it would compete with data.
 */
export function ChakraWatermark() {
  return (
    <div
      aria-hidden="true"
      className="freedom-watermark pointer-events-none fixed right-[-6rem] bottom-[-6rem] -z-10 select-none"
    >
      <AshokaChakra className="freedom-watermark-wheel size-[26rem] md:size-[34rem]" />
    </div>
  )
}
