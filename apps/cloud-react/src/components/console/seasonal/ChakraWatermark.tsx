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
 * A consequence worth knowing: `bg-card` is opaque, so on routes that render
 * the content panel the wheel is covered and only reads on the console home
 * and behind the translucent chrome. That is the trade for never having a
 * decoration float over a data table.
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
