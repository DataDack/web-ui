import createEmotion from "@emotion/css/create-instance"

/**
 * The design system's emotion instance, and the only one this package uses.
 *
 * Two options here carry the whole cascade contract with consuming apps, and
 * both are load-bearing.
 *
 * Components merge a caller's `className` with `cx()`. Unlike the `cn()` this
 * package used before, `cx()` does not run tailwind-merge, so it cannot delete a
 * conflicting base class — a caller's `<DialogContent className="sm:max-w-md" />`
 * only takes effect if it beats the component's own rule on the cascade. It does
 * not by default: both are single-class selectors, so they tie on specificity,
 * and emotion injects at runtime into the end of <head>, which means the
 * component wins on source order and the override is silently dropped.
 *
 * Source order alone cannot fix it either. Tailwind v4 emits its utilities
 * inside `@layer utilities`, and *any* unlayered rule beats *any* layered one no
 * matter where it sits in the document. So the design system has to be layered
 * too, in a layer that sorts before Tailwind's:
 *
 *   - `css` wraps every rule in `@layer datadack-ui` (below), and
 *   - `prepend` puts our <style> at the top of <head>, so `datadack-ui` is the
 *     first layer name the browser sees and therefore sorts before `theme`,
 *     `base`, `components` and `utilities`.
 *
 * The resulting precedence, lowest to highest, is what a design system wants:
 * our base styles, then the app's Tailwind utilities, then the app's own
 * unlayered CSS (`.glass-3`, `.btn-gold`). Consumers override us by default and
 * never need `!important`.
 *
 * tests/cascade.test.ts pins all of this down; drop either option and it fails.
 */
const instance = createEmotion({
  key: "ddui",
  prepend: true,
  // Emotion's own convention, made explicit because bun resolves the
  // non-development build and would otherwise pick speedy everywhere. Speedy
  // inserts through CSSOM `insertRule`, which is faster but leaves the <style>
  // tag empty — unreadable in devtools and untestable. Production keeps it; dev
  // and test get real, inspectable CSS text.
  speedy: process.env.NODE_ENV === "production",
})

/** The cascade layer every rule in this package is emitted into. */
export const LAYER = "datadack-ui"

type CssArgs = Parameters<typeof instance.css>

function isTemplate(value: unknown): value is TemplateStringsArray {
  // A tagged template's strings array is the only array carrying `raw`.
  return Array.isArray(value) && Object.hasOwn(value, "raw")
}

/**
 * Re-wrap a tagged template's static chunks so the rule body lands inside the
 * layer, leaving the interpolation slots — and so any interpolated values —
 * untouched.
 */
function wrapInLayer(strings: TemplateStringsArray): TemplateStringsArray {
  const chunks = [...strings]
  const last = chunks.length - 1
  chunks[0] = `@layer ${LAYER}{${chunks[0]}`
  chunks[last] = `${chunks[last]}}`
  ;(chunks as unknown as { raw: readonly string[] }).raw = chunks
  return chunks as unknown as TemplateStringsArray
}

/**
 * `css`, but layered. Same signature and return value as @emotion/css's: takes a
 * tagged template or style objects, returns a generated class name.
 */
export function css(...args: CssArgs): string {
  const [first, ...rest] = args
  if (isTemplate(first)) return instance.css(wrapInLayer(first), ...rest)
  // Object and string forms nest under the layer key instead. Multiple
  // arguments pass through as an array, which emotion flattens.
  return instance.css({ [`@layer ${LAYER}`]: args as never })
}

// keyframes are deliberately NOT layered: @keyframes carries no selector and so
// takes no part in the cascade, and animation names stay globally resolvable
// either way. Wrapping them buys nothing and risks surprising a browser.
//
// injectGlobal is likewise left alone — lib/tokens.ts wraps its selectors in
// :where(), which zeroes their specificity, so a consumer's own token
// definitions already win without a layer.
/* eslint-disable @typescript-eslint/unbound-method -- emotion returns standalone
   closures bound at creation, not prototype methods; destructuring them is the
   documented way to use an instance. */
export const { cache, cx, injectGlobal, keyframes, merge, getRegisteredStyles, flush, sheet } =
  instance
/* eslint-enable @typescript-eslint/unbound-method */
